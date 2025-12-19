// ============================================
// POS Module - Cash Logic + Reference Tracking
// File: frontend/js/pos.js
// ============================================

(function () {
  'use strict';

  let currentUser = null;
  let cart = [];
  let availableProducts = [];
  let allPatients = [];
  let selectedPatient = null;
  const currencyFormatter = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  // -----------------------------
  // INIT
  // -----------------------------
  document.addEventListener('DOMContentLoaded', initPOS);

  async function initPOS() {
    console.log(' POS: Starting...');

    currentUser = await initUserInfo();
    if (!currentUser) return;

    setupLogout();
    setupPatientAutocomplete();
    setupProductAutocomplete();

    await loadProducts();
    await loadAllPatients();

    // Buttons
    document.getElementById('selectPatientBtn')?.addEventListener('click', findPatient);
    document.getElementById('clearCartBtn')?.addEventListener('click', clearCart);
    document.getElementById('checkoutBtn')?.addEventListener('click', showPaymentModal);
    document.getElementById('searchBtn')?.addEventListener('click', searchProducts);

    // Inputs
    document.getElementById('patientSearch')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        findPatient();
      }
    });

    document.getElementById('productSearch')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchProducts();
      }
    });

    // Payment modal
    document.getElementById('confirmPaymentBtn')?.addEventListener('click', completeSale);
    document.getElementById('cancelPaymentBtn')?.addEventListener('click', hidePaymentModal);

    // Cash / reference logic
    document.getElementById('paymentMethod')?.addEventListener('change', updatePaymentUI);
    document.getElementById('cashAmount')?.addEventListener('input', updateCashChangeUI);
    document.getElementById('paymentReference')?.addEventListener('input', updatePaymentUI);
    document.getElementById('insuranceReference')?.addEventListener('input', updatePaymentUI);

    // Clear patient button (exists in HTML)
    document.getElementById('clearPatientBtn')?.addEventListener('click', clearSelectedPatient);

    // Current date
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
      currentDateEl.textContent = new Date().toLocaleDateString('es-CR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    updateCartDisplay();
    console.log(' POS initialized');
  }

  // -----------------------------
  // DATA LOADING
  // -----------------------------
  async function loadProducts() {
    try {
      const response = await fetch('/api/inventory/available', { credentials: 'include' });
      const data = await response.json();

      if (data.success && data.products) {
        availableProducts = data.products;
        displayProducts(availableProducts);
      } else {
        availableProducts = [];
        displayProducts(availableProducts);
      }
    } catch (error) {
      console.error(' Error loading products:', error);
      const container = document.getElementById('productsGrid');
      if (container) container.innerHTML = '<p class="text-center text-danger">Error al cargar productos</p>';
    }
  }

  async function loadAllPatients() {
    try {
      const response = await fetch('/api/patients', { credentials: 'include' });
      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        allPatients = data.patients || [];
      }
    } catch (error) {
      console.warn('Could not load patients:', error);
    }
  }

  // -----------------------------
  // PRODUCTS UI
  // -----------------------------
  function displayProducts(products) {
    const container = document.getElementById('productsGrid');
    if (!container) return;

    if (!products || products.length === 0) {
      container.innerHTML = '<p class="text-center text-muted">No hay productos disponibles</p>';
      return;
    }

    let html = '';

    products.forEach((product) => {
      const stockColor = getStockColor(product);
      const stockLabel = getStockLabel(product);

      html += `
        <div class="product-card" style="border-left: 4px solid ${stockColor};" onclick="window.addToCartGlobal(${product.ProductID})">
          <h6 style="color: #2C5F8D; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">${escapeHtml(product.ProductName)}</h6>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-weight: bold; color: #28a745; font-size: 18px;">${fmtCurrency(product.Price)}</span>
            <span style="background: ${stockColor}; color: white; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">${stockLabel}</span>
          </div>
          <div style="font-size: 12px; color: #666;">
            <strong>Stock:</strong> ${Number(product.TotalQuantity || 0)} ${escapeHtml(product.Unit || '')}
          </div>
          <div style="font-size: 11px; color: #999; margin-top: 5px;">
            ${escapeHtml(product.Code || '')}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function searchProducts() {
    const searchInput = document.getElementById('productSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    if (!searchTerm) {
      displayProducts(availableProducts);
      return;
    }

    const filtered = availableProducts.filter((p) =>
      (p.ProductName || '').toLowerCase().includes(searchTerm) ||
      (p.Code || '').toLowerCase().includes(searchTerm) ||
      (p.Description && p.Description.toLowerCase().includes(searchTerm))
    );

    if (filtered.length === 0) {
      const container = document.getElementById('productsGrid');
      if (container) container.innerHTML = '<p class="text-center text-muted">No se encontraron productos</p>';
      return;
    }

    displayProducts(filtered);
  }

  function getStockColor(product) {
    const qty = Number(product.TotalQuantity || 0);
    const rp = Number(product.ReorderPoint || 0);
    if (!qty || !rp) return '#6c757d';

    const percentage = (qty / rp) * 100;
    if (percentage >= 150) return '#28a745';
    if (percentage >= 100) return '#82c282';
    if (percentage >= 50) return '#ffc107';
    return '#dc3545';
  }

  function getStockLabel(product) {
    const qty = Number(product.TotalQuantity || 0);
    const rp = Number(product.ReorderPoint || 0);
    if (!qty || !rp) return '?';

    const percentage = (qty / rp) * 100;
    if (percentage >= 150) return 'Excelente';
    if (percentage >= 100) return 'Bueno';
    if (percentage >= 50) return 'Bajo';
    return 'Critico';
  }

  // -----------------------------
  // PATIENT AUTOCOMPLETE
  // -----------------------------
  function setupPatientAutocomplete() {
    const patientInput = document.getElementById('patientSearch');
    if (!patientInput) return;

    const autocomplete = document.createElement('div');
    autocomplete.id = 'patientAutocomplete';
    autocomplete.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 4px 4px;
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none;
    `;

    patientInput.parentElement.style.position = 'relative';
    patientInput.parentElement.appendChild(autocomplete);

    patientInput.addEventListener('input', () => {
      const searchTerm = patientInput.value.trim().toLowerCase();

      if (searchTerm.length < 2) {
        autocomplete.style.display = 'none';
        return;
      }

      const filtered = allPatients
        .filter((p) =>
          (p.FullName || '').toLowerCase().includes(searchTerm) ||
          (p.DocumentID || '').toLowerCase().includes(searchTerm)
        )
        .slice(0, 8);

      if (filtered.length === 0) {
        autocomplete.style.display = 'none';
        return;
      }

      autocomplete.innerHTML = filtered
        .map(
          (p) => `
          <div class="autocomplete-item" onclick="window.selectPatientFromAutocomplete(${p.PatientID}, '${escapeHtml(p.FullName)}', '${escapeHtml(p.DocumentID)}')" style="padding: 12px 15px; cursor: pointer; border-bottom: 1px solid #f0f0f0;">
            <strong style="color: #2C5F8D;">${escapeHtml(p.FullName)}</strong><br>
            <small style="color: #666;">${escapeHtml(p.DocumentID)}</small>
          </div>
        `
        )
        .join('');

      autocomplete.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!patientInput.contains(e.target) && !autocomplete.contains(e.target)) {
        autocomplete.style.display = 'none';
      }
    });
  }

  window.selectPatientFromAutocomplete = function (patientId, name, documentId) {
    selectedPatient = { PatientID: patientId, FullName: name, DocumentID: documentId };

    const patientInput = document.getElementById('patientSearch');
    if (patientInput) patientInput.value = name;

    const selectedDiv = document.getElementById('selectedPatient');
    const patientNameSpan = document.getElementById('patientName');

    if (selectedDiv && patientNameSpan) {
      patientNameSpan.textContent = name;
      selectedDiv.style.display = 'block';
    }

    document.getElementById('patientAutocomplete')?.style && (document.getElementById('patientAutocomplete').style.display = 'none');
  };

  function clearSelectedPatient() {
    selectedPatient = null;
    const patientInput = document.getElementById('patientSearch');
    if (patientInput) patientInput.value = '';

    const selectedDiv = document.getElementById('selectedPatient');
    if (selectedDiv) selectedDiv.style.display = 'none';
  }

  // -----------------------------
  // PRODUCT AUTOCOMPLETE
  // -----------------------------
  function setupProductAutocomplete() {
    const productInput = document.getElementById('productSearch');
    if (!productInput) return;

    const autocomplete = document.createElement('div');
    autocomplete.id = 'productAutocomplete';
    autocomplete.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 4px 4px;
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none;
    `;

    productInput.parentElement.style.position = 'relative';
    productInput.parentElement.appendChild(autocomplete);

    productInput.addEventListener('input', () => {
      const searchTerm = productInput.value.trim().toLowerCase();

      if (searchTerm.length < 2) {
        autocomplete.style.display = 'none';
        return;
      }

      const filtered = availableProducts
        .filter(
          (p) =>
            (p.ProductName || '').toLowerCase().includes(searchTerm) ||
            (p.Code || '').toLowerCase().includes(searchTerm)
        )
        .slice(0, 8);

      if (filtered.length === 0) {
        autocomplete.style.display = 'none';
        return;
      }

      autocomplete.innerHTML = filtered
        .map((p) => {
          const stockColor = getStockColor(p);
          return `
            <div class="autocomplete-item" onclick="window.selectProductFromAutocomplete(${p.ProductID})" style="padding: 12px 15px; cursor: pointer; border-bottom: 1px solid #f0f0f0; border-left: 4px solid ${stockColor};">
              <strong style="color: #2C5F8D;">${escapeHtml(p.ProductName)}</strong>
              <span style="float: right; font-weight: bold; color: #28a745;">${fmtCurrency(p.Price)}</span><br>
              <small style="color: #666;">Stock: ${Number(p.TotalQuantity || 0)} ${escapeHtml(p.Unit || '')}</small>
            </div>
          `;
        })
        .join('');

      autocomplete.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!productInput.contains(e.target) && !autocomplete.contains(e.target)) {
        autocomplete.style.display = 'none';
      }
    });
  }

  window.selectProductFromAutocomplete = function (productId) {
    const product = availableProducts.find((p) => p.ProductID === productId);
    if (!product) return;

    addToCart(product);

    const productInput = document.getElementById('productSearch');
    if (productInput) productInput.value = '';

    const autocomplete = document.getElementById('productAutocomplete');
    if (autocomplete) autocomplete.style.display = 'none';
  };

  // -----------------------------
  // FIND PATIENT
  // -----------------------------
  async function findPatient() {
    const searchInput = document.getElementById('patientSearch');
    const searchTerm = searchInput ? searchInput.value.trim() : '';

    if (!searchTerm) {
      showToast('Por favor ingrese un nombre o documento', 'warning');
      return;
    }

    try {
      const response = await fetch(`/api/patients?search=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success && data.patients && data.patients.length > 0) {
        const patient = data.patients[0];
        window.selectPatientFromAutocomplete(patient.PatientID, patient.FullName, patient.DocumentID);
        showToast(`Paciente encontrado: ${patient.FullName}`, 'success');
      } else {
        showToast('Paciente no encontrado', 'warning');
      }
    } catch (error) {
      console.error('Error finding patient:', error);
      showToast('Error al buscar paciente', 'danger');
    }
  }

  // -----------------------------
  // CART
  // -----------------------------
  window.addToCartGlobal = function (productId) {
    const product = availableProducts.find((p) => p.ProductID === productId);
    if (product) addToCart(product);
  };

  function addToCart(product) {
    const existingItem = cart.find((item) => item.ProductID === product.ProductID);

    if (existingItem) {
      if (existingItem.quantity < Number(product.TotalQuantity || 0)) {
        existingItem.quantity++;
      } else {
        showToast('No hay suficiente stock', 'warning');
        return;
      }
    } else {
      cart.push({
        ProductID: product.ProductID,
        ProductName: product.ProductName,
        Price: Number(product.Price || 0),
        quantity: 1,
        maxStock: Number(product.TotalQuantity || 0),
        Unit: product.Unit || ''
      });
    }

    updateCartDisplay();
    showToast(`${product.ProductName} agregado`, 'success');
  }

  function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (!cartItems) return;

    if (cart.length === 0) {
      cartItems.innerHTML = '<p class="text-muted text-center" style="margin-top: 50px;">El carrito esta vacio</p>';
      if (checkoutBtn) checkoutBtn.disabled = true;
      updateTotals(0, 0, 0, 0);
      return;
    }

    let html = '';
    let subtotal = 0;

    cart.forEach((item, index) => {
      const itemTotal = Number(item.Price || 0) * Number(item.quantity || 0);
      subtotal += itemTotal;

      html += `
        <div class="cart-item" style="padding: 15px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #2C5F8D; margin-bottom: 5px;">${escapeHtml(item.ProductName)}</div>
            <div style="font-size: 14px; color: #666;">${fmtCurrency(item.Price)} x ${item.quantity}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="number" value="${item.quantity}" min="1" max="${item.maxStock}"
              onchange="window.updateCartQuantity(${index}, this.value)"
              style="width: 60px; padding: 5px; border: 1px solid #ddd; border-radius: 4px; text-align: center;">
            <div style="font-weight: 600; min-width: 80px; text-align: right;">${fmtCurrency(itemTotal)}</div>
            <button onclick="window.removeFromCart(${index})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
          </div>
        </div>
      `;
    });

    cartItems.innerHTML = html;
    if (checkoutBtn) checkoutBtn.disabled = false;

    const tax = subtotal * 0.13;
    const total = subtotal + tax;
    updateTotals(subtotal, tax, 0, total);
  }

  function updateTotals(subtotal, tax, discount, total) {
    document.getElementById('subtotal') && (document.getElementById('subtotal').textContent = fmtCurrency(subtotal));
    document.getElementById('tax') && (document.getElementById('tax').textContent = fmtCurrency(tax));
    document.getElementById('discount') && (document.getElementById('discount').textContent = fmtCurrency(discount));
    document.getElementById('grandTotal') && (document.getElementById('grandTotal').textContent = fmtCurrency(total));
  }

  window.updateCartQuantity = function (index, newQuantity) {
    const qty = parseInt(newQuantity, 10);
    if (!Number.isFinite(qty) || qty < 1 || qty > cart[index].maxStock) {
      showToast('Cantidad invalida', 'warning');
      updateCartDisplay();
      return;
    }

    cart[index].quantity = qty;
    updateCartDisplay();
  };

  window.removeFromCart = function (index) {
    cart.splice(index, 1);
    updateCartDisplay();
    showToast('Producto eliminado', 'info');
  };

  function clearCart() {
    if (cart.length === 0) return;
    if (!confirm('mpiar el carrito?')) return;

    cart = [];
    clearSelectedPatient();
    updateCartDisplay();
    showToast('Carrito limpiado', 'info');
  }

  // -----------------------------
  // PAYMENT UI / CASH CHANGE
  // -----------------------------
  function getCartTotals() {
    const subtotal = cart.reduce(
      (sum, item) => sum + Number(item.Price || 0) * Number(item.quantity || 0),
      0
    );
    const tax = subtotal * 0.13;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }

  function showPaymentModal() {
    if (cart.length === 0) {
      showToast('Carrito vac Agregue productos antes de procesar una venta', 'warning');
      return;
    }

    const { subtotal, tax, total } = getCartTotals();

    document.getElementById('orderSubtotal') && (document.getElementById('orderSubtotal').textContent = fmtCurrency(subtotal));
    document.getElementById('orderTax') && (document.getElementById('orderTax').textContent = fmtCurrency(tax));
    document.getElementById('orderTotal') && (document.getElementById('orderTotal').textContent = fmtCurrency(total));

    // Patient summary
    const patientSummary = document.getElementById('posPatientSummary');
    const patientDetails = document.getElementById('posPatientDetails');
    if (patientSummary && patientDetails) {
      if (selectedPatient) {
        patientSummary.style.display = 'block';
        patientDetails.innerHTML = `
          <div><strong>${escapeHtml(selectedPatient.FullName || selectedPatient.fullName || 'Paciente')}</strong></div>
          <div>${escapeHtml(selectedPatient.DocumentID || selectedPatient.Document || 'N/A')}</div>
          <div>${escapeHtml(selectedPatient.Phone || selectedPatient.PhoneNumber || '')}</div>
        `;
      } else {
        patientSummary.style.display = 'none';
        patientDetails.innerHTML = '';
      }
    }

    // Reset fields
    const methodEl = document.getElementById('paymentMethod');
    if (methodEl) methodEl.value = 'CASH';

    const cashEl = document.getElementById('cashAmount');
    if (cashEl) cashEl.value = '';

    const refEl = document.getElementById('paymentReference');
    if (refEl) refEl.value = '';

    const insRefEl = document.getElementById('insuranceReference');
    if (insRefEl) insRefEl.value = '';

    const changeEl = document.getElementById('changeDue');
    if (changeEl) changeEl.textContent = fmtCurrency(0);

    const modal = document.getElementById('paymentModal');
    if (modal) modal.style.display = 'flex';

    updatePaymentUI();
  }

  function hidePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.style.display = 'none';
  }

  function updatePaymentUI() {
      const method = document.getElementById('paymentMethod')?.value;

      const cash = document.getElementById('cashSection');
      const ref = document.getElementById('referenceSection');
      const ins = document.getElementById('insuranceSection');
      const changeEl = document.getElementById('changeDue');

      if (!method) return;

      cash.style.display = 'none';
      ref.style.display = 'none';
      ins.style.display = 'none';
      if (changeEl) changeEl.textContent = '-';

      if (method === 'CASH') {
        cash.style.display = 'block';
        if (changeEl) changeEl.textContent = fmtCurrency(0);
      }
      if (method === 'CARD' || method === 'TRANSFER') ref.style.display = 'block';
      if (method === 'INSURANCE') ins.style.display = 'block';
  }

  function updateCashChangeUI() {
    const method = document.getElementById('paymentMethod')?.value;
    if (method !== 'CASH') return;

    const cashInput = document.getElementById('cashAmount');
    const changeEl = document.getElementById('changeDue');
    if (!cashInput || !changeEl) return;

    const { total } = getCartTotals();

    const received = Number(cashInput.value);
    if (!Number.isFinite(received) || received <= 0) {
      changeEl.textContent = fmtCurrency(0);
      return;
    }

    const change = received - total;
    changeEl.textContent = fmtCurrency(change > 0 ? change : 0);
  }

  // -----------------------------
  // COMPLETE SALE
  // -----------------------------
  async function completeSale() {
    if (cart.length === 0) return;

    const method = document.getElementById('paymentMethod')?.value;
    if (!method) {
      showToast('Seleccione m de pago', 'warning');
      return;
    }

    const { subtotal, tax, total } = getCartTotals();

    // Validate method-specific fields
    let paymentReference = null;
    let insuranceReference = null;
    let cashReceived = null;
    let changeDue = null;

    if (method === 'CASH') {
      cashReceived = Number(document.getElementById('cashAmount')?.value);
      if (!Number.isFinite(cashReceived) || cashReceived <= 0) {
        showToast('Ingrese el monto recibido en efectivo', 'warning');
        return;
      }
      if (cashReceived < total) {
        showToast('El monto recibido es menor al total', 'warning');
        return;
      }
      changeDue = Math.max(0, cashReceived - total);
    }

    if (method === 'CARD' || method === 'TRANSFER') {
      const ref = document.getElementById('paymentReference')?.value.trim();
      if (!ref) {
        showToast('Debe ingresar el n de referencia', 'warning');
        return;
      }
      paymentReference = ref;
    }

    if (method === 'INSURANCE') {
      insuranceReference = (document.getElementById('insuranceReference')?.value || '').trim();
      if (!insuranceReference) {
        showToast('Ingrese el n de referencia del seguro', 'warning');
        return;
      }
    }

    // Build items
    const items = cart.map((item) => ({
      productId: item.ProductID,
      quantity: item.quantity,
      unitPrice: Number(item.Price || 0),
      subtotal: Number(item.Price || 0) * Number(item.quantity || 0)
    }));

    const saleData = {
      patientId: selectedPatient ? selectedPatient.PatientID : null,
      warehouseId: 1,
      items,

      paymentMethod: method,
      subtotal,
      tax,
      total,

      // New POS fields (Option A)
      paymentReference,
      cashReceived,
      changeDue,
      insuranceReference
    };

    const confirmBtn = document.getElementById('confirmPaymentBtn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.dataset.originalText = confirmBtn.innerHTML;
      confirmBtn.innerHTML = ' Procesando...';
    }

    try {
      const response = await fetch('/api/sales/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(saleData)
      });

      const result = await response.json();

      if (result.success) {
        const displayNumber = result.invoiceNumber || result.invoiceId || 'sin numero';
        showToast(`Venta completada! Factura: ${displayNumber}`, 'success');
        cart = [];
        clearSelectedPatient();
        updateCartDisplay();
        hidePaymentModal();
        await loadProducts();
      } else {
        showToast(result.message || 'Error al procesar venta', 'danger');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al completar venta', 'danger');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = confirmBtn.dataset.originalText || 'Confirmar Pago';
      }
    }
  }

  // -----------------------------
  // AUTH / USER INFO
  // -----------------------------
  async function initUserInfo() {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      if (!response.ok) {
        window.location.href = 'login.html';
        return null;
      }

      const data = await response.json();
      if (data.loggedIn && data.user) {
        const fullName = data.user.fullName || data.user.FullName || data.user.Username || data.user.username || 'Usuario';
        const roleName = data.user.roleName || data.user.RoleName || data.user.role || 'Usuario';

        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');

        if (userAvatar) userAvatar.textContent = String(fullName).charAt(0).toUpperCase();
        if (userName) userName.textContent = fullName;
        if (userRole) userRole.textContent = roleName;

        return data.user;
      }

      window.location.href = 'login.html';
      return null;
    } catch (error) {
      console.error('Auth error:', error);
      window.location.href = 'login.html';
      return null;
    }
  }

  function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async () => {
      if (!confirm('Seguro que desea cerrar sesion?')) {
        return;
      }
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (e) {
        // ignore
      }
      window.location.href = 'login.html';
    });
  }

  // -----------------------------
  // UTILITIES
  // -----------------------------
  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function fmtCurrency(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return currencyFormatter.format(0);
    return currencyFormatter.format(n);
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type}`;
    toast.style.cssText =
      'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 260px; padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
})();
