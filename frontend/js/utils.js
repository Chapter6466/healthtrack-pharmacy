// utils.js - Shared Utility Functions

// Check if user is logged in
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        if (!data.loggedIn) {
            window.location.href = '/login.html';
            return null;
        }
        
        return data.user;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login.html';
        return null;
    }
}

// Initialize user info in sidebar
async function initUserInfo() {
    const user = await checkAuth();
    if (!user) return;
    
    // Update sidebar user info
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (userNameEl) userNameEl.textContent = user.fullName;
    if (userRoleEl) userRoleEl.textContent = user.roleName;
    if (userAvatarEl) {
        const initials = user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2);
        userAvatarEl.textContent = initials;
    }
    
    return user;
}

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login.html';
    }
}

// Setup logout button
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CR', {
        style: 'currency',
        currency: 'CRC'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

// Format datetime
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '10000';
    toast.style.minWidth = '300px';
    toast.style.animation = 'slideIn 0.3s ease';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS for toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Update current date display
function updateCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const now = new Date();
        dateEl.textContent = new Intl.DateTimeFormat('es-CR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(now);
    }
}

// Calculate days until date
function daysUntil(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Get stock status class
function getStockStatusClass(status) {
    const statusMap = {
        'CRITICAL': 'critical',
        'LOW': 'low',
        'NORMAL': 'normal',
        'OVERSTOCK': 'overstock'
    };
    return statusMap[status] || 'normal';
}

// Get stock status text
function getStockStatusText(status) {
    const statusMap = {
        'CRITICAL': '🔴 Crítico',
        'LOW': '🟡 Bajo',
        'NORMAL': '🟢 Normal',
        'OVERSTOCK': '🔵 Exceso'
    };
    return statusMap[status] || status;
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkAuth,
        initUserInfo,
        logout,
        setupLogout,
        formatCurrency,
        formatDate,
        formatDateTime,
        showToast,
        updateCurrentDate,
        daysUntil,
        getStockStatusClass,
        getStockStatusText,
        debounce
    };
}