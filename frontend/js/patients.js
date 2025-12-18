// Frontend / healthtrack-pharmacy / js / patients.js

(function() {
    'use strict';
    
    // ========================================
    // VARIABLES (UPDATED)
    // ========================================
    let patientsData = [];
    let allPatients = []; // For autocomplete
    let deactivatedPatients = []; // NEW - for deactivated tab
    let insuranceProviders = [];
    let prescribers = [];
    let allProducts = []; // NEW - for prescriptions
    let currentUser = null;
    let currentTab = 'active'; // NEW - track current tab
    
    console.log(' Patients module starting...');
    
    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ========================================
    // INITIALIZATION (UPDATED)
    // ========================================
    async function init() {
        console.log(' Initializing patients module...');
        
        // Initialize user info in sidebar
        currentUser = await initUserInfo();
        if (!currentUser) return;
        
        // Setup logout button
        setupLogout();
        
        // Setup tabs (NEW)
        setupTabs();
        
        // Setup search functionality
        setupSearch();
        
        // Load data
        await loadAllData();
        addNewPatientButton();
    }
    
    // ========================================
    // TAB MANAGEMENT (NEW)
    // ========================================
    function setupTabs() {
        const topBar = document.querySelector('.top-bar');
        if (topBar && !document.getElementById('patientTabs')) {
            const tabsHtml = `
                <div id="patientTabs" style="margin-top: 15px; border-bottom: 2px solid #e0e0e0;">
                    <button class="tab-button active" data-tab="active"> Pacientes Activos</button>
                    <button class="tab-button" data-tab="deactivated"> Pacientes Desactivados</button>
                </div>
            `;
            topBar.insertAdjacentHTML('beforeend', tabsHtml);
            
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.addEventListener('click', () => switchTab(btn.dataset.tab));
            });
        }
    }
    
    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        const searchCard = document.getElementById('searchCard') || document.querySelector('.card');
        if (searchCard) {
            searchCard.style.display = tab === 'active' ? 'block' : 'none';
        }
        
        if (tab === 'active') {
            displayPatients();
        } else {
            displayDeactivatedPatients();
        }
    }
    
    // ========================================
    // USER INFO - Populate sidebar widget
    // ========================================
    async function initUserInfo() {
        try {
            const response = await fetch('/api/auth/session', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.loggedIn && data.user) {
                const userNameElem = document.querySelector('.user-name');
                const userRoleElem = document.querySelector('.user-role');
                const avatarElem = document.querySelector('.user-avatar');
                
                if (userNameElem) userNameElem.textContent = data.user.fullName || 'Usuario';
                if (userRoleElem) userRoleElem.textContent = data.user.roleName || 'Usuario';
                if (avatarElem) {
                    const initials = (data.user.fullName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    avatarElem.textContent = initials;
                }
                
                return data.user;
            } else {
                window.location.href = '/index.html';
                return null;
            }
        } catch (error) {
            console.error('Error loading user info:', error);
            window.location.href = '/index.html';
            return null;
        }
    }
    
    function setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        credentials: 'include'
                    });
                    window.location.href = '/index.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    window.location.href = '/index.html';
                }
            });
        }
    }
    
    // ========================================
    // SEARCH FUNCTIONALITY
    // ========================================
    function setupSearch() {
        const nameInput = document.getElementById('searchName');
        const docInput = document.getElementById('searchDoc');
        const searchBtn = document.getElementById('searchBtn');
        
        // Autocomplete containers
        if (nameInput) {
            const nameAutocomplete = document.createElement('div');
            nameAutocomplete.id = 'nameAutocomplete';
            nameAutocomplete.className = 'autocomplete-list';
            nameInput.parentElement.style.position = 'relative';
            nameInput.parentElement.appendChild(nameAutocomplete);
            
            nameInput.addEventListener('input', () => handleNameAutocomplete(nameInput.value));
            nameInput.addEventListener('focus', () => handleNameAutocomplete(nameInput.value));
        }
        
        if (docInput) {
            const docAutocomplete = document.createElement('div');
            docAutocomplete.id = 'docAutocomplete';
            docAutocomplete.className = 'autocomplete-list';
            docInput.parentElement.style.position = 'relative';
            docInput.parentElement.appendChild(docAutocomplete);
            
            docInput.addEventListener('input', () => handleDocAutocomplete(docInput.value));
            docInput.addEventListener('focus', () => handleDocAutocomplete(docInput.value));
        }
        
        // Close autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.form-group')) {
                hideAutocomplete('nameAutocomplete');
                hideAutocomplete('docAutocomplete');
            }
        });
        
        // Search button
        if (searchBtn) {
            searchBtn.addEventListener('click', performSearch);
        }
        
        // Enter key search
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') performSearch();
            });
        }
        if (docInput) {
            docInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') performSearch();
            });
        }
    }
    
    function handleNameAutocomplete(searchTerm) {
        const container = document.getElementById('nameAutocomplete');
        if (!container) return;
        
        if (!searchTerm || searchTerm.length < 2) {
            hideAutocomplete('nameAutocomplete');
            return;
        }
        
        const filtered = allPatients.filter(p => 
            p.FullName.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 8);
        
        if (filtered.length === 0) {
            hideAutocomplete('nameAutocomplete');
            return;
        }
        
        let html = '';
        filtered.forEach(p => {
            html += `
                <div class="autocomplete-item" onclick="window.selectPatient(${p.PatientID})">
                    <strong>${escHtml(p.FullName)}</strong><br>
                    <small>${escHtml(p.DocumentID)} | ${formatGender(p.Gender)}</small>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.style.display = 'block';
    }
    
    function handleDocAutocomplete(searchTerm) {
        const container = document.getElementById('docAutocomplete');
        if (!container) return;
        
        if (!searchTerm || searchTerm.length < 2) {
            hideAutocomplete('docAutocomplete');
            return;
        }
        
        const filtered = allPatients.filter(p => 
            p.DocumentID.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 8);
        
        if (filtered.length === 0) {
            hideAutocomplete('docAutocomplete');
            return;
        }
        
        let html = '';
        filtered.forEach(p => {
            html += `
                <div class="autocomplete-item" onclick="window.selectPatient(${p.PatientID})">
                    <strong>${escHtml(p.DocumentID)}</strong><br>
                    <small>${escHtml(p.FullName)} | ${formatGender(p.Gender)}</small>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.style.display = 'block';
    }
    
    function hideAutocomplete(id) {
        const container = document.getElementById(id);
        if (container) {
            container.style.display = 'none';
        }
    }
    
    window.selectPatient = function(patientId) {
        hideAutocomplete('nameAutocomplete');
        hideAutocomplete('docAutocomplete');
        window.viewPat(patientId);
    };
    
    function performSearch() {
        const nameInput = document.getElementById('searchName');
        const docInput = document.getElementById('searchDoc');
        
        const nameSearch = nameInput?.value.trim().toLowerCase() || '';
        const docSearch = docInput?.value.trim().toLowerCase() || '';
        
        console.log(' Search triggered:', { nameSearch, docSearch, totalPatients: allPatients.length });
        
        if (!nameSearch && !docSearch) {
            patientsData = [...allPatients];
        } else {
            patientsData = allPatients.filter(p => {
                const matchName = !nameSearch || p.FullName.toLowerCase().includes(nameSearch);
                const matchDoc = !docSearch || p.DocumentID.toLowerCase().includes(docSearch);
                return matchName && matchDoc;
            });
        }
        
        console.log(' Search results:', patientsData.length, 'patients found');
        
        displayPatients();
        hideAutocomplete('nameAutocomplete');
        hideAutocomplete('docAutocomplete');
    }
    
    // ========================================
    // DATA LOADING (UPDATED)
    // ========================================
    function addNewPatientButton() {
        const searchSection = document.querySelector('.card-header');
        
        if (searchSection) {
            if (document.getElementById('addPatientBtn')) {
                return;
            }
            
            const btnDiv = document.createElement('div');
            btnDiv.style.cssText = 'position: absolute; top: 20px; right: 20px; z-index: 100;';
            btnDiv.innerHTML = '<button id="addPatientBtn" onclick="window.addNewPat()" class="btn btn-success" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;"> Nuevo Paciente</button>';
            
            const container = searchSection.parentElement || searchSection;
            container.style.position = 'relative';
            container.appendChild(btnDiv);
            
            console.log(' Add Patient button added');
        }
    }
    
    async function loadAllData() {
        await loadPatients();
        await loadDeactivatedPatients(); // NEW
        
        // Load products for prescriptions (NEW)
        try {
            const res = await fetch('/api/products', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.products)) {
                    allProducts = data.products;
                    console.log(' Loaded', allProducts.length, 'products');
                } else {
                    allProducts = [];
                    console.warn('  No products found or invalid response');
                }
            } else {
                allProducts = [];
                console.warn('  Products endpoint failed');
            }
        } catch (e) { 
            allProducts = [];
            console.warn('  Products not loaded:', e); 
        }
        
        try {
            const res = await fetch('/api/patients/insurance/providers', {
                credentials: 'include'
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.providers)) {
                    insuranceProviders = data.providers;
                    console.log(' Loaded', insuranceProviders.length, 'insurance providers');
                } else {
                    insuranceProviders = [];
                }
            }
        } catch (e) {
            insuranceProviders = [];
            console.warn('Insurance providers not loaded:', e);
        }
        
        try {
            const res = await fetch('/api/patients/prescribers/list', {
                credentials: 'include'
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.prescribers)) {
                    prescribers = data.prescribers;
                    console.log(' Loaded', prescribers.length, 'prescribers');
                } else {
                    prescribers = [];
                }
            }
        } catch (e) {
            prescribers = [];
            console.warn('Prescribers not loaded:', e);
        }
    }
    
    async function loadPatients() {
        try {
            console.log(' Loading patients...');
            const response = await fetch('/api/patients', {
                credentials: 'include'
            });
            
            if (response.status === 401) {
                console.error(' 401 Unauthorized');
                alert('Tu sesi ha expirado. Por favor inicia sesi nuevamente.');
                window.location.href = '/index.html';
                return;
            }
            
            if (!response.ok) {
                console.error(' HTTP error:', response.status);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && Array.isArray(data.patients)) {
                allPatients = data.patients;
                patientsData = [...allPatients];
                console.log(' Loaded', allPatients.length, 'patients');
                displayPatients();
            } else {
                console.error(' Invalid response structure:', data);
                allPatients = [];
                patientsData = [];
                displayPatients();
            }
            
        } catch (error) {
            console.error(' Error loading patients:', error);
            alert('Error al cargar pacientes. Por favor recarga la p
        }
    }
    
    // DEACTIVATED PATIENTS (NEW)
    async function loadDeactivatedPatients() {
        try {
            const response = await fetch('/api/patients/deactivated', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.warn('Could not load deactivated patients');
                deactivatedPatients = [];
                return;
            }
            
            const data = await response.json();
            
            if (data.success && Array.isArray(data.patients)) {
                deactivatedPatients = data.patients;
                console.log(' Loaded', deactivatedPatients.length, 'deactivated patients');
            }
        } catch (error) {
            console.error('Error loading deactivated patients:', error);
            deactivatedPatients = [];
        }
    }
    
    // ========================================
    // DISPLAY FUNCTIONS
    // ========================================
    function displayPatients() {
        const resultsDiv = document.getElementById('patientsResults');
        if (!resultsDiv) {
            console.error(' Results div not found');
            return;
        }
        
        if (patientsData.length === 0) {
            resultsDiv.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No se encontraron pacientes</p>';
            return;
        }
        
        let html = '<table class="table" style="width: 100%; background: white; border-radius: 8px; overflow: hidden;">';
        html += '<thead><tr>';
        html += '<th>Nombre</th>';
        html += '<th>Documento</th>';
        html += '<th>Fecha Nac.</th>';
        html += '<th>Tel
        html += '<th>Acciones</th>';
        html += '</tr></thead><tbody>';
        
        patientsData.forEach(p => {
            html += '<tr>';
            html += `<td><strong>${escHtml(p.FullName)}</strong></td>`;
            html += `<td>${escHtml(p.DocumentID)}</td>`;
            html += `<td>${fmtDate(p.BirthDate)}</td>`;
            html += `<td>${escHtml(p.Phone || p.PhoneNumber || 'N/A')}</td>`;
            html += `<td>`;
            html += `<button class="btn btn-sm btn-primary" onclick="window.viewPat(${p.PatientID})" title="Ver detalles"> `;
            html += `<button class="btn btn-sm btn-warning" onclick="window.editPat(${p.PatientID})" title="Editar"> `;
            html += `<button class="btn btn-sm btn-danger" onclick="window.deletePat(${p.PatientID})" title="Desactivar">
            html += `</td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        resultsDiv.innerHTML = html;
    }
    
    // DISPLAY DEACTIVATED PATIENTS (NEW)
    function displayDeactivatedPatients() {
        const resultsDiv = document.getElementById('patientsResults');
        if (!resultsDiv) {
            console.error(' Results div not found');
            return;
        }
        
        if (deactivatedPatients.length === 0) {
            resultsDiv.innerHTML = '<div style="text-align: center; padding: 40px; background: white; border-radius: 8px;"><p style="color: #666; font-size: 16px;"> No hay pacientes desactivados</p></div>';
            return;
        }
        
        let html = '<div style="background: white; border-radius: 8px; padding: 20px;">';
        html += '<h3 style="color: #d9534f; margin-bottom: 20px;"> Pacientes Desactivados</h3>';
        html += '<table class="table">';
        html += '<thead><tr>';
        html += '<th>Nombre</th>';
        html += '<th>Documento</th>';
        html += '<th>Desactivado el</th>';
        html += '<th>Desactivado por</th>';
        html += '<th>Raz
        html += '<th>Acciones</th>';
        html += '</tr></thead><tbody>';
        
        deactivatedPatients.forEach(p => {
            html += '<tr>';
            html += `<td><strong>${escHtml(p.FullName)}</strong></td>`;
            html += `<td>${escHtml(p.DocumentID)}</td>`;
            html += `<td>${fmtDateTime(p.DeactivatedAt)}</td>`;
            html += `<td>${escHtml(p.DeactivatedByName || 'N/A')}</td>`;
            html += `<td style="max-width: 300px;">${escHtml(p.DeactivationReason || 'Sin raz
            html += `<td>`;
            html += `<button class="btn btn-sm btn-success" onclick="window.reactivatePat(${p.PatientID})" title="Reactivar">¸ Reactivar</button>`;
            html += `</td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        html += '</div>';
        resultsDiv.innerHTML = html;
    }
    
    // ========================================
    // PATIENT CRUD OPERATIONS
    // ========================================
    
    // View patient details
    // View patient details
    window.viewPat = async function(id) {
        try {
            const res = await fetch(`/api/patients/${id}`, {
                credentials: 'include'
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                alert('Error al cargar paciente');
                return;
            }
            
            const data = await res.json();
            
            if (!data.success) {
                alert('Error al cargar paciente');
                return;
            }
            
            const p = data.patient;
            const ins = data.insurance || [];
            const prescriptions = data.prescriptions || [];
            const purchaseHistory = [];
            
            let html = '<div style="max-width: 900px; margin: 0 auto;">';
            
            // Basic Info
            html += '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">';
            html += `<h3 style="margin: 0 0 10px 0;">${escHtml(p.FullName)}</h3>`;
            html += `<p style="margin: 5px 0;"><strong>Documento:</strong> ${escHtml(p.DocumentID)}</p>`;
            html += `<p style="margin: 5px 0;"><strong>Fecha Nac:</strong> ${fmtDate(p.BirthDate)} (${calculateAge(p.BirthDate)} a
            html += `<p style="margin: 5px 0;"><strong>Sexo:</strong> ${formatGender(p.Gender)}</p>`;
            html += `<p style="margin: 5px 0;"><strong>Tel ${escHtml(p.Phone || p.PhoneNumber || 'N/A')}</p>`;
            html += `<p style="margin: 5px 0;"><strong>Email:</strong> ${escHtml(p.Email || 'N/A')}</p>`;
            html += `<p style="margin: 5px 0;"><strong>Direcci ${escHtml(p.Address || 'N/A')}</p>`;
            html += '</div>';
            
            // Insurance Section
            html += '<div style="background: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">';
            html += '<h4 style="color: #155724; margin-top: 0;"> Seguros ';
            html += `<button onclick="window.addIns(${id})" class="btn btn-sm btn-success" style="float: right;"> Agregar Seguro</button>`;
            html += '</h4>';

            if (ins.length > 0) {
                html += '<table class="table" style="background: white; margin-top: 10px;">';
                html += '<thead><tr><th>Aseguradora</th><th>P
                html += '<tbody>';
                ins.forEach(insurance => {
                    const effectiveFrom = insurance.EffectiveFrom ? fmtDate(insurance.EffectiveFrom) : '-';
                    const effectiveTo = insurance.EffectiveTo ? fmtDate(insurance.EffectiveTo) : ';
                    const vigencia = `${effectiveFrom} - ${effectiveTo}`;
                    
                    const isActive = insurance.IsActive === 1 || insurance.IsActive === true;
                    const isExpired = insurance.EffectiveTo && new Date(insurance.EffectiveTo) < new Date();
                    const isNotStarted = insurance.EffectiveFrom && new Date(insurance.EffectiveFrom) > new Date();
                    
                    let statusBadge = '';
                    let canDelete = true;
                    
                    if (!isActive) {
                        statusBadge = '<span style="color: #6c757d;"> Inactivo</span>';
                        canDelete = false;
                    } else if (isExpired) {
                        statusBadge = '<span style="color: #dc3545;"> Vencido</span>';
                        canDelete = true;
                    } else if (isNotStarted) {
                        statusBadge = '<span style="color: #ffc107;"> Pendiente</span>';
                        canDelete = true;
                    } else {
                        statusBadge = '<span style="color: #28a745;"> Activo</span>';
                        canDelete = true;
                    }
                    
                    html += `<tr>`;
                    html += `<td><strong>${escHtml(insurance.InsuranceName)}</strong></td>`;
                    html += `<td>${escHtml(insurance.PolicyNumber)}</td>`;
                    html += `<td>${vigencia}</td>`;
                    html += `<td>${statusBadge}</td>`;
                    html += `<td style="white-space: nowrap;">`;
                    
                    if (isActive) {
                        html += `<button class="btn btn-sm btn-warning" onclick="window.editIns(${insurance.PatientInsuranceID}, ${id})"> `;
                        
                        if (canDelete) {
                            html += `<button class="btn btn-sm btn-danger" onclick="window.deleteIns(${insurance.PatientInsuranceID}, ${id})">
                        } else {
                            html += `<button class="btn btn-sm btn-secondary" disabled title="No se puede eliminar">
                        }
                    } else {
                        html += `<button class="btn btn-sm btn-secondary" disabled title="Inactivo"> `;
                        html += `<button class="btn btn-sm btn-secondary" disabled title="Inactivo">
                    }
                    
                    html += `</td>`;
                    html += `</tr>`;
                });
                html += '</tbody></table>';
            } else {
                html += '<p style="color: #666;">No tiene seguros registrados</p>';
            }
            html += '</div>';
            
            // Prescriptions Section (NEW)
            html += '<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">';
            html += '<h4 style="color: #856404; margin-top: 0;"> Recetas Activas ';
            html += `<button onclick="window.addRx(${id})" class="btn btn-sm btn-primary" style="float: right; background: #856404; border-color: #856404;"> Nueva Receta</button>`;
            html += '</h4>';
            
            if (prescriptions.length > 0) {
                html += '<div style="max-height: 400px; overflow-y: auto;">';
                html += '<table class="table table-sm" style="background: white; margin-top: 10px;">';
                html += '<thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Requerido</th><th> Retiro</th><th>Renovaciones</th><th>Acciones</th></tr></thead>';
                html += '<tbody>';
                prescriptions.forEach(rx => {
                    const requiredBy = rx.RequiredBy ? fmtDate(rx.RequiredBy) : '-';
                    const lastPickup = rx.LastPickupDate ? fmtDate(rx.LastPickupDate) : 'Nunca';
                    const refills = `${rx.RefillsRemaining || 0}/${rx.RefillsAllowed || 0}`;
                    
                    html += `<tr>`;
                    html += `<td><strong>${escHtml(rx.ProductName || 'N/A')}</strong></td>`;
                    html += `<td>${escHtml(rx.Dosage) || '-'}</td>`;
                    html += `<td>${escHtml(rx.Frequency) || '-'}</td>`;
                    html += `<td>${requiredBy}</td>`;
                    html += `<td>${lastPickup}</td>`;
                    html += `<td>${refills}</td>`;
                    html += `<td style="white-space: nowrap;">`;
                    if ((rx.RefillsRemaining || 0) > 0) {
                        html += `<button class="btn btn-xs btn-success" onclick="window.pickupRx(${rx.PrescriptionID}, ${id})" title="Registrar retiro"> `;
                    }
                    html += `<button class="btn btn-xs btn-warning" onclick="window.editRx(${rx.PrescriptionID}, ${id})" title="Editar"> `;
                    html += `<button class="btn btn-xs btn-danger" onclick="window.cancelRx(${rx.PrescriptionID}, ${id})" title="Cancelar">/button>`;
                    html += `</td>`;
                    html += `</tr>`;
                });
                html += '</tbody></table>';
                html += '</div>';
            } else {
                html += '<p style="color: #856404;">No tiene recetas activas</p>';
            }
            html += '</div>';
            
            // Purchase History Section (FIXED)
            html += '<div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 20px;">';
            html += '<h4 style="color: #0c5460; margin-top: 0;"> Historial de Compras</h4>';
            
            if (purchaseHistory && purchaseHistory.length > 0) {
                const totalSpent = purchaseHistory.reduce((sum, sale) => sum + parseFloat(sale.TotalAmount || 0), 0);
                html += '<table class="table table-sm" style="background: white; margin-top: 10px;">';
                html += '<thead><tr><th>Fecha</th><th>Productos</th><th>Total</th></tr></thead>';
                html += '<tbody>';
                purchaseHistory.forEach(sale => {
                    const products = sale.Products ? sale.Products.split(',') : [];
                    const productList = products.length > 0 ? products.join(', ') : '<em>Sin productos</em>';
                    html += `<tr>`;
                    html += `<td>${fmtDate(sale.SaleDate)}</td>`;
                    html += `<td>${productList}</td>`;
                    html += `<td>${fmtCurrency(sale.TotalAmount)}</td>`;
                    html += `</tr>`;
                });
                html += '</tbody></table>';
                html += `<p style="text-align: right; margin-top: 10px;"><strong>Total gastado:</strong> ${fmtCurrency(totalSpent)}</p>`;
            } else {
                html += '<p style="color: #666;">No tiene historial de compras</p>';
            }
            html += '</div>';
            
            html += '<div style="text-align: center; margin-top: 30px;">';
            html += '<button onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px;">Cerrar</button>';
            html += `<button onclick="window.closeModal(); window.editPat(${id})" class="btn btn-primary" style="margin: 5px;"> Editar Paciente</button>`;
            html += `<button onclick="window.deletePat(${id})" class="btn btn-danger" style="margin: 5px;"> Desactivar Paciente</button>`;
            html += '</div>';
            
            html += '</div>';
            
            showModal('Detalles del Paciente', html, '1000px');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar paciente');
        }
    };
    
    // Edit patient
    window.editPat = async function(id) {
        try {
            const res = await fetch(`/api/patients/${id}`, {
                credentials: 'include'
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                alert('Error al cargar paciente');
                return;
            }
            
            const data = await res.json();
            
            if (!data.success) {
                alert('Error al cargar paciente');
                return;
            }
            
            const p = data.patient;
            const birthDate = p.BirthDate ? p.BirthDate.split('T')[0] : '';
            
            let html = '<form onsubmit="window.savePat(event, ' + id + ')" style="max-width: 600px; margin: 0 auto;">';
            
            html += '<div class="form-group" style="margin-bottom: 15px;">';
            html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Nombre Completo *</label>';
            html += `<input type="text" id="editName" class="form-control" value="${escHtml(p.FullName)}" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += '</div>';
            
            html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
            
            html += '<div class="form-group" style="margin-bottom: 15px;">';
            html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Documento *</label>';
            html += `<input type="text" id="editDoc" class="form-control" value="${escHtml(p.DocumentID)}" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += '</div>';
            
            html += '<div class="form-group" style="margin-bottom: 15px;">';
            html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Fecha Nacimiento *</label>';
            html += `<input type="date" id="editBirth" class="form-control" value="${birthDate}" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += '</div>';
            
            html += '</div>';
            
            html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
            
            html += '<div class="form-group" style="margin-bottom: 15px;">';
            html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Sexo *</label>';
            html += '<select id="editGender" class="form-control" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
            html += `<option value="M" ${p.Gender === 'M' ? 'selected' : ''}>Masculino</option>`;
            html += `<option value="F" ${p.Gender === 'F' ? 'selected' : ''}>Femenino</option>`;
            html += '</select>';
            html += '</div>';
            
            html += '<div class="form-group" style="margin-bottom: 15px;">';
            html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Tel
            html += `<input type="tel" id="editPhone" class="form-control" value="${escHtml(p.Phone || p.PhoneNumber || '')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += '</div>';
            
            html += '</div>';
            
            html += '<div class="form-group" style="margin-bottom: 15px;">';
            html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Email</label>';
            html += `<input type="email" id="editEmail" class="form-control" value="${escHtml(p.Email || '')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += '</div>';
            
            html += '<div class="form-group" style="margin-bottom: 15px;">';
            html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Direcci
            html += `<textarea id="editAddr" class="form-control" rows="2" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${escHtml(p.Address || '')}</textarea>`;
            html += '</div>';
            
            html += '<div style="text-align: center; margin-top: 30px;">';
            html += '<button type="button" onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px; padding: 10px 20px;">Cancelar</button>';
            html += '<button type="submit" class="btn btn-primary" style="margin: 5px; padding: 10px 20px; background: #007bff; color: white;"> Guardar Cambios</button>';
            html += '</div>';
            
            html += '</form>';
            
            showModal('Editar Paciente', html, '700px');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar paciente');
        }
    };
    
    // Save patient (update)
    window.savePat = async function(event, id) {
        event.preventDefault();
        
        const patientData = {
            fullName: document.getElementById('editName').value.trim(),
            documentId: document.getElementById('editDoc').value.trim(),
            birthDate: document.getElementById('editBirth').value,
            gender: document.getElementById('editGender').value,
            phone: document.getElementById('editPhone')?.value.trim() || null,
            email: document.getElementById('editEmail')?.value.trim() || null,
            address: document.getElementById('editAddr')?.value.trim() || null
        };
        
        try {
            const res = await fetch(`/api/patients/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(patientData)
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                alert(' Error al actualizar paciente');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Paciente actualizado exitosamente');
                window.closeModal();
                await loadPatients();
                window.viewPat(id);
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al actualizar paciente');
        }
    };
    
    // Delete patient (DEACTIVATE WITH MODAL - NEW)
    window.deletePat = function(id) {
        const patient = allPatients.find(p => p.PatientID === id) || {};
        const patientName = escHtml(patient.FullName || 'este paciente');
        
        let html = '<form onsubmit="window.confirmDeactivation(event, ' + id + ')" style="max-width: 600px; margin: 0 auto;">';
        
        html += '<div class="alert alert-warning" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px;">';
        html += '<p style="margin: 0; font-size: 14px;">  <strong>Atenci Est a punto de desactivar a <strong>' + patientName + '</strong>.</p>';
        html += '<p style="margin: 10px 0 0 0; font-size: 13px;">Esta acci quedar registrada en el sistema de auditor con su usuario y la fecha/hora actual.</p>';
        html += '</div>';
        
        html += '<div class="form-group" style="margin-bottom: 20px;">';
        html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Justificaci de la Desactivaci *</label>';
        html += '<textarea id="deactivationReason" class="form-control" rows="4" required minlength="10" ';
        html += 'placeholder="Por favor explique la raz de la desactivaci (m 10 caracteres)..." ';
        html += 'style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px; resize: vertical;"></textarea>';
        html += '<small style="color: #666; display: block; margin-top: 5px;">M 10 caracteres requeridos</small>';
        html += '</div>';
        
        html += '<div class="audit-info">';
        html += '<p style="margin: 5px 0;"><strong>Desactivado por:</strong> ' + escHtml(currentUser?.username || 'Usuario actual') + '</p>';
        html += '<p style="margin: 5px 0;"><strong>Fecha y hora:</strong> ' + fmtDateTime(new Date().toISOString()) + '</p>';
        html += '</div>';
        
        html += '<div style="text-align: center; margin-top: 30px;">';
        html += '<button type="button" onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px; padding: 10px 25px;">Cancelar</button>';
        html += '<button type="submit" class="btn btn-danger" style="margin: 5px; padding: 10px 25px;"> Desactivar Paciente</button>';
        html += '</div>';
        
        html += '</form>';
        
        showModal('  Desactivar Paciente', html, '650px');
    };
    
    window.confirmDeactivation = async function(event, id) {
        event.preventDefault();
        
        const reason = document.getElementById('deactivationReason').value.trim();
        
        if (reason.length < 10) {
            alert('La justificaci debe tener al menos 10 caracteres');
            return;
        }
        
        try {
            const res = await fetch(`/api/patients/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason: reason })
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                alert(' Error al desactivar paciente');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Paciente desactivado exitosamente');
                window.closeModal();
                await loadPatients();
                await loadDeactivatedPatients();
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al desactivar paciente');
        }
    };
    
    // Add new patient
    window.addNewPat = function() {
        let html = '<form onsubmit="window.createPat(event)" style="max-width: 600px; margin: 0 auto;">';
        
        html += '<div class="form-group" style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Nombre Completo *</label>';
        html += '<input type="text" id="newName" class="form-control" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
        html += '</div>';
        
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
        
        html += '<div class="form-group" style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Documento *</label>';
        html += '<input type="text" id="newDoc" class="form-control" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
        html += '</div>';
        
        html += '<div class="form-group" style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Fecha Nacimiento *</label>';
        html += '<input type="date" id="newBirth" class="form-control" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
        html += '</div>';
        
        html += '</div>';
        
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
        
        html += '<div class="form-group" style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Sexo *</label>';
        html += '<select id="newGender" class="form-control" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
        html += '<option value="">Seleccione...</option>';
        html += '<option value="M">Masculino</option>';
        html += '<option value="F">Femenino</option>';
        html += '</select>';
        html += '</div>';
        
        html += '<div class="form-group" style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Tel
        html += '<input type="tel" id="newPhone" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
        html += '</div>';
        
        html += '</div>';
        
        html += '<div class="form-group" style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Email</label>';
        html += '<input type="email" id="newEmail" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
        html += '</div>';
        
        html += '<div class="form-group" style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Direcci
        html += '<textarea id="newAddr" class="form-control" rows="2" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>';
        html += '</div>';
        
        html += '<div style="text-align: center; margin-top: 30px;">';
        html += '<button type="button" onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px; padding: 10px 20px;">Cancelar</button>';
        html += '<button type="submit" class="btn btn-success" style="margin: 5px; padding: 10px 20px; background: #28a745; color: white;"> Crear Paciente</button>';
        html += '</div>';
        
        html += '</form>';
        
        showModal('Nuevo Paciente', html, '700px');
    };
    
    // Create new patient
    window.createPat = async function(event) {
        event.preventDefault();
        
        const patientData = {
            fullName: document.getElementById('newName').value.trim(),
            documentId: document.getElementById('newDoc').value.trim(),
            birthDate: document.getElementById('newBirth').value,
            gender: document.getElementById('newGender').value,
            phone: document.getElementById('newPhone')?.value.trim() || null,
            email: document.getElementById('newEmail')?.value.trim() || null,
            address: document.getElementById('newAddr')?.value.trim() || null
        };
        
        try {
            const res = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(patientData)
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                const errorData = await res.json();
                alert(' Error: ' + (errorData.message || 'No se pudo crear el paciente'));
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Paciente creado exitosamente');
                window.closeModal();
                await loadPatients();
                if (result.patientId) {
                    window.viewPat(result.patientId);
                }
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al crear paciente');
        }
    };
    
    // REACTIVATE PATIENT (NEW)
    window.reactivatePat = async function(patientId) {
        const patient = deactivatedPatients.find(p => p.PatientID === patientId) || {};
        const patientName = patient.FullName || 'este paciente';
        
        if (!confirm(`t seguro que desea reactivar a ${patientName}?`)) {
            return;
        }
        
        try {
            const res = await fetch(`/api/patients/${patientId}/reactivate`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                alert(' Error al reactivar paciente');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Paciente reactivado exitosamente');
                await loadPatients();
                await loadDeactivatedPatients();
                displayDeactivatedPatients();
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al reactivar paciente');
        }
    };
    
console.log(' Patients module loaded - Part 2/2 (CRUD operations)');
    
// This is the last section - it ends with })();

    // ========================================
    // INSURANCE MANAGEMENT
    // ========================================
    
    // Add insurance
    window.addIns = function(patientId) {
        if (!insuranceProviders || insuranceProviders.length === 0) {
            alert('  No hay proveedores de seguro disponibles en el sistema');
            return;
        }
        
        let html = '<form onsubmit="window.saveIns(event, ' + patientId + ')" style="max-width: 500px; margin: 0 auto;">';
        
        html += '<div class="form-group" style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Aseguradora *</label>';
        html += '<select id="insProvider" class="form-control" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
        html += '<option value="">Seleccione...</option>';
        insuranceProviders.forEach(p => {
            html += `<option value="${p.InsuranceProviderID}">${escHtml(p.Name)}</option>`;
        });
        html += '</select>';
        html += '</div>';
        
        html += '<div class="form-group" style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">N de P *</label>';
        html += '<input type="text" id="insPolicy" class="form-control" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
        html += '</div>';
        
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
        
        html += '<div class="form-group" style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Vigencia Desde</label>';
        html += '<input type="date" id="insFrom" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
        html += '</div>';
        
        html += '<div class="form-group" style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Vigencia Hasta</label>';
        html += '<input type="date" id="insTo" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
        html += '</div>';
        
        html += '</div>';
        
        html += '<div style="text-align: center; margin-top: 30px;">';
        html += '<button type="button" onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px; padding: 10px 20px;">Cancelar</button>';
        html += '<button type="submit" class="btn btn-primary" style="margin: 5px; padding: 10px 20px; background: #007bff; color: white;"> Agregar Seguro</button>';
        html += '</div>';
        
        html += '</form>';
        
        showModal(' Agregar Seguro', html, '600px');
    };
    
    // Save insurance
    window.saveIns = async function(event, patientId) {
        event.preventDefault();
        
        const insuranceData = {
            insuranceProviderId: document.getElementById('insProvider').value,
            policyNumber: document.getElementById('insPolicy').value.trim(),
            effectiveFrom: document.getElementById('insFrom').value || null,
            effectiveTo: document.getElementById('insTo').value || null
        };
        
        try {
            const res = await fetch(`/api/patients/${patientId}/insurance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(insuranceData)
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                alert(' Error al agregar seguro');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Seguro agregado exitosamente');
                window.closeModal();
                window.viewPat(patientId);
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al agregar seguro');
        }
    };
    
    // Edit insurance
    window.editIns = async function(insuranceId, patientId) {
        try {
            const res = await fetch(`/api/patients/${patientId}`, {
                credentials: 'include'
            });
            
            if (!res.ok) {
                alert('Error al cargar datos');
                return;
            }
            
            const data = await res.json();
            const insurance = data.insurance.find(i => i.PatientInsuranceID === insuranceId);
            
            if (!insurance) {
                alert('Seguro no encontrado');
                return;
            }
            
            const effectiveFrom = insurance.EffectiveFrom ? insurance.EffectiveFrom.split('T')[0] : '';
            const effectiveTo = insurance.EffectiveTo ? insurance.EffectiveTo.split('T')[0] : '';
            
            let html = '<form onsubmit="window.updateIns(event, ' + insuranceId + ', ' + patientId + ')" style="max-width: 500px; margin: 0 auto;">';
            
            html += '<div class="form-group" style="margin-bottom: 15px;">';
            html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Aseguradora *</label>';
            html += '<select id="editInsProvider" class="form-control" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
            insuranceProviders.forEach(p => {
                const selected = p.InsuranceProviderID === insurance.InsuranceProviderID ? 'selected' : '';
                html += `<option value="${p.InsuranceProviderID}" ${selected}>${escHtml(p.Name)}</option>`;
            });
            html += '</select>';
            html += '</div>';
            
            html += '<div class="form-group" style="margin-bottom: 15px;">';
            html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">N de P *</label>';
            html += `<input type="text" id="editInsPolicy" class="form-control" value="${escHtml(insurance.PolicyNumber)}" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += '</div>';
            
            html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
            
            html += '<div class="form-group" style="margin-bottom: 15px;">';
            html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Vigencia Desde</label>';
            html += `<input type="date" id="editInsFrom" class="form-control" value="${effectiveFrom}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += '</div>';
            
            html += '<div class="form-group" style="margin-bottom: 15px;">';
            html += '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Vigencia Hasta</label>';
            html += `<input type="date" id="editInsTo" class="form-control" value="${effectiveTo}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += '</div>';
            
            html += '</div>';
            
            html += '<div style="text-align: center; margin-top: 30px;">';
            html += '<button type="button" onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px; padding: 10px 20px;">Cancelar</button>';
            html += '<button type="submit" class="btn btn-primary" style="margin: 5px; padding: 10px 20px; background: #007bff; color: white;"> Actualizar Seguro</button>';
            html += '</div>';
            
            html += '</form>';
            
            showModal('Editar Seguro', html, '600px');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar seguro');
        }
    };
    
    // Update insurance
    window.updateIns = async function(event, insuranceId, patientId) {
        event.preventDefault();
        
        const insuranceData = {
            insuranceProviderId: document.getElementById('editInsProvider').value,
            policyNumber: document.getElementById('editInsPolicy').value.trim(),
            effectiveFrom: document.getElementById('editInsFrom').value || null,
            effectiveTo: document.getElementById('editInsTo').value || null
        };
        
        try {
            const res = await fetch(`/api/patients/insurance/${insuranceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(insuranceData)
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                alert(' Error al actualizar seguro');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Seguro actualizado exitosamente');
                window.closeModal();
                window.viewPat(patientId);
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al actualizar seguro');
        }
    };
    
    // Delete insurance
    window.deleteIns = async function(insuranceId, patientId) {
        if (!confirm('t seguro que desea eliminar este seguro?')) {
            return;
        }
        
        try {
            const res = await fetch(`/api/patients/insurance/${insuranceId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                alert(' Error al eliminar seguro');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Seguro eliminado exitosamente');
                window.viewPat(patientId);
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al eliminar seguro');
        }
    };
    
    // ========================================
    // PRESCRIPTION MANAGEMENT (NEW - FIXED)
    // ========================================
    
    // Add prescription (FIXED)
    window.addRx = function(patientId) {
        if (!allProducts || allProducts.length === 0) {
            alert('  No hay productos disponibles para recetar.\n\nPor favor, agregue productos al inventario primero.');
            return;
        }
        
        if (!prescribers || prescribers.length === 0) {
            alert('  No hay doctores prescriptores disponibles.\n\nPor favor, agregue prescriptores al sistema primero.');
            return;
        }
        
        let html = '<form onsubmit="window.saveRx(event, ' + patientId + ')" style="max-width: 700px; margin: 0 auto;">';
        
        html += '<div class="form-group" style="margin-bottom: 20px;">';
        html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Medicamento *</label>';
        html += '<select id="rxProduct" class="form-control" required style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">';
        html += '<option value="">-- Seleccione medicamento --</option>';
        allProducts.forEach(p => {
            html += `<option value="${p.ProductID}">${escHtml(p.Name || p.ProductName)}</option>`;
        });
        html += '</select>';
        html += '</div>';
        
        html += '<div class="form-group" style="margin-bottom: 20px;">';
        html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Doctor Prescriptor *</label>';
        html += '<select id="rxPrescriber" class="form-control" required style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">';
        html += '<option value="">-- Seleccione doctor --</option>';
        prescribers.forEach(pr => {
            html += `<option value="${pr.PrescriberID}">${escHtml(pr.FullName || pr.Name)}</option>`;
        });
        html += '</select>';
        html += '</div>';
        
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">';
        
        html += '<div class="form-group">';
        html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Fecha de Receta *</label>';
        html += '<input type="date" id="rxDate" class="form-control" required value="' + new Date().toISOString().split('T')[0] + '" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">';
        html += '</div>';
        
        html += '<div class="form-group">';
        html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Requerido Para</label>';
        html += '<input type="date" id="rxRequiredBy" class="form-control" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">';
        html += '<small style="color: #666; display: block; margin-top: 3px;">Fecha l para adquirir</small>';
        html += '</div>';
        
        html += '</div>';
        
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">';
        
        html += '<div class="form-group">';
        html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Dosis</label>';
        html += '<input type="text" id="rxDosage" class="form-control" placeholder="Ej: 500mg, 1 tableta" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">';
        html += '<small style="color: #666; display: block; margin-top: 3px;">Cantidad por toma</small>';
        html += '</div>';
        
        html += '<div class="form-group">';
        html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Frecuencia</label>';
        html += '<input type="text" id="rxFrequency" class="form-control" placeholder="Ej: Cada 8 horas, 3 veces al d style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">';
        html += '<small style="color: #666; display: block; margin-top: 3px;">Con qu frecuencia tomar</small>';
        html += '</div>';
        
        html += '</div>';
        
        html += '<div class="form-group" style="margin-bottom: 20px;">';
        html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Renovaciones Permitidas</label>';
        html += '<input type="number" id="rxRefills" class="form-control" min="0" max="12" value="0" style="width: 150px; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">';
        html += '<small style="color: #666; display: block; margin-top: 3px;">Cu veces puede retirar el medicamento (0-12)</small>';
        html += '</div>';
        
        html += '<div class="form-group" style="margin-bottom: 20px;">';
        html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Notas Adicionales</label>';
        html += '<textarea id="rxNotes" class="form-control" rows="3" placeholder="Instrucciones especiales, advertencias, o informaci adicional..." style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px; resize: vertical;"></textarea>';
        html += '</div>';
        
        html += '<div style="background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; border-radius: 4px; margin-bottom: 20px;">';
        html += '<p style="margin: 0; font-size: 13px; color: #0c5460;"><strong>¸ Informaci Esta receta quedar registrada como "Activa" y aparecer en el perfil del paciente. Puede editarla o cancelarla despu si es necesario.</p>';
        html += '</div>';
        
        html += '<div style="text-align: center; margin-top: 30px;">';
        html += '<button type="button" onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px; padding: 12px 25px;">Cancelar</button>';
        html += '<button type="submit" class="btn btn-primary" style="margin: 5px; padding: 12px 25px; background: #856404; border-color: #856404; color: white;"> Agregar Receta</button>';
        html += '</div>';
        
        html += '</form>';
        
        showModal(' Nueva Receta M html, '750px');
    };
    
    // Save prescription
    window.saveRx = async function(event, patientId) {
        event.preventDefault();
        
        const prescriptionData = {
            productId: document.getElementById('rxProduct').value,
            prescriberId: document.getElementById('rxPrescriber').value,
            prescriptionDate: document.getElementById('rxDate').value,
            requiredBy: document.getElementById('rxRequiredBy').value || null,
            dosage: document.getElementById('rxDosage').value.trim() || null,
            frequency: document.getElementById('rxFrequency').value.trim() || null,
            refillsAllowed: parseInt(document.getElementById('rxRefills').value) || 0,
            notes: document.getElementById('rxNotes').value.trim() || null
        };
        
        try {
            const res = await fetch(`/api/patients/${patientId}/prescriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(prescriptionData)
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                alert(' Error al agregar receta');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Receta agregada exitosamente');
                window.closeModal();
                window.viewPat(patientId);
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al agregar receta');
        }
    };
    
    // Edit prescription
    window.editRx = async function(prescriptionId, patientId) {
        try {
            const res = await fetch(`/api/patients/${patientId}`, {
                credentials: 'include'
            });
            
            if (!res.ok) {
                alert('Error al cargar datos');
                return;
            }
            
            const data = await res.json();
            const rx = (data.prescriptions || []).find(p => p.PrescriptionID === prescriptionId);
            
            if (!rx) {
                alert('Receta no encontrada');
                return;
            }
            
            const prescriptionDate = rx.PrescriptionDate ? rx.PrescriptionDate.split('T')[0] : '';
            const requiredBy = rx.RequiredBy ? rx.RequiredBy.split('T')[0] : '';
            
            let html = '<form onsubmit="window.updateRx(event, ' + prescriptionId + ', ' + patientId + ')" style="max-width: 700px; margin: 0 auto;">';
            
            html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">';
            html += '<p style="margin: 5px 0;"><strong>Medicamento:</strong> ' + escHtml(rx.ProductName || 'N/A') + '</p>';
            html += '<p style="margin: 5px 0;"><strong>Doctor:</strong> ' + escHtml(rx.PrescriberName || 'N/A') + '</p>';
            html += '<p style="margin: 5px 0;"><strong>Fecha Receta:</strong> ' + fmtDate(rx.PrescriptionDate) + '</p>';
            if (rx.LastPickupDate) {
                html += '<p style="margin: 5px 0;"><strong> Retiro:</strong> ' + fmtDate(rx.LastPickupDate) + '</p>';
            }
            html += '<p style="margin: 5px 0;"><strong>Renovaciones Restantes:</strong> ' + (rx.RefillsRemaining || 0) + ' de ' + (rx.RefillsAllowed || 0) + '</p>';
            html += '</div>';
            
            html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">';
            
            html += '<div class="form-group">';
            html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Dosis</label>';
            html += `<input type="text" id="editRxDosage" class="form-control" value="${escHtml(rx.Dosage || '')}" placeholder="Ej: 500mg, 1 tableta" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">`;
            html += '</div>';
            
            html += '<div class="form-group">';
            html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Frecuencia</label>';
            html += `<input type="text" id="editRxFrequency" class="form-control" value="${escHtml(rx.Frequency || '')}" placeholder="Ej: Cada 8 horas" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">`;
            html += '</div>';
            
            html += '</div>';
            
            html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">';
            
            html += '<div class="form-group">';
            html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Renovaciones Permitidas</label>';
            html += `<input type="number" id="editRxRefills" class="form-control" min="0" max="12" value="${rx.RefillsAllowed || 0}" style="width: 150px; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">`;
            html += '</div>';
            
            html += '<div class="form-group">';
            html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Requerido Para</label>';
            html += `<input type="date" id="editRxRequiredBy" class="form-control" value="${requiredBy}" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">`;
            html += '</div>';
            
            html += '</div>';
            
            html += '<div class="form-group" style="margin-bottom: 20px;">';
            html += '<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Notas Adicionales</label>';
            html += `<textarea id="editRxNotes" class="form-control" rows="3" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px; resize: vertical;">${escHtml(rx.Notes || '')}</textarea>`;
            html += '</div>';
            
            html += '<div style="text-align: center; margin-top: 30px;">';
            html += '<button type="button" onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px; padding: 12px 25px;">Cancelar</button>';
            html += '<button type="submit" class="btn btn-primary" style="margin: 5px; padding: 12px 25px; background: #856404; border-color: #856404; color: white;"> Actualizar Receta</button>';
            html += '</div>';
            
            html += '</form>';
            
            showModal('Editar Receta', html, '750px');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar receta');
        }
    };
    
    // Update prescription
    window.updateRx = async function(event, prescriptionId, patientId) {
        event.preventDefault();
        
        const prescriptionData = {
            dosage: document.getElementById('editRxDosage').value.trim() || null,
            frequency: document.getElementById('editRxFrequency').value.trim() || null,
            refillsAllowed: parseInt(document.getElementById('editRxRefills').value) || 0,
            requiredBy: document.getElementById('editRxRequiredBy').value || null,
            notes: document.getElementById('editRxNotes').value.trim() || null
        };
        
        try {
            const res = await fetch(`/api/patients/prescriptions/${prescriptionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(prescriptionData)
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                alert(' Error al actualizar receta');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Receta actualizada exitosamente');
                window.closeModal();
                window.viewPat(patientId);
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al actualizar receta');
        }
    };
    
    // Pickup prescription
    window.pickupRx = async function(prescriptionId, patientId) {
        if (!confirm('nfirmar retiro de medicamento?\n\nEsto disminuir las renovaciones restantes en 1.')) {
            return;
        }
        
        try {
            const res = await fetch(`/api/patients/prescriptions/${prescriptionId}/pickup`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                alert(' Error al registrar retiro');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Retiro registrado exitosamente');
                window.viewPat(patientId);
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al registrar retiro');
        }
    };
    
    // Cancel prescription
    window.cancelRx = async function(prescriptionId, patientId) {
        if (!confirm('t seguro que desea cancelar esta receta?')) {
            return;
        }
        
        try {
            const res = await fetch(`/api/patients/prescriptions/${prescriptionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (res.status === 401) {
                alert(' Sesi expirada');
                window.location.href = '/index.html';
                return;
            }
            
            if (!res.ok) {
                alert(' Error al cancelar receta');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Receta cancelada exitosamente');
                window.viewPat(patientId);
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al cancelar receta');
        }
    };
    
    // ========================================
    // MODAL HELPERS
    // ========================================
    function showModal(title, bodyHtml, width = '600px') {
        let modal = document.getElementById('dynamicModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dynamicModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: ${width}; width: 90%;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="btn-close" onclick="window.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${bodyHtml}
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
        
        modal.onclick = function(event) {
            if (event.target === modal) {
                window.closeModal();
            }
        };
    }
    
    window.closeModal = function() {
        const modal = document.getElementById('dynamicModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };
    
    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    function escHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function fmtDate(dateStr) {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    function fmtDateTime(dateStr) {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    
    function fmtCurrency(amount) {
        return new Intl.NumberFormat('es-CR', {
            style: 'currency',
            currency: 'CRC',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    function formatGender(g) {
        return g === 'M' ? 'Masculino' : g === 'F' ? 'Femenino' : 'N/A';
    }
    
    function calculateAge(birthDate) {
        if (!birthDate) return 'N/A';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }
    
})();