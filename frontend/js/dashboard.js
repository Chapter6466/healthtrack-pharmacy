// dashboard.js - Dashboard Page Logic

let currentUser = null;

// Initialize dashboard
async function initDashboard() {
    // Check authentication
    currentUser = await initUserInfo();
    if (!currentUser) return;
    
    // Setup logout
    setupLogout();
    
    // Update current date
    updateCurrentDate();
    
    // Load dashboard data
    await loadDashboardSummary();
    await loadExpiringMedications();
    await loadLowStockAlerts();
}

// Load dashboard summary
async function loadDashboardSummary() {
    try {
        console.log('Loading dashboard summary...');
        const response = await fetch('/api/dashboard/summary');
        const data = await response.json();
        
        console.log('Dashboard data received:', data);
        
        if (data.success && data.data && data.data.length > 0) {
            const summary = data.data[0];
            console.log('Summary:', summary);
            
            // Update stats with fallback to 0
            document.getElementById('totalSales').textContent = formatCurrency(summary.TotalSalesToday || 0);
            document.getElementById('totalPatients').textContent = summary.TotalPatientsToday || 0;
            document.getElementById('lowStockCount').textContent = summary.LowStockItemsCount || 0;
            document.getElementById('expiringCount').textContent = summary.ExpiringItemsCount || 0;
            
            // Show additional stats if elements exist
            const weekSales = document.getElementById('totalSalesWeek');
            if (weekSales) {
                weekSales.textContent = formatCurrency(summary.TotalSalesWeek || 0);
            }
            
            const monthSales = document.getElementById('totalSalesMonth');
            if (monthSales) {
                monthSales.textContent = formatCurrency(summary.TotalSalesMonth || 0);
            }
            
            console.log(' Dashboard stats updated');
            
            // Load top products
            await loadTopProducts();
        } else {
            console.warn('No dashboard data available:', data);
            showToast('No hay datos disponibles en el dashboard', 'info');
        }
    } catch (error) {
        console.error(' Error loading dashboard summary:', error);
        showToast('Error al cargar resumen del dashboard', 'danger');
    }
}

// Load top products
async function loadTopProducts() {
    try {
        const response = await fetch('/api/dashboard/top-products?limit=5&days=365');
        const data = await response.json();
        
        console.log('Top products data:', data);
        
        if (data.success && data.products && data.products.length > 0) {
            displayTopProducts(data.products);
        }
    } catch (error) {
        console.error('Error loading top products:', error);
    }
}

// Load expiring medications
async function loadExpiringMedications() {
    const container = document.getElementById('expiringList');
    
    try {
        const response = await fetch('/api/inventory/expiring?daysThreshold=90');
        const data = await response.json();
        
        if (data.success && data.expiring && data.expiring.length > 0) {
            container.innerHTML = '<ul class="alert-list">' +
                data.expiring.map(item => {
                    const days = daysUntil(item.ExpiryDate);
                    const alertClass = days <= 30 ? 'critical' : 'warning';
                    
                    return `
                        <li class="alert-item ${alertClass}">
                            <div>
                                <strong>${item.ProductName}</strong>
                                <br>
                                <small>Lote: ${item.BatchCode} | Vence: ${formatDate(item.ExpiryDate)}</small>
                                <br>
                                <small>Stock: ${item.TotalQuantity} ${item.Unit} | ${days} d restantes</small>
                            </div>
                            ${days <= 15 ? '<span class="badge badge-danger">URGENTE</span>' : ''}
                        </li>
                    `;
                }).join('') +
            '</ul>';
        } else {
            container.innerHTML = '<p class="text-muted text-center">No hay medicamentos pr a vencer</p>';
        }
    } catch (error) {
        console.error('Error loading expiring medications:', error);
        container.innerHTML = '<p class="text-danger text-center">Error al cargar datos</p>';
    }
}

// Load low stock alerts
async function loadLowStockAlerts() {
    const container = document.getElementById('lowStockList');
    
    try {
        const response = await fetch('/api/inventory/low-stock');
        const data = await response.json();
        
        if (data.success && data.lowStock && data.lowStock.length > 0) {
            container.innerHTML = '<ul class="alert-list">' +
                data.lowStock.map(item => {
                    const percentage = (item.TotalQuantity / item.MaxStock) * 100;
                    const alertClass = percentage < 25 ? 'critical' : 'warning';
                    
                    return `
                        <li class="alert-item ${alertClass}">
                            <div>
                                <strong>${item.ProductName}</strong>
                                <br>
                                <small>Stock actual: ${item.TotalQuantity} ${item.Unit}</small>
                                <br>
                                <small>Punto de reorden: ${item.ReorderPoint} | M ${item.MaxStock}</small>
                            </div>
                            <span class="badge badge-warning">${Math.round(percentage)}%</span>
                        </li>
                    `;
                }).join('') +
            '</ul>';
        } else {
            container.innerHTML = '<p class="text-muted text-center">No hay alertas de stock bajo</p>';
        }
    } catch (error) {
        console.error('Error loading low stock alerts:', error);
        container.innerHTML = '<p class="text-danger text-center">Error al cargar datos</p>';
    }
}

// Display top products
function displayTopProducts(products) {
    const container = document.getElementById('topProductsList');
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No hay datos de productos</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>Cantidad Vendida</th>
                    <th>Total Ventas</th>
                </tr>
            </thead>
            <tbody>
                ${products.map((product, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td><strong>${product.ProductName || 'N/A'}</strong></td>
                        <td>${product.TotalQuantity || 0}</td>
                        <td>${formatCurrency(product.TotalSales || 0)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Auto-refresh dashboard every 5 minutes
setInterval(() => {
    loadDashboardSummary();
    loadExpiringMedications();
    loadLowStockAlerts();
}, 5 * 60 * 1000);

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);