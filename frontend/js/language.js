// Language translations for HealthTrack System
const translations = {
    en: {
        // Navigation
        dashboard: "Dashboard",
        pos: "Point of Sale",
        inventory: "Inventory",
        patients: "Patients",
        doctors: "Doctors",
        invoices: "Invoices",
        reports: "Reports",
        users: "Users",
        
        // User menu
        logout: "Logout",
        user: "User",
        role: "Role",
        
        // Dashboard
        totalSales: "Total Sales",
        patientsAttended: "Patients Attended",
        lowStock: "Low Stock Products",
        expiringSoon: "Expiring Soon",
        expiringMeds: "Expiring Medications (90 days)",
        lowStockAlerts: "Low Stock Alerts",
        topProducts: "Top Selling Products",
        
        // Common
        loading: "Loading...",
        noData: "No data available",
        search: "Search",
        filter: "Filter",
        add: "Add",
        edit: "Edit",
        delete: "Delete",
        save: "Save",
        cancel: "Cancel",
        close: "Close",
        actions: "Actions",
        date: "Date",
        status: "Status",
        total: "Total",
        
        // POS
        posTitle: "Point of Sale",
        products: "Products",
        cart: "Cart",
        selectPatient: "Select Patient",
        paymentMethod: "Payment Method",
        cash: "Cash",
        card: "Card",
        insurance: "Insurance",
        completeSale: "Complete Sale",
        
        // Inventory
        inventoryTitle: "Inventory",
        productName: "Product Name",
        category: "Category",
        price: "Price",
        stock: "Stock",
        expiryDate: "Expiry Date",
        addProduct: "Add Product",
        lowStockOnly: "Low Stock Only",
        
        // Patients
        patientsTitle: "Patients",
        patientName: "Patient Name",
        idNumber: "ID Number",
        phone: "Phone",
        email: "Email",
        addPatient: "Add Patient",
        searchPatient: "Search Patient",
        
        // Doctors
        doctorsTitle: "Doctors",
        doctorName: "Doctor Name",
        specialty: "Specialty",
        licenseNumber: "License Number",
        addDoctor: "Add Doctor",
        insuranceRates: "Insurance Rates",
        
        // Invoices
        invoicesTitle: "Invoices",
        invoiceNumber: "Invoice Number",
        patient: "Patient",
        doctor: "Doctor",
        amount: "Amount",
        paymentStatus: "Payment Status",
        
        // Reports
        reportsTitle: "Reports",
        salesReport: "Sales Report",
        inventoryReport: "Inventory Report",
        patientReport: "Patient Report",
        dateRange: "Date Range",
        generateReport: "Generate Report",
        
        // Users
        usersTitle: "Users",
        username: "Username",
        fullName: "Full Name",
        addUser: "Add User",
        
        // Status
        active: "Active",
        inactive: "Inactive",
        paid: "Paid",
        pending: "Pending",
        cancelled: "Cancelled"
    },
    es: {
        // Navigation
        dashboard: "Panel",
        pos: "Punto de Venta",
        inventory: "Inventario",
        patients: "Pacientes",
        doctors: "Doctores",
        invoices: "Facturas",
        reports: "Reportes",
        users: "Usuarios",
        
        // User menu
        logout: "Cerrar Sesion",
        user: "Usuario",
        role: "Rol",
        
        // Dashboard
        totalSales: "Ventas Totales",
        patientsAttended: "Pacientes Atendidos",
        lowStock: "Productos Bajo Stock",
        expiringSoon: "Productos por Vencer",
        expiringMeds: "Medicamentos por Vencer (90 dias)",
        lowStockAlerts: "Alertas de Stock Bajo",
        topProducts: "Productos Mas Vendidos",
        
        // Common
        loading: "Cargando...",
        noData: "No hay datos disponibles",
        search: "Buscar",
        filter: "Filtrar",
        add: "Agregar",
        edit: "Editar",
        delete: "Eliminar",
        save: "Guardar",
        cancel: "Cancelar",
        close: "Cerrar",
        actions: "Acciones",
        date: "Fecha",
        status: "Estado",
        total: "Total",
        
        // POS
        posTitle: "Punto de Venta",
        products: "Productos",
        cart: "Carrito",
        selectPatient: "Seleccionar Paciente",
        paymentMethod: "Metodo de Pago",
        cash: "Efectivo",
        card: "Tarjeta",
        insurance: "Seguro",
        completeSale: "Completar Venta",
        
        // Inventory
        inventoryTitle: "Inventario",
        productName: "Nombre del Producto",
        category: "Categoria",
        price: "Precio",
        stock: "Stock",
        expiryDate: "Fecha de Vencimiento",
        addProduct: "Agregar Producto",
        lowStockOnly: "Solo Bajo Stock",
        
        // Patients
        patientsTitle: "Pacientes",
        patientName: "Nombre del Paciente",
        idNumber: "Numero de Identificacion",
        phone: "Telefono",
        email: "Correo Electronico",
        addPatient: "Agregar Paciente",
        searchPatient: "Buscar Paciente",
        
        // Doctors
        doctorsTitle: "Doctores",
        doctorName: "Nombre del Doctor",
        specialty: "Especialidad",
        licenseNumber: "Numero de Licencia",
        addDoctor: "Agregar Doctor",
        insuranceRates: "Tarifas de Seguros",
        
        // Invoices
        invoicesTitle: "Facturas",
        invoiceNumber: "Numero de Factura",
        patient: "Paciente",
        doctor: "Doctor",
        amount: "Monto",
        paymentStatus: "Estado de Pago",
        
        // Reports
        reportsTitle: "Reportes",
        salesReport: "Reporte de Ventas",
        inventoryReport: "Reporte de Inventario",
        patientReport: "Reporte de Pacientes",
        dateRange: "Rango de Fechas",
        generateReport: "Generar Reporte",
        
        // Users
        usersTitle: "Usuarios",
        username: "Nombre de Usuario",
        fullName: "Nombre Completo",
        addUser: "Agregar Usuario",
        
        // Status
        active: "Activo",
        inactive: "Inactivo",
        paid: "Pagado",
        pending: "Pendiente",
        cancelled: "Cancelado"
    }
};

// Language manager
const LanguageManager = {
    currentLang: localStorage.getItem('language') || 'es',
    
    init() {
        this.applyLanguage(this.currentLang);
        this.setupToggle();
    },
    
    applyLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
        
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });
        
        // Update toggle state
        const toggle = document.getElementById('langToggle');
        if (toggle) {
            toggle.checked = lang === 'en';
        }
        
        // Update language label
        const label = document.getElementById('langLabel');
        if (label) {
            label.textContent = lang === 'en' ? 'EN' : 'ES';
        }
    },
    
    setupToggle() {
        const toggle = document.getElementById('langToggle');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                const newLang = e.target.checked ? 'en' : 'es';
                this.applyLanguage(newLang);
            });
        }
    },
    
    toggle() {
        const newLang = this.currentLang === 'en' ? 'es' : 'en';
        this.applyLanguage(newLang);
    },
    
    get(key) {
        return translations[this.currentLang][key] || key;
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    LanguageManager.init();
});