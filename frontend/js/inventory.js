// inventory.js - Inventory Management with Better Error Handling

let currentUser = null;
let inventoryData = [];
let filteredData = [];
let categories = [];
let units = [];

// Initialize inventory
async function initInventory() {
    try {
        currentUser = await initUserInfo();
        if (!currentUser) return;
        
        setupLogout();
        setupEventListeners();
        
        // Load reference data
        await Promise.all([
            loadCategories(),
            loadUnits(),
            loadWarehouses()
        ]);
        
        // Load inventory
        await loadInventory();
    } catch (error) {
        console.error('Init inventory error:', error);
        showToast('Error al inicializar pagina', 'danger');
    }
}

// Setup event listeners
function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadInventory);
    }
    
    const warehouseFilter = document.getElementById('warehouseFilter');
    if (warehouseFilter) {
        warehouseFilter.addEventListener('change', filterInventory);
    }
    
    const productFilter = document.getElementById('productFilter');
    if (productFilter) {
        productFilter.addEventListener('input', debounce(filterInventory, 300));
    }
    
    const stockStatusFilter = document.getElementById('stockStatusFilter');
    if (stockStatusFilter) {
        stockStatusFilter.addEventListener('change', filterInventory);
    }
    
    const lowStockOnly = document.getElementById('lowStockOnly');
    if (lowStockOnly) {
        lowStockOnly.addEventListener('change', filterInventory);
    }
}

// Load categories
async function loadCategories() {
    try {
        const response = await fetch('/api/inventory/categories');
        const data = await response.json();
        if (data.success) {
            categories = data.categories || [];
            console.log('Categories loaded:', categories.length);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        categories = [];
    }
}

// Load units
async function loadUnits() {
    try {
        const response = await fetch('/api/inventory/units');
        const data = await response.json();
        if (data.success) {
            units = data.units || [];
            console.log('Units loaded:', units.length);
        }
    } catch (error) {
        console.error('Error loading units:', error);
        units = [];
    }
}

// Load warehouses
async function loadWarehouses() {
    const warehouseSelect = document.getElementById('warehouseFilter');
    if (warehouseSelect) {
        warehouseSelect.innerHTML = `
            <option value="">Todos los almacenes</option>
            <option value="1">Almac Principal</option>
        `;
    }
}

// Load inventory data
async function loadInventory() {
    const container = document.getElementById('inventoryTable');
    if (!container) {
        console.error('inventoryTable element not found');
        return;
    }
    
    const skeletonRows = Array.from({ length: 6 }).map(() => `
        <tr>
            <td><span class="skeleton-line w-80"></span></td>
            <td><span class="skeleton-line w-60"></span></td>
            <td><span class="skeleton-line w-60"></span></td>
            <td><span class="skeleton-line w-40"></span></td>
            <td><span class="skeleton-line w-40"></span></td>
            <td><span class="skeleton-line w-40"></span></td>
            <td><span class="skeleton-line w-60"></span></td>
            <td><span class="skeleton-line w-60"></span></td>
            <td><span class="skeleton-line w-60"></span></td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="table-wrapper">
        <table class="table table-sticky">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Categoria</th>
                    <th>Lote</th>
                    <th>Stock Actual</th>
                    <th>Min/Max</th>
                    <th>Precio</th>
                    <th>Estado</th>
                    <th>Vencimiento</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>${skeletonRows}</tbody>
        </table>
        </div>
    `;
    
    try {
        const lowStockOnly = document.getElementById('lowStockOnly')?.checked || false;
        const warehouseId = document.getElementById('warehouseFilter')?.value || '';
        
        let url = `/api/inventory/levels?lowStockOnly=${lowStockOnly}`;
        if (warehouseId) url += `&warehouseId=${warehouseId}`;
        
        console.log('Loading inventory from:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('Inventory response:', data);
        
        if (data.success && data.inventory) {
            inventoryData = data.inventory;
            filteredData = [...inventoryData];
            console.log(' Inventory loaded:', inventoryData.length, 'items');
            updateStatistics();
            displayInventory();
            renderFilterChips();
        } else {
            console.warn('No inventory data:', data);
            container.innerHTML = '<p class="text-muted text-center" style="padding: 40px;">No hay datos de inventario disponibles</p>';
        }
    } catch (error) {
        console.error(' Error loading inventory:', error);
        container.innerHTML = '<p class="text-danger text-center" style="padding: 40px;">Error al cargar inventario: ' + error.message + '</p>';
        showToast('Error al cargar inventario', 'danger');
    }
}

// Filter inventory
function filterInventory() {
    try {
        const warehouseFilter = document.getElementById('warehouseFilter')?.value || '';
        const productFilter = document.getElementById('productFilter')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('stockStatusFilter')?.value || '';
        const lowStockOnly = document.getElementById('lowStockOnly')?.checked || false;
        filteredData = inventoryData.filter(item => {
            let matches = true;
            
            if (warehouseFilter && item.WarehouseID != warehouseFilter) matches = false;
            if (productFilter && !item.ProductName.toLowerCase().includes(productFilter)) matches = false;
            if (statusFilter && item.StockStatus !== statusFilter) matches = false;
            if (lowStockOnly && !(item.StockStatus === 'CRITICAL' || item.StockStatus === 'LOW')) matches = false;
            
            return matches;
        });
        
        displayInventory();
        renderFilterChips();
    } catch (error) {
        console.error('Filter error:', error);
    }
}

function renderFilterChips() {
    const chipsContainer = document.getElementById('filterChips');
    if (!chipsContainer) return;

    const chips = [];
    const warehouseSelect = document.getElementById('warehouseFilter');
    const warehouseText = warehouseSelect?.selectedOptions?.[0]?.text || '';
    if (warehouseSelect && warehouseSelect.value) {
        chips.push(`<span class="filter-chip"><i class="fa-solid fa-warehouse"></i> ${warehouseText}</span>`);
    }

    const productText = document.getElementById('productFilter')?.value || '';
    if (productText) {
        chips.push(`<span class="filter-chip"><i class="fa-solid fa-magnifying-glass"></i> ${productText}</span>`);
    }

    const statusSelect = document.getElementById('stockStatusFilter');
    const statusText = statusSelect?.selectedOptions?.[0]?.text || '';
    if (statusSelect && statusSelect.value) {
        chips.push(`<span class="filter-chip"><i class="fa-solid fa-circle"></i> ${statusText}</span>`);
    }

    const lowStockOnly = document.getElementById('lowStockOnly')?.checked || false;
    if (lowStockOnly) {
        chips.push(`<span class="filter-chip"><i class="fa-solid fa-triangle-exclamation"></i> Solo stock bajo</span>`);
    }

    chipsContainer.innerHTML = chips.length
        ? chips.join('') + `<button class="filter-clear" onclick="clearInventoryFilters()">Limpiar filtros</button>`
        : '<span class="text-muted" style="font-size:12px;">Sin filtros activos</span>';
}

function clearInventoryFilters() {
    const warehouseSelect = document.getElementById('warehouseFilter');
    const productFilter = document.getElementById('productFilter');
    const statusSelect = document.getElementById('stockStatusFilter');
    const lowStockOnly = document.getElementById('lowStockOnly');

    if (warehouseSelect) warehouseSelect.value = '';
    if (productFilter) productFilter.value = '';
    if (statusSelect) statusSelect.value = '';
    if (lowStockOnly) lowStockOnly.checked = false;

    filteredData = [...inventoryData];
    displayInventory();
    renderFilterChips();
}

// Update statistics
function updateStatistics() {
    try {
        const stats = {
            total: inventoryData.length,
            critical: inventoryData.filter(i => i.StockStatus === 'CRITICAL').length,
            lowStock: inventoryData.filter(i => i.StockStatus === 'LOW').length,
            totalValue: inventoryData.reduce((sum, i) => sum + ((i.UnitPrice || 0) * (i.TotalQuantity || 0)), 0)
        };
        
        const totalProducts = document.getElementById('totalProducts');
        if (totalProducts) totalProducts.textContent = stats.total;
        
        const criticalItems = document.getElementById('criticalItems');
        if (criticalItems) criticalItems.textContent = stats.critical;
        
        const lowStockItems = document.getElementById('lowStockItems');
        if (lowStockItems) lowStockItems.textContent = stats.lowStock;
        
        const totalValue = document.getElementById('totalValue');
        if (totalValue) totalValue.textContent = formatCurrency(stats.totalValue);
        
        console.log(' Statistics updated:', stats);
    } catch (error) {
        console.error('Statistics error:', error);
    }
}

// Display inventory
function displayInventory() {
    const container = document.getElementById('inventoryTable');
    if (!container) return;
    
    try {
        if (filteredData.length === 0) {
            container.innerHTML = '<p class="text-muted text-center" style="padding: 40px;">No hay productos que mostrar</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="table-wrapper">
            <table class="table table-sticky">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Categor
                        <th>Lote</th>
                        <th>Stock Actual</th>
                        <th>Min/Max</th>
                        <th>Precio</th>
                        <th>Estado</th>
                        <th>Vencimiento</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(item => `
                        <tr>
                            <td><strong>${escapeHtml(item.ProductName || 'N/A')}</strong></td>
                            <td>${escapeHtml(item.CategoryName || 'N/A')}</td>
                            <td>${escapeHtml(item.BatchCode || 'N/A')}</td>
                            <td><strong>${item.TotalQuantity || 0}</strong> ${escapeHtml(item.UnitSymbol || '')}</td>
                            <td>${item.MinStock || 0} / ${item.MaxStock || 0}</td>
                            <td>${formatCurrency(item.UnitPrice || 0)}</td>
                            <td>${getStockStatusBadge(item.StockStatus)}</td>
                            <td>${item.ExpiryDate ? formatDate(item.ExpiryDate) : 'N/A'}</td>
                            <td class="action-cell">
                                <button class="btn btn-sm btn-info btn-icon" onclick="viewProductDetails(${item.ProductID})" title="Ver detalles" aria-label="Ver detalles">
                                    <i class="fa-solid fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-warning btn-icon" onclick="editProduct(${item.ProductID})" title="Editar" aria-label="Editar">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button class="btn btn-sm btn-primary btn-icon" onclick="adjustStock(${item.ProductID}, ${item.BatchID}, ${item.WarehouseID}, ${item.LocationID})" title="Ajustar stock" aria-label="Ajustar stock">
                                    <i class="fa-solid fa-boxes-stacked"></i>
                                </button>
                                <button class="btn btn-sm btn-danger btn-icon" onclick="deleteProduct(${item.ProductID}, '${escapeHtml(item.ProductName)}')" title="Eliminar" aria-label="Eliminar">
                                    <i class="fa-solid fa-ban"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            </div>
        `;
    } catch (error) {
        console.error('Display error:', error);
        container.innerHTML = '<p class="text-danger text-center">Error al mostrar inventario</p>';
    }
}

// Get stock status badge
function getStockStatusBadge(status) {
    const badges = {
        'CRITICAL': '<span class="badge badge-danger"> Critico</span>',
        'LOW': '<span class="badge badge-warning"> Bajo</span>',
        'NORMAL': '<span class="badge badge-success"> Normal</span>',
        'OVERSTOCK': '<span class="badge badge-info"> Exceso</span>'
    };
    return badges[status] || '<span class="badge">N/A</span>';
}

// Show add product modal
function showAddProductModal() {
    try {
        if (categories.length === 0 || units.length === 0) {
            showToast('Cargando datos necesarios...', 'info');
            Promise.all([loadCategories(), loadUnits()]).then(() => {
                showAddProductModal();
            });
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.id = 'productFormModal';
        
        modal.innerHTML = `
            <div class="modal-content" style="width: 700px;">
                <div class="modal-header">
                    <h3> Nuevo Producto</h3>
                    <button class="btn-close" onclick="closeProductFormModal()">
                </div>
                <div class="modal-body">
                    <form id="productForm" onsubmit="saveProduct(event)">
                        <input type="hidden" id="productId" value="">
                        
                        <div class="form-group">
                            <label>Nombre del Producto *</label>
                            <input type="text" id="productName" class="form-control" required>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div class="form-group">
                                <label>Categor *</label>
                                <select id="productCategory" class="form-control" required>
                                    <option value="">Seleccione...</option>
                                    ${categories.map(cat => `<option value="${cat.CategoryID}">${cat.Name}</option>`).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Unidad *</label>
                                <select id="productUnit" class="form-control" required>
                                    <option value="">Seleccione...</option>
                                    ${units.map(unit => `<option value="${unit.UnitID}">${unit.Name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                            <div class="form-group">
                                <label>Stock M *</label>
                                <input type="number" id="productMinStock" class="form-control" value="10" required min="0">
                            </div>
                            
                            <div class="form-group">
                                <label>Stock M *</label>
                                <input type="number" id="productMaxStock" class="form-control" value="1000" required min="1">
                            </div>
                            
                            <div class="form-group">
                                <label>Punto de Reorden *</label>
                                <input type="number" id="productReorder" class="form-control" value="20" required min="0">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Precio Unitario ( *</label>
                            <input type="number" id="productPrice" class="form-control" required min="0" step="0.01">
                        </div>
                        
                        <div class="form-group" id="initialStockGroup">
                            <label>Stock Inicial (opcional)</label>
                            <input type="number" id="productInitialStock" class="form-control" min="0" value="" placeholder="Ej: 100">
                            <small class="text-muted">Cantidad inicial en inventario. Dejar vac si agregar stock despu
                        </div>
                        
                        <div class="form-group" id="expiryDateGroup">
                            <label>Fecha de Vencimiento (opcional)</label>
                            <input type="date" id="productExpiryDate" class="form-control" value="">
                            <small class="text-muted">Solo necesario si agrega stock inicial. Por defecto: 2 a desde hoy.</small>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="productActive" checked>
                                Producto Activo
                            </label>
                        </div>
                        
                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                            <button type="button" class="btn btn-secondary" onclick="closeProductFormModal()">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-success">
                                 Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error showing modal:', error);
        showToast('Error al abrir formulario', 'danger');
    }
}

// Edit product
async function editProduct(productId) {
    try {
        const response = await fetch(`/api/inventory/products/${productId}`);
        const data = await response.json();
        
        if (data.success && data.product) {
            const product = data.product;
            
            showAddProductModal();
            
            setTimeout(() => {
                document.querySelector('#productFormModal .modal-header h3').textContent = ' Editar Producto';
                document.getElementById('productId').value = product.ProductID;
                document.getElementById('productName').value = product.Name;
                document.getElementById('productCategory').value = product.CategoryID;
                document.getElementById('productUnit').value = product.UnitID;
                document.getElementById('productMinStock').value = product.MinStock;
                document.getElementById('productMaxStock').value = product.MaxStock;
                document.getElementById('productReorder').value = product.ReorderPoint;
                document.getElementById('productPrice').value = product.CurrentPrice || '';
                document.getElementById('productActive').checked = product.IsActive;
                
                // Hide initial stock and expiry date fields when editing
                const initialStockGroup = document.getElementById('initialStockGroup');
                if (initialStockGroup) {
                    initialStockGroup.style.display = 'none';
                }
                
                const expiryDateGroup = document.getElementById('expiryDateGroup');
                if (expiryDateGroup) {
                    expiryDateGroup.style.display = 'none';
                }
            }, 100);
        }
    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Error al cargar producto', 'danger');
    }
}

// Save product
async function saveProduct(event) {
    event.preventDefault();
    
    try {
        const productId = document.getElementById('productId').value;
        const isEdit = productId !== '';
        
        const productData = {
            name: document.getElementById('productName').value.trim(),
            categoryId: document.getElementById('productCategory').value,
            unitId: document.getElementById('productUnit').value,
            minStock: document.getElementById('productMinStock').value,
            maxStock: document.getElementById('productMaxStock').value,
            reorderPoint: document.getElementById('productReorder').value,
            price: document.getElementById('productPrice').value,
            isActive: document.getElementById('productActive').checked
        };
        
        // Add initial stock and expiry date only for new products
        if (!isEdit) {
            const initialStock = document.getElementById('productInitialStock').value;
            if (initialStock && parseInt(initialStock) > 0) {
                productData.initialStock = parseInt(initialStock);
            }
            
            const expiryDate = document.getElementById('productExpiryDate').value;
            if (expiryDate) {
                productData.expiryDate = expiryDate;
            }
        }
        
        const url = isEdit ? `/api/inventory/products/${productId}` : '/api/inventory/products';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(isEdit ? 'Producto actualizado' : 'Producto creado', 'success');
            closeProductFormModal();
            await loadInventory();
        } else {
            showToast(data.message || 'Error al guardar', 'danger');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('Error al guardar producto', 'danger');
    }
}

// Adjust stock
function adjustStock(productId, batchId, warehouseId, locationId) {
    // Get current quantity from the table
    const currentItem = filteredData.find(item => 
        item.ProductID === productId && 
        item.BatchID === batchId
    );
    
    const currentQuantity = currentItem ? currentItem.TotalQuantity : 0;
    const productName = currentItem ? currentItem.ProductName : 'Producto';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.id = 'adjustStockModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="width: 500px;">
            <div class="modal-header">
                <h3> Ajustar Stock</h3>
                <button class="btn-close" onclick="closeAdjustStockModal()">
            </div>
            <div class="modal-body">
                <div style="background: #f0f8ff; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                    <strong>${escapeHtml(productName)}</strong><br>
                    <span style="color: #2C5F8D;">Stock actual: <strong>${currentQuantity}</strong> unidades</span>
                </div>
                
                <form id="adjustStockForm" onsubmit="saveStockAdjustment(event, ${productId}, ${batchId}, ${warehouseId}, ${locationId}, ${currentQuantity})">
                    <div class="form-group">
                        <label>Tipo de Ajuste *</label>
                        <select id="adjustmentType" class="form-control" required onchange="updateAdjustmentPreview(${currentQuantity})">
                            <option value="ADD"> Agregar</option>
                            <option value="SUBTRACT"> Restar</option>
                            <option value="SET"> Establecer cantidad exacta</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Cantidad *</label>
                        <input type="number" id="adjustmentQuantity" class="form-control" required min="0" onchange="updateAdjustmentPreview(${currentQuantity})">
                    </div>
                    
                    <div id="adjustmentPreview" style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-bottom: 15px; display: none;">
                        <strong>Vista previa:</strong><br>
                        <span id="previewText"></span>
                    </div>
                    
                    <div class="form-group">
                        <label>Raz *</label>
                        <textarea id="adjustmentReason" class="form-control" rows="2" required placeholder="Ej: Recepci de pedido, producto da inventario f etc."></textarea>
                        <small class="text-muted">Obligatorio para fines de auditor
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="closeAdjustStockModal()">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                             Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener for quantity input
    document.getElementById('adjustmentQuantity').addEventListener('input', () => {
        updateAdjustmentPreview(currentQuantity);
    });
}

// Update adjustment preview
function updateAdjustmentPreview(currentQuantity) {
    const type = document.getElementById('adjustmentType')?.value;
    const quantity = parseInt(document.getElementById('adjustmentQuantity')?.value) || 0;
    const preview = document.getElementById('adjustmentPreview');
    const previewText = document.getElementById('previewText');
    
    if (!type || !quantity || !preview || !previewText) return;
    
    let newQuantity = currentQuantity;
    let warningClass = '';
    
    if (type === 'ADD') {
        newQuantity = currentQuantity + quantity;
    } else if (type === 'SUBTRACT') {
        newQuantity = currentQuantity - quantity;
    } else if (type === 'SET') {
        newQuantity = quantity;
    }
    
    // Show warning if result would be negative
    if (newQuantity < 0) {
        warningClass = 'background: #f8d7da; color: #721c24;';
        previewText.innerHTML = `<strong>ERROR:</strong> Stock actual ${currentQuantity}, resultado ${newQuantity} unidades.<br>No hay suficiente stock para esta operacion.`;
    } else {
        warningClass = 'background: #d4edda; color: #155724;';
        previewText.innerHTML = `Nuevo stock: <strong>${newQuantity}</strong> (actual ${currentQuantity}) unidades`;
    }
    
    preview.style.display = 'block';
    preview.style.cssText = warningClass + ' padding: 10px; border-radius: 5px; margin-bottom: 15px;';
}

// Save stock adjustment
async function saveStockAdjustment(event, productId, batchId, warehouseId, locationId, currentQuantity) {
    event.preventDefault();
    
    try {
        const adjustmentType = document.getElementById('adjustmentType').value;
        const quantity = parseInt(document.getElementById('adjustmentQuantity').value);
        const reason = document.getElementById('adjustmentReason').value;
        
        // Frontend validation
        let newQuantity = currentQuantity;
        if (adjustmentType === 'ADD') {
            newQuantity = currentQuantity + quantity;
        } else if (adjustmentType === 'SUBTRACT') {
            newQuantity = currentQuantity - quantity;
        } else if (adjustmentType === 'SET') {
            newQuantity = quantity;
        }
        
    // Check if result would be negative
    if (newQuantity < 0) {
            showToast(`Stock insuficiente. Stock actual: ${currentQuantity} unidades. No se puede realizar esta operacion.`, 'danger');
            return;
        }
        
        const adjustmentData = {
            productId,
            batchId,
            warehouseId,
            locationId,
            adjustmentType,
            quantity,
            reason
        };
        
        const response = await fetch('/api/inventory/adjust', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adjustmentData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(` Stock ajustado: ${data.oldQuantity}  ${data.newQuantity}`, 'success');
            closeAdjustStockModal();
            await loadInventory();
        } else {
            // Show the error message from backend
            showToast(data.message || 'Error al ajustar stock', 'danger');
        }
    } catch (error) {
        console.error('Error adjusting stock:', error);
        showToast('Error al ajustar stock', 'danger');
    }
}

// View product details
async function viewProductDetails(productId) {
    try {
        const response = await fetch(`/api/inventory/products/${productId}`);
        const data = await response.json();
        
        if (data.success && data.product) {
            const product = data.product;
            const inventory = data.inventory || [];
            
            let message = ` ${product.Name}\n\n`;
            message += `Categor ${product.CategoryName}\n`;
            message += `Precio: ${formatCurrency(product.CurrentPrice || 0)}\n`;
            message += `Stock: ${product.MinStock}/${product.MaxStock}\n\n`;
            
            if (inventory.length > 0) {
                message += `Inventario:\n`;
                inventory.forEach(item => {
                    message += `- ${item.WarehouseName}: ${item.Quantity} ${product.UnitName}\n`;
                    message += `  Lote: ${item.BatchCode}, Vence: ${formatDate(item.ExpiryDate)}\n`;
                });
            }
            
            alert(message);
        }
    } catch (error) {
        console.error('Error loading details:', error);
        showToast('Error al cargar detalles', 'danger');
    }
}

// Close modals
function closeProductFormModal() {
    const modal = document.getElementById('productFormModal');
    if (modal) modal.remove();
}

function closeAdjustStockModal() {
    const modal = document.getElementById('adjustStockModal');
    if (modal) modal.remove();
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Delete product
function deleteProduct(productId, productName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.id = 'deleteProductModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="width: 500px;">
            <div class="modal-header" style="background: #dc3545; color: white;">
                <h3> Eliminar Producto</h3>
                <button class="btn-close" onclick="closeDeleteProductModal()" style="color: white;">
            </div>
            <div class="modal-body">
                <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <strong>ADVERTENCIA</strong><br>
                    Esta seguro que desea eliminar este producto?<br>
                    <strong style="font-size: 1.1em; color: #dc3545;">${escapeHtml(productName)}</strong>
                </div>
                
                <form id="deleteProductForm" onsubmit="confirmDeleteProduct(event, ${productId}, '${escapeHtml(productName)}')">
                    <div class="form-group">
                        <label>Raz de Eliminaci *</label>
                        <textarea id="deletionReason" class="form-control" rows="3" required 
                            placeholder="Ej: Producto discontinuado, vencido sin posibilidad de venta, error de registro, etc."></textarea>
                        <small class="text-muted">Obligatorio para fines de auditor Esta acci desactivar el producto y sus lotes.</small>
                    </div>
                    
                    <div style="background: #f8d7da; border: 1px solid #dc3545; padding: 10px; border-radius: 5px; margin: 15px 0;">
                        <small><strong>Nota:</strong> Esta acci desactivar el producto (no lo elimina permanentemente). El producto dejar de aparecer en inventario y no podr ser vendido.</small>
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="closeDeleteProductModal()">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-danger">
                             Eliminar Producto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Confirm delete product
async function confirmDeleteProduct(event, productId, productName) {
    event.preventDefault();
    
    const reason = document.getElementById('deletionReason').value.trim();
    
    if (!reason) {
        showToast('La raz de eliminaci es obligatoria', 'danger');
        return;
    }
    
    try {
        console.log('Deleting product:', productId, 'Reason:', reason);
        
        const response = await fetch(`/api/inventory/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        
        const data = await response.json();
        
        if (data.success) {
            let message = ` ${productName} eliminado`;
            
            if (data.remainingStock > 0) {
                message += ` (Ten ${data.remainingStock} unidades en stock)`;
            }
            
            showToast(message, 'success');
            closeDeleteProductModal();
            await loadInventory();
        } else {
            showToast(data.message || 'Error al eliminar producto', 'danger');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error al eliminar producto', 'danger');
    }
}

// Close delete product modal
function closeDeleteProductModal() {
    const modal = document.getElementById('deleteProductModal');
    if (modal) {
        modal.remove();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', initInventory);
