// POS Module - FIXED GRID DISPLAY
// Remove inline styles that override CSS grid

(function() {
    'use strict';
    
    let currentUser = null;
    let cart = [];
    let availableProducts = [];
    let allPatients = [];
    let selectedPatient = null;
    
    async function initPOS() {
        console.log('🟢 POS: Starting...');
        
        currentUser = await initUserInfo();
        if (!currentUser) return;
        
        setupLogout();
        setupPatientAutocomplete();
        setupProductAutocomplete();
        
        await loadProducts();
        await loadAllPatients();
        
        document.getElementById('selectPatientBtn')?.addEventListener('click', findPatient);
        document.getElementById('clearCartBtn')?.addEventListener('click', clearCart);
        document.getElementById('checkoutBtn')?.addEventListener('click', showPaymentModal);
        document.getElementById('searchBtn')?.addEventListener('click', searchProducts);
        
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
        
        document.getElementById('confirmPaymentBtn')?.addEventListener('click', completeSale);
        document.getElementById('cancelPaymentBtn')?.addEventListener('click', hidePaymentModal);
        
        updateCartDisplay();
        console.log('✅ POS initialized');
    }
    
    async function loadProducts() {
        try {
            console.log('📦 Loading products...');
            
            const response = await fetch('/api/inventory/available', {
                credentials: 'include'
            });
            
            const data = await response.json();
            console.log('📦 Response:', data);
            
            if (data.success && data.products) {
                availableProducts = data.products;
                console.log('✅ Loaded', availableProducts.length, 'products');
                displayProducts();
            }
        } catch (error) {
            console.error('❌ Error loading products:', error);
            const container = document.getElementById('productsGrid');
            if (container) {
                container.innerHTML = '<p class="text-center text-danger">Error al cargar productos</p>';
            }
        }
    }
    
    function displayProducts() {
        const container = document.getElementById('productsGrid');
        if (!container) {
            console.error('❌ Container #productsGrid not found');
            return;
        }
        
        if (availableProducts.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay productos disponibles</p>';
            return;
        }
        
        // ✅ DON'T wrap in a div with inline styles - let CSS handle the grid!
        let html = '';
        
        availableProducts.forEach(product => {
            const stockColor = getStockColor(product);
            const stockLabel = getStockLabel(product);
            
            // ✅ Remove inline styles from product cards - use CSS classes instead
            html += `
                <div class="product-card" style="border-left: 4px solid ${stockColor};" onclick="window.addToCartGlobal(${product.ProductID})">
                    <h6 style="color: #2C5F8D; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">${escapeHtml(product.ProductName)}</h6>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-weight: bold; color: #28a745; font-size: 18px;">₡${formatCurrency(product.Price)}</span>
                        <span style="background: ${stockColor}; color: white; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">${stockLabel}</span>
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        <strong>Stock:</strong> ${product.TotalQuantity} ${product.Unit}
                    </div>
                    <div style="font-size: 11px; color: #999; margin-top: 5px;">
                        ${product.Code}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        console.log('✅ Products displayed in grid');
    }
    
    function searchProducts() {
        const searchInput = document.getElementById('productSearch');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        
        const container = document.getElementById('productsGrid');
        if (!container) return;
        
        if (!searchTerm) {
            displayProducts();
            return;
        }
        
        const filtered = availableProducts.filter(p => 
            p.ProductName.toLowerCase().includes(searchTerm) ||
            p.Code.toLowerCase().includes(searchTerm) ||
            (p.Description && p.Description.toLowerCase().includes(searchTerm))
        );
        
        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No se encontraron productos</p>';
            return;
        }
        
        // ✅ DON'T wrap in inline grid div
        let html = '';
        
        filtered.forEach(product => {
            const stockColor = getStockColor(product);
            const stockLabel = getStockLabel(product);
            
            html += `
                <div class="product-card" style="border-left: 4px solid ${stockColor};" onclick="window.addToCartGlobal(${product.ProductID})">
                    <h6 style="color: #2C5F8D; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">${escapeHtml(product.ProductName)}</h6>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-weight: bold; color: #28a745; font-size: 18px;">₡${formatCurrency(product.Price)}</span>
                        <span style="background: ${stockColor}; color: white; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">${stockLabel}</span>
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        <strong>Stock:</strong> ${product.TotalQuantity} ${product.Unit}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    function getStockColor(product) {
        if (!product.TotalQuantity || !product.ReorderPoint) return '#6c757d';
        const percentage = (product.TotalQuantity / product.ReorderPoint) * 100;
        if (percentage >= 150) return '#28a745';
        else if (percentage >= 100) return '#82c282';
        else if (percentage >= 50) return '#ffc107';
        else return '#dc3545';
    }
    
    function getStockLabel(product) {
        if (!product.TotalQuantity || !product.ReorderPoint) return '?';
        const percentage = (product.TotalQuantity / product.ReorderPoint) * 100;
        if (percentage >= 150) return 'Excelente';
        else if (percentage >= 100) return 'Bueno';
        else if (percentage >= 50) return 'Bajo';
        else return 'Crítico';
    }
    
    async function loadAllPatients() {
        try {
            const response = await fetch('/api/patients', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    allPatients = data.patients || [];
                    console.log('✅ Loaded', allPatients.length, 'patients');
                }
            }
        } catch (error) {
            console.warn('Could not load patients:', error);
        }
    }
    
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
            
            const filtered = allPatients.filter(p => 
                p.FullName.toLowerCase().includes(searchTerm) ||
                p.DocumentID.toLowerCase().includes(searchTerm)
            ).slice(0, 8);
            
            if (filtered.length === 0) {
                autocomplete.style.display = 'none';
                return;
            }
            
            let html = '';
            filtered.forEach(p => {
                html += `
                    <div class="autocomplete-item" onclick="window.selectPatientFromAutocomplete(${p.PatientID}, '${escapeHtml(p.FullName)}', '${escapeHtml(p.DocumentID)}')" style="padding: 12px 15px; cursor: pointer; border-bottom: 1px solid #f0f0f0;">
                        <strong style="color: #2C5F8D;">${escapeHtml(p.FullName)}</strong><br>
                        <small style="color: #666;">${escapeHtml(p.DocumentID)}</small>
                    </div>
                `;
            });
            
            autocomplete.innerHTML = html;
            autocomplete.style.display = 'block';
        });
        
        document.addEventListener('click', (e) => {
            if (!patientInput.contains(e.target) && !autocomplete.contains(e.target)) {
                autocomplete.style.display = 'none';
            }
        });
    }
    
    window.selectPatientFromAutocomplete = function(patientId, name, documentId) {
        selectedPatient = { PatientID: patientId, FullName: name, DocumentID: documentId };
        
        const patientInput = document.getElementById('patientSearch');
        if (patientInput) patientInput.value = name;
        
        const selectedDiv = document.getElementById('selectedPatient');
        const patientNameSpan = document.getElementById('patientName');
        
        if (selectedDiv && patientNameSpan) {
            patientNameSpan.textContent = name;
            selectedDiv.style.display = 'block';
        }
        
        const autocomplete = document.getElementById('patientAutocomplete');
        if (autocomplete) autocomplete.style.display = 'none';
        
        console.log('✅ Patient selected:', name);
    };
    
    window.clearSelectedPatient = function() {
        selectedPatient = null;
        const patientInput = document.getElementById('patientSearch');
        if (patientInput) patientInput.value = '';
        
        const selectedDiv = document.getElementById('selectedPatient');
        if (selectedDiv) selectedDiv.style.display = 'none';
    };
    
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
            
            const filtered = availableProducts.filter(p => 
                p.ProductName.toLowerCase().includes(searchTerm) ||
                p.Code.toLowerCase().includes(searchTerm)
            ).slice(0, 8);
            
            if (filtered.length === 0) {
                autocomplete.style.display = 'none';
                return;
            }
            
            let html = '';
            filtered.forEach(p => {
                const stockColor = getStockColor(p);
                html += `
                    <div class="autocomplete-item" onclick="window.selectProductFromAutocomplete(${p.ProductID})" style="padding: 12px 15px; cursor: pointer; border-bottom: 1px solid #f0f0f0; border-left: 4px solid ${stockColor};">
                        <strong style="color: #2C5F8D;">${escapeHtml(p.ProductName)}</strong>
                        <span style="float: right; font-weight: bold; color: #28a745;">₡${formatCurrency(p.Price)}</span><br>
                        <small style="color: #666;">Stock: ${p.TotalQuantity} ${p.Unit}</small>
                    </div>
                `;
            });
            
            autocomplete.innerHTML = html;
            autocomplete.style.display = 'block';
        });
        
        document.addEventListener('click', (e) => {
            if (!productInput.contains(e.target) && !autocomplete.contains(e.target)) {
                autocomplete.style.display = 'none';
            }
        });
    }
    
    window.selectProductFromAutocomplete = function(productId) {
        const product = availableProducts.find(p => p.ProductID === productId);
        if (product) {
            addToCart(product);
            const productInput = document.getElementById('productSearch');
            if (productInput) productInput.value = '';
            const autocomplete = document.getElementById('productAutocomplete');
            if (autocomplete) autocomplete.style.display = 'none';
        }
    };
    
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
    
    window.addToCartGlobal = function(productId) {
        const product = availableProducts.find(p => p.ProductID === productId);
        if (product) addToCart(product);
    };
    
    function addToCart(product) {
        const existingItem = cart.find(item => item.ProductID === product.ProductID);
        
        if (existingItem) {
            if (existingItem.quantity < product.TotalQuantity) {
                existingItem.quantity++;
            } else {
                showToast('No hay suficiente stock', 'warning');
                return;
            }
        } else {
            cart.push({
                ProductID: product.ProductID,
                ProductName: product.ProductName,
                Price: product.Price,
                quantity: 1,
                maxStock: product.TotalQuantity
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
            cartItems.innerHTML = '<p class="text-muted text-center" style="margin-top: 50px;">El carrito está vacío</p>';
            if (checkoutBtn) checkoutBtn.disabled = true;
            updateTotals(0, 0, 0, 0);
            return;
        }
        
        let html = '';
        let subtotal = 0;
        
        cart.forEach((item, index) => {
            const itemTotal = item.Price * item.quantity;
            subtotal += itemTotal;
            
            html += `
                <div class="cart-item" style="padding: 15px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #2C5F8D; margin-bottom: 5px;">${escapeHtml(item.ProductName)}</div>
                        <div style="font-size: 14px; color: #666;">₡${formatCurrency(item.Price)} x ${item.quantity}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="number" value="${item.quantity}" min="1" max="${item.maxStock}" 
                               onchange="window.updateCartQuantity(${index}, this.value)"
                               style="width: 60px; padding: 5px; border: 1px solid #ddd; border-radius: 4px; text-align: center;">
                        <div style="font-weight: 600; min-width: 80px; text-align: right;">₡${formatCurrency(itemTotal)}</div>
                        <button onclick="window.removeFromCart(${index})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>
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
        const subtotalEl = document.getElementById('subtotal');
        const taxEl = document.getElementById('tax');
        const discountEl = document.getElementById('discount');
        const grandTotalEl = document.getElementById('grandTotal');
        
        if (subtotalEl) subtotalEl.textContent = `₡${formatCurrency(subtotal)}`;
        if (taxEl) taxEl.textContent = `₡${formatCurrency(tax)}`;
        if (discountEl) discountEl.textContent = `₡${formatCurrency(discount)}`;
        if (grandTotalEl) grandTotalEl.textContent = `₡${formatCurrency(total)}`;
    }
    
    window.updateCartQuantity = function(index, newQuantity) {
        const qty = parseInt(newQuantity);
        if (qty > 0 && qty <= cart[index].maxStock) {
            cart[index].quantity = qty;
            updateCartDisplay();
        } else {
            showToast('Cantidad inválida', 'warning');
            updateCartDisplay();
        }
    };
    
    window.removeFromCart = function(index) {
        cart.splice(index, 1);
        updateCartDisplay();
        showToast('Producto eliminado', 'info');
    };
    
    function clearCart() {
        if (cart.length === 0) return;
        if (confirm('¿Limpiar el carrito?')) {
            cart = [];
            selectedPatient = null;
            updateCartDisplay();
            window.clearSelectedPatient();
            showToast('Carrito limpiado', 'info');
        }
    }
    
    function showPaymentModal() {
        const modal = document.getElementById('paymentModal');
        if (modal) modal.style.display = 'flex';
    }
    
    function hidePaymentModal() {
        const modal = document.getElementById('paymentModal');
        if (modal) modal.style.display = 'none';
    }
    
    async function completeSale() {
        if (cart.length === 0) return;
        
        const paymentMethod = document.getElementById('paymentMethod')?.value;
        if (!paymentMethod) {
            showToast('Seleccione método de pago', 'warning');
            return;
        }
        
        try {
            const subtotal = cart.reduce((sum, item) => sum + (item.Price * item.quantity), 0);
            const tax = subtotal * 0.13;
            const total = subtotal + tax;
            
            const items = cart.map(item => ({
                productId: item.ProductID,
                quantity: item.quantity,
                unitPrice: item.Price,
                subtotal: item.Price * item.quantity
            }));
            
            const saleData = {
                patientId: selectedPatient ? selectedPatient.PatientID : null,
                warehouseId: 1,
                items: items,
                paymentMethod: paymentMethod,
                subtotal: subtotal,
                tax: tax,
                total: total
            };
            
            const response = await fetch('/api/sales/invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(saleData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('¡Venta completada! Factura: ' + result.invoiceNumber, 'success');
                cart = [];
                selectedPatient = null;
                updateCartDisplay();
                window.clearSelectedPatient();
                hidePaymentModal();
                await loadProducts();
            } else {
                showToast('Error: ' + (result.message || 'Error al procesar venta'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al completar venta', 'danger');
        }
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function formatCurrency(amount) {
        return parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type}`;
        toast.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 250px; padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    async function initUserInfo() {
        try {
            const response = await fetch('/api/auth/session', { credentials: 'include' });
            const data = await response.json();
            
            if (data.loggedIn && data.user) {
                const userAvatar = document.getElementById('userAvatar');
                const userName = document.getElementById('userName');
                const userRole = document.getElementById('userRole');
                
                if (userAvatar) userAvatar.textContent = data.user.fullName.charAt(0).toUpperCase();
                if (userName) userName.textContent = data.user.fullName;
                if (userRole) userRole.textContent = data.user.roleName;
                
                return data.user;
            } else {
                window.location.href = '/index.html';
                return null;
            }
        } catch (error) {
            console.error('Auth error:', error);
            window.location.href = '/index.html';
            return null;
        }
    }
    
    function setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (confirm('¿Cerrar sesión?')) {
                    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                    window.location.href = '/index.html';
                }
            });
        }
    }
    
    document.addEventListener('DOMContentLoaded', () => {
        const clearPatientBtn = document.getElementById('clearPatientBtn');
        if (clearPatientBtn) {
            clearPatientBtn.addEventListener('click', window.clearSelectedPatient);
        }
    });
    
    document.addEventListener('DOMContentLoaded', initPOS);
    
})();