// ============================================
// INVOICES MODULE - JavaScript
// File: js/invoices.js
// ============================================

// Global state
let allInvoices = [];
let currentInvoice = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    await initUserInfo();
    setupEventListeners();
    loadStats();
    
    // Set default date range to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('filterEndDate').valueAsDate = today;
    document.getElementById('filterStartDate').valueAsDate = thirtyDaysAgo;
    
    // Auto-load last 30 days of invoices
    loadInvoices();
}

// ============================================
// USER INFO & AUTHENTICATION
// ============================================

async function initUserInfo() {
    try {
        const response = await fetch('/api/auth/session', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = 'login.html';
            return;
        }
        
        const data = await response.json();
        
        if (data.success && data.user) {
            const userName = data.user.Username || data.user.username || 'Usuario';
            const userRole = data.user.RoleName || data.user.role || 'Usuario';
            
            document.getElementById('userName').textContent = userName;
            document.getElementById('userRole').textContent = userRole;
            document.getElementById('userAvatar').textContent = userName.charAt(0).toUpperCase();
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        window.location.href = 'login.html';
    }
}

function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        window.location.href = 'login.html';
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    setupLogout();
    
    // Search button
    document.getElementById('btnSearch').addEventListener('click', () => {
        loadInvoices();
    });
    
    // Clear filters button
    document.getElementById('btnClearFilters').addEventListener('click', () => {
        document.getElementById('searchInvoiceId').value = '';
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';
        document.getElementById('filterStatus').value = 'All';
        loadInvoices();
    });
    
    // Enter key on invoice ID search
    document.getElementById('searchInvoiceId').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadInvoices();
        }
    });
}

// ============================================
// LOAD DATA
// ============================================

async function loadStats() {
    try {
        const response = await fetch('/api/invoices/stats', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to load stats');
        
        const data = await response.json();
        
        if (data.success && data.stats) {
            const stats = data.stats;
            document.getElementById('statTotal').textContent = stats.TotalInvoices || 0;
            document.getElementById('statActive').textContent = stats.ActiveInvoices || 0;
            document.getElementById('statVoided').textContent = stats.VoidedInvoices || 0;
            document.getElementById('statRevenue').textContent = fmtCurrency(stats.TotalRevenue || 0);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadInvoices() {
    const invoiceId = document.getElementById('searchInvoiceId').value.trim();
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    const status = document.getElementById('filterStatus').value;
    
    // Show loading
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('invoicesTableContainer').style.display = 'none';
    
    try {
        let url = '/api/invoices?';
        const params = new URLSearchParams();
        
        if (invoiceId) {
            // Search by specific invoice ID
            url = `/api/invoices/search?invoiceId=${invoiceId}`;
        } else {
            // Filter by date range and status
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (status && status !== 'All') params.append('status', status);
            url += params.toString();
        }
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to load invoices');
        
        const data = await response.json();
        
        if (data.success) {
            allInvoices = data.invoices || [];
            displayInvoices(allInvoices);
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
        alert('Error al cargar facturas: ' + error.message);
    } finally {
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('invoicesTableContainer').style.display = 'block';
    }
}

function displayInvoices(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    No se encontraron facturas
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = invoices.map(invoice => `
        <tr>
            <td><strong>#${invoice.InvoiceID}</strong></td>
            <td>${fmtDate(invoice.InvoiceDate)}</td>
            <td>${escHtml(invoice.PatientName || 'N/A')}</td>
            <td>${fmtCurrency(invoice.GrandTotal)}</td>
            <td>${fmtCurrency(invoice.PatientPays)}</td>
            <td>
                ${getStatusBadge(invoice)}
            </td>
            <td>
                <span class="badge badge-info">${invoice.ItemCount || 0}</span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewInvoice(${invoice.InvoiceID})">
                    👁️ Ver
                </button>
                ${!invoice.IsVoided ? `
                    <button class="btn btn-sm btn-warning" onclick="showVoidModal(${invoice.InvoiceID})">
                        ❌ Anular
                    </button>
                    <button class="btn btn-sm btn-info" onclick="showRefundModal(${invoice.InvoiceID})">
                        💰 Reembolso
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function getStatusBadge(invoice) {
    if (invoice.IsVoided) {
        return '<span class="badge badge-danger">Anulada</span>';
    }
    
    if (invoice.HasRefund) {
        return '<span class="badge badge-warning">Con Reembolso</span>';
    }
    
    return '<span class="badge badge-success">Activa</span>';
}

// ============================================
// VIEW INVOICE DETAILS
// ============================================

window.viewInvoice = async function(invoiceId) {
    try {
        const response = await fetch(`/api/invoices/${invoiceId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to load invoice details');
        
        const data = await response.json();
        
        if (!data.success) {
            alert('Error al cargar detalles de la factura');
            return;
        }
        
        currentInvoice = data.invoice;
        const items = data.items || [];
        const refunds = data.refunds || [];
        
        showInvoiceDetailsModal(currentInvoice, items, refunds);
    } catch (error) {
        console.error('Error loading invoice details:', error);
        alert('Error al cargar detalles: ' + error.message);
    }
};

function showInvoiceDetailsModal(invoice, items, refunds) {
    const isVoided = invoice.IsVoided;
    const hasRefunds = refunds && refunds.length > 0;
    
    const itemsHtml = items.map(item => `
        <tr>
            <td>${escHtml(item.ProductName)}</td>
            <td>${item.Quantity}</td>
            <td>${fmtCurrency(item.UnitPrice)}</td>
            <td>${item.DiscountPct || 0}%</td>
            <td>${fmtCurrency(item.LineTotal)}</td>
            <td>${item.QuantityRefunded > 0 ? `<span class="badge badge-warning">${item.QuantityRefunded} reembolsado</span>` : '-'}</td>
        </tr>
    `).join('');
    
    const refundsHtml = hasRefunds ? refunds.map(refund => `
        <div class="alert alert-warning">
            <strong>Reembolso #${refund.RefundID}</strong><br>
            Monto: ${fmtCurrency(refund.RefundAmount)}<br>
            Razón: ${escHtml(refund.RefundReason)}<br>
            Método: ${refund.RefundMethod}<br>
            Procesado por: ${escHtml(refund.ProcessedByName)} el ${fmtDateTime(refund.ProcessedAt)}<br>
            ${refund.Notes ? `Notas: ${escHtml(refund.Notes)}` : ''}
        </div>
    `).join('') : '<p>No hay reembolsos para esta factura.</p>';
    
    const voidInfo = isVoided ? `
        <div class="alert alert-danger">
            <strong>⚠️ FACTURA ANULADA</strong><br>
            Razón: ${escHtml(invoice.VoidReason)}<br>
            Anulado por: ${escHtml(invoice.VoidedByName || 'N/A')} el ${fmtDateTime(invoice.VoidedAt)}
        </div>
    ` : '';
    
    const bodyHtml = `
        ${voidInfo}
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
                <p><strong>Factura #:</strong> ${invoice.InvoiceID}</p>
                <p><strong>Fecha:</strong> ${fmtDate(invoice.InvoiceDate)}</p>
                <p><strong>Paciente:</strong> ${escHtml(invoice.PatientName)}</p>
                <p><strong>Documento:</strong> ${escHtml(invoice.PatientDocument || 'N/A')}</p>
            </div>
            <div>
                <p><strong>Subtotal:</strong> ${fmtCurrency(invoice.Subtotal)}</p>
                <p><strong>Impuestos:</strong> ${fmtCurrency(invoice.TaxTotal)}</p>
                <p><strong>Total:</strong> ${fmtCurrency(invoice.GrandTotal)}</p>
                <p><strong>Cobertura Seguro:</strong> ${fmtCurrency(invoice.InsuranceCoverage)}</p>
                <p><strong>Paciente Paga:</strong> ${fmtCurrency(invoice.PatientPays)}</p>
            </div>
        </div>
        
        <h4>Items de la Factura</h4>
        <table class="table table-sm">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio Unit.</th>
                    <th>Descuento</th>
                    <th>Total Línea</th>
                    <th>Reembolso</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        <h4 style="margin-top: 20px;">Historial de Reembolsos</h4>
        ${refundsHtml}
    `;
    
    showModal(`Detalles de Factura #${invoice.InvoiceID}`, bodyHtml, '900px');
}

// ============================================
// VOID INVOICE
// ============================================

window.showVoidModal = async function(invoiceId) {
    const bodyHtml = `
        <div class="alert alert-warning">
            <strong>⚠️ Advertencia:</strong> Esta acción anulará la factura y restaurará el inventario automáticamente. Esta acción no se puede deshacer.
        </div>
        <div class="form-group">
            <label>Razón de Anulación *</label>
            <textarea id="voidReason" class="form-control" rows="3" placeholder="Ingrese la razón de la anulación..." required></textarea>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-danger" onclick="confirmVoid(${invoiceId})">❌ Anular Factura</button>
        </div>
    `;
    
    showModal('Anular Factura', bodyHtml, '600px');
};

window.confirmVoid = async function(invoiceId) {
    const reason = document.getElementById('voidReason').value.trim();
    
    if (!reason) {
        alert('Por favor ingrese una razón para la anulación');
        return;
    }
    
    if (!confirm('¿Está seguro que desea anular esta factura? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/invoices/${invoiceId}/void`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                voidReason: reason
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Factura anulada exitosamente. El inventario ha sido restaurado.');
            closeModal();
            loadStats();
            loadInvoices();
        } else {
            alert('Error: ' + (data.message || 'No se pudo anular la factura'));
        }
    } catch (error) {
        console.error('Error voiding invoice:', error);
        alert('Error al anular la factura: ' + error.message);
    }
};

// Continue in Part 2...
// ============================================
// REFUND PROCESSING
// ============================================

window.showRefundModal = async function(invoiceId) {
    try {
        // Load invoice details first
        const response = await fetch(`/api/invoices/${invoiceId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to load invoice');
        
        const data = await response.json();
        
        if (!data.success) {
            alert('Error al cargar detalles de la factura');
            return;
        }
        
        currentInvoice = data.invoice;
        const items = data.items || [];
        
        showRefundForm(invoiceId, currentInvoice, items);
    } catch (error) {
        console.error('Error loading invoice for refund:', error);
        alert('Error: ' + error.message);
    }
};

function showRefundForm(invoiceId, invoice, items) {
    const itemsCheckboxes = items.map(item => {
        const maxRefund = item.Quantity - (item.QuantityRefunded || 0);
        if (maxRefund <= 0) return ''; // Already fully refunded
        
        return `
            <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                <label style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="refund-item-check" data-item-id="${item.InvoiceItemID}" data-max="${maxRefund}" data-price="${item.UnitPrice}">
                    <div style="flex: 1;">
                        <strong>${escHtml(item.ProductName)}</strong><br>
                        <small>Precio: ${fmtCurrency(item.UnitPrice)} | Cantidad original: ${item.Quantity} | Ya reembolsado: ${item.QuantityRefunded || 0}</small>
                    </div>
                </label>
                <div class="form-group" style="margin-top: 10px; display: none;" id="qty-group-${item.InvoiceItemID}">
                    <label>Cantidad a Reembolsar (Máx: ${maxRefund})</label>
                    <input type="number" class="form-control refund-item-qty" id="qty-${item.InvoiceItemID}" min="1" max="${maxRefund}" value="${maxRefund}">
                </div>
            </div>
        `;
    }).join('');
    
    const bodyHtml = `
        <div class="alert alert-info">
            <strong>ℹ️ Información:</strong> Puede procesar un reembolso completo o seleccionar items específicos para reembolso parcial. El inventario se restaurará automáticamente.
        </div>
        
        <div class="form-group">
            <label>Tipo de Reembolso</label>
            <select id="refundType" class="form-control" onchange="toggleRefundType()">
                <option value="full">Reembolso Completo (${fmtCurrency(invoice.GrandTotal)})</option>
                <option value="partial">Reembolso Parcial (Seleccionar Items)</option>
            </select>
        </div>
        
        <div id="partialRefundSection" style="display: none;">
            <h4>Seleccione Items a Reembolsar:</h4>
            ${itemsCheckboxes || '<p>No hay items disponibles para reembolso.</p>'}
            <div class="form-group">
                <label>Monto Total de Reembolso</label>
                <input type="number" id="refundAmount" class="form-control" step="0.01" min="0" value="0" readonly>
            </div>
        </div>
        
        <div id="fullRefundSection">
            <div class="form-group">
                <label>Monto de Reembolso</label>
                <input type="number" id="refundAmountFull" class="form-control" step="0.01" min="0" value="${invoice.GrandTotal}" required>
            </div>
        </div>
        
        <div class="form-group">
            <label>Método de Reembolso *</label>
            <select id="refundMethod" class="form-control" required>
                <option value="">Seleccione...</option>
                <option value="CASH">Efectivo</option>
                <option value="CARD">Tarjeta</option>
                <option value="CREDIT_NOTE">Nota de Crédito</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Razón del Reembolso *</label>
            <textarea id="refundReason" class="form-control" rows="2" placeholder="Ej: Producto defectuoso" required></textarea>
        </div>
        
        <div class="form-group">
            <label>Notas Adicionales</label>
            <textarea id="refundNotes" class="form-control" rows="2" placeholder="Notas opcionales..."></textarea>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-success" onclick="processRefund(${invoiceId})">💰 Procesar Reembolso</button>
        </div>
    `;
    
    showModal('Procesar Reembolso - Factura #' + invoiceId, bodyHtml, '700px');
    
    // Setup event listeners for item checkboxes
    document.querySelectorAll('.refund-item-check').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const itemId = this.dataset.itemId;
            const qtyGroup = document.getElementById(`qty-group-${itemId}`);
            qtyGroup.style.display = this.checked ? 'block' : 'none';
            calculatePartialRefund();
        });
    });
    
    document.querySelectorAll('.refund-item-qty').forEach(input => {
        input.addEventListener('input', calculatePartialRefund);
    });
}

window.toggleRefundType = function() {
    const type = document.getElementById('refundType').value;
    document.getElementById('fullRefundSection').style.display = type === 'full' ? 'block' : 'none';
    document.getElementById('partialRefundSection').style.display = type === 'partial' ? 'block' : 'none';
};

function calculatePartialRefund() {
    let total = 0;
    
    document.querySelectorAll('.refund-item-check:checked').forEach(checkbox => {
        const itemId = checkbox.dataset.itemId;
        const price = parseFloat(checkbox.dataset.price);
        const qty = parseFloat(document.getElementById(`qty-${itemId}`).value) || 0;
        total += price * qty;
    });
    
    document.getElementById('refundAmount').value = total.toFixed(2);
}

window.processRefund = async function(invoiceId) {
    const type = document.getElementById('refundType').value;
    const method = document.getElementById('refundMethod').value;
    const reason = document.getElementById('refundReason').value.trim();
    const notes = document.getElementById('refundNotes').value.trim();
    
    if (!method) {
        alert('Por favor seleccione un método de reembolso');
        return;
    }
    
    if (!reason) {
        alert('Por favor ingrese la razón del reembolso');
        return;
    }
    
    let refundAmount = 0;
    let items = null;
    
    if (type === 'full') {
        refundAmount = parseFloat(document.getElementById('refundAmountFull').value);
    } else {
        // Partial refund - collect selected items
        refundAmount = parseFloat(document.getElementById('refundAmount').value);
        items = [];
        
        document.querySelectorAll('.refund-item-check:checked').forEach(checkbox => {
            const itemId = parseInt(checkbox.dataset.itemId);
            const qty = parseFloat(document.getElementById(`qty-${itemId}`).value);
            items.push({
                InvoiceItemID: itemId,
                Quantity: qty
            });
        });
        
        if (items.length === 0) {
            alert('Por favor seleccione al menos un item para reembolsar');
            return;
        }
    }
    
    if (refundAmount <= 0) {
        alert('El monto de reembolso debe ser mayor a cero');
        return;
    }
    
    if (!confirm(`¿Confirma el reembolso de ${fmtCurrency(refundAmount)}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/invoices/${invoiceId}/refund`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                refundAmount: refundAmount,
                refundReason: reason,
                refundMethod: method,
                notes: notes || null,
                items: items
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Reembolso procesado exitosamente. El inventario ha sido restaurado.');
            closeModal();
            loadStats();
            loadInvoices();
        } else {
            alert('Error: ' + (data.message || 'No se pudo procesar el reembolso'));
        }
    } catch (error) {
        console.error('Error processing refund:', error);
        alert('Error al procesar reembolso: ' + error.message);
    }
};

// ============================================
// MODAL UTILITIES
// ============================================

function showModal(title, bodyHtml, width = '600px') {
    const modalHtml = `
        <div class="modal" id="dynamicModal" style="display: flex;">
            <div class="modal-content" style="width: ${width}; max-width: 95%;">
                <div class="modal-header">
                    <h3>${escHtml(title)}</h3>
                    <button class="btn-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${bodyHtml}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modalHtml;
    
    // Close on outside click
    document.getElementById('dynamicModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

window.closeModal = function() {
    const modal = document.getElementById('dynamicModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('modalContainer').innerHTML = '';
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function fmtDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function fmtDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('es-CR');
}

function fmtCurrency(amount) {
    if (amount == null || isNaN(amount)) return '₡0.00';
    return '₡' + parseFloat(amount).toLocaleString('es-CR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}