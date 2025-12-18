(function() {
    'use strict';
    
    // ========================================
    // VARIABLES
    // ========================================
    let allDoctors = [];
    let doctorsData = [];
    let insuranceProviders = [];
    let discountRates = [];
    let currentUser = null;
    
    console.log(' Doctors module starting...');
    
    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    async function init() {
        console.log(' Initializing doctors module...');
        
        // Initialize user info in sidebar
        currentUser = await initUserInfo();
        if (!currentUser) return;
        
        // Setup logout button
        setupLogout();
        
        // Setup search functionality
        setupSearch();
        
        // Load data
        await loadAllData();
        
        // Setup add doctor button
        setupAddDoctorButton();
    }
    
    // ========================================
    // USER INFO
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
        const searchBtn = document.getElementById('searchBtn');
        const nameInput = document.getElementById('searchName');
        const specialtySelect = document.getElementById('searchSpecialty');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', performSearch);
        }
        
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') performSearch();
            });
        }
        
        if (specialtySelect) {
            specialtySelect.addEventListener('change', performSearch);
        }
    }
    
    function performSearch() {
        const nameInput = document.getElementById('searchName');
        const specialtySelect = document.getElementById('searchSpecialty');
        
        const nameSearch = nameInput?.value.trim().toLowerCase() || '';
        const specialtySearch = specialtySelect?.value || '';
        
        if (!nameSearch && !specialtySearch) {
            doctorsData = [...allDoctors];
        } else {
            doctorsData = allDoctors.filter(d => {
                const matchName = !nameSearch || d.FullName.toLowerCase().includes(nameSearch);
                const matchSpecialty = !specialtySearch || d.Specialty === specialtySearch;
                return matchName && matchSpecialty;
            });
        }
        
        displayDoctors();
    }
    
    function setupAddDoctorButton() {
        const addBtn = document.getElementById('addDoctorBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => window.addDoctor());
        }
    }
    
    // ========================================
    // DATA LOADING
    // ========================================
    async function loadAllData() {
        await loadDoctors();
        await loadInsuranceProviders();
        await loadDiscountRates();
        updateStats();
    }
    
    async function loadDoctors() {
        try {
            console.log(' Loading doctors...');
            const response = await fetch('/api/doctors', {
                credentials: 'include'
            });
            
            if (response.status === 401) {
                alert('Tu sesi ha expirado. Por favor inicia sesi nuevamente.');
                window.location.href = '/index.html';
                return;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && Array.isArray(data.doctors)) {
                allDoctors = data.doctors;
                doctorsData = [...allDoctors];
                console.log(' Loaded', allDoctors.length, 'doctors');
                displayDoctors();
            } else {
                allDoctors = [];
                doctorsData = [];
                displayDoctors();
            }
            
        } catch (error) {
            console.error(' Error loading doctors:', error);
            alert('Error al cargar doctores. Por favor recarga la p
        }
    }
    
    async function loadInsuranceProviders() {
        try {
            const response = await fetch('/api/patients/insurance/providers', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.providers)) {
                    insuranceProviders = data.providers;
                    console.log(' Loaded', insuranceProviders.length, 'insurance providers');
                }
            }
        } catch (error) {
            console.warn('Insurance providers not loaded:', error);
            insuranceProviders = [];
        }
    }
    
    async function loadDiscountRates() {
        try {
            const response = await fetch('/api/doctors/discounts/rates', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.discountRates)) {
                    discountRates = data.discountRates;
                    console.log(' Loaded', discountRates.length, 'discount rates');
                    displayDiscountRates();
                }
            }
        } catch (error) {
            console.warn('Discount rates not loaded:', error);
            discountRates = [];
        }
    }
    
    // ========================================
    // DISPLAY FUNCTIONS
    // ========================================
    function updateStats() {
        const totalDoctorsElem = document.getElementById('totalDoctors');
        const totalPartnershipsElem = document.getElementById('totalPartnerships');
        const totalPrescriptionsElem = document.getElementById('totalPrescriptions');
        const avgDiscountElem = document.getElementById('avgDiscount');
        
        if (totalDoctorsElem) {
            totalDoctorsElem.textContent = allDoctors.length;
        }
        
        if (totalPartnershipsElem) {
            const partnerships = allDoctors.reduce((sum, d) => sum + (d.InsuranceCount || 0), 0);
            totalPartnershipsElem.textContent = partnerships;
        }
        
        if (totalPrescriptionsElem) {
            const prescriptions = allDoctors.reduce((sum, d) => sum + (d.PrescriptionCount || 0), 0);
            totalPrescriptionsElem.textContent = prescriptions;
        }
        
        if (avgDiscountElem && discountRates.length > 0) {
            const avgDiscount = discountRates.reduce((sum, dr) => sum + parseFloat(dr.DiscountPercentage), 0) / discountRates.length;
            avgDiscountElem.textContent = avgDiscount.toFixed(1) + '%';
        }
    }
    
    function displayDoctors() {
        const resultsDiv = document.getElementById('doctorsResults');
        if (!resultsDiv) {
            console.error(' Results div not found');
            return;
        }
        
        if (doctorsData.length === 0) {
            resultsDiv.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No se encontraron doctores</p>';
            return;
        }
        
        let html = '<table class="table" style="width: 100%; background: white; border-radius: 8px; overflow: hidden;">';
        html += '<thead><tr>';
        html += '<th>Nombre</th>';
        html += '<th>Licencia</th>';
        html += '<th>Especialidad</th>';
        html += '<th>Tel
        html += '<th>Email</th>';
        html += '<th>Seguros</th>';
        html += '<th>Recetas</th>';
        html += '<th>Acciones</th>';
        html += '</tr></thead><tbody>';
        
        doctorsData.forEach(d => {
            html += '<tr>';
            html += `<td><strong>${escHtml(d.FullName)}</strong></td>`;
            html += `<td>${escHtml(d.LicenseNumber)}</td>`;
            html += `<td>${escHtml(d.Specialty)}</td>`;
            html += `<td>${escHtml(d.Phone || 'N/A')}</td>`;
            html += `<td>${escHtml(d.Email || 'N/A')}</td>`;
            html += `<td><span class="badge badge-info">${d.InsuranceCount || 0}</span></td>`;
            html += `<td><span class="badge badge-success">${d.PrescriptionCount || 0}</span></td>`;
            html += `<td style="white-space: nowrap;">`;
            html += `<button class="btn btn-sm btn-primary" onclick="window.viewDoctor(${d.PrescriberID})" title="Ver detalles"> `;
            html += `<button class="btn btn-sm btn-warning" onclick="window.editDoctor(${d.PrescriberID})" title="Editar"> `;
            html += `<button class="btn btn-sm btn-danger" onclick="window.deactivateDoctor(${d.PrescriberID})" title="Desactivar">
            html += `</td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        resultsDiv.innerHTML = html;
    }
    
    function displayDiscountRates() {
        const section = document.getElementById('discountRatesSection');
        if (!section) return;
        
        if (discountRates.length === 0) {
            section.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay tarifas configuradas</p>';
            return;
        }
        
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">';
        
        discountRates.forEach(dr => {
            html += '<div style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 15px;">';
            html += `<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">`;
            html += `<h4 style="margin: 0; color: #333;">${escHtml(dr.InsuranceName)}</h4>`;
            html += `<button class="btn btn-xs btn-primary" onclick="window.editDiscountRate(${dr.InsuranceProviderID}, '${escHtml(dr.InsuranceName)}', ${dr.DiscountPercentage}, ${dr.MinimumPrescriptionAmount || 0}, ${dr.MaximumDiscountAmount || 0})">
            html += `</div>`;
            html += `<div style="font-size: 32px; font-weight: bold; color: #28a745; margin: 10px 0;">${dr.DiscountPercentage}%</div>`;
            html += `<div style="font-size: 13px; color: #666;">`;
            if (dr.MinimumPrescriptionAmount > 0) {
                html += `<div> M ${fmtCurrency(dr.MinimumPrescriptionAmount)}</div>`;
            }
            if (dr.MaximumDiscountAmount > 0) {
                html += `<div> M ${fmtCurrency(dr.MaximumDiscountAmount)}</div>`;
            }
            if (dr.Description) {
                html += `<div style="margin-top: 5px; font-style: italic;">${escHtml(dr.Description)}</div>`;
            }
            html += `</div>`;
            html += '</div>';
        });
        
        html += '</div>';
        section.innerHTML = html;
    }
    
    // ========================================
    // DOCTOR CRUD OPERATIONS
    // ========================================
    
    // View doctor details
    window.viewDoctor = async function(id) {
        try {
            const res = await fetch(`/api/doctors/${id}`, {
                credentials: 'include'
            });
            
            if (!res.ok) {
                alert('Error al cargar doctor');
                return;
            }
            
            const data = await res.json();
            if (!data.success) {
                alert('Error al cargar doctor');
                return;
            }
            
            const d = data.doctor;
            const insurance = data.insurance || [];
            const stats = data.stats || {};
            
            let html = '<div style="max-width: 800px; margin: 0 auto;">';
            
            // Basic Info
            html += '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">';
            html += `<h3 style="margin: 0 0 10px 0;">${escHtml(d.FullName)}</h3>`;
            html += `<p style="margin: 5px 0;"><strong>Licencia:</strong> ${escHtml(d.LicenseNumber)}</p>`;
            html += `<p style="margin: 5px 0;"><strong>DEA:</strong> ${escHtml(d.DEANumber || 'N/A')}</p>`;
            html += `<p style="margin: 5px 0;"><strong>Especialidad:</strong> ${escHtml(d.Specialty)}</p>`;
            html += `<p style="margin: 5px 0;"><strong>Tel ${escHtml(d.Phone || 'N/A')}</p>`;
            html += `<p style="margin: 5px 0;"><strong>Email:</strong> ${escHtml(d.Email || 'N/A')}</p>`;
            html += '</div>';
            
            // Statistics
            html += '<div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">';
            html += '<h4 style="color: #1976d2; margin-top: 0;"> Estad
            html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">';
            html += `<div style="text-align: center;"><div style="font-size: 24px; font-weight: bold; color: #1976d2;">${stats.TotalPrescriptions || 0}</div><div style="color: #666; font-size: 14px;">Recetas Totales</div></div>`;
            html += `<div style="text-align: center;"><div style="font-size: 24px; font-weight: bold; color: #1976d2;">${stats.ActivePrescriptions || 0}</div><div style="color: #666; font-size: 14px;">Recetas Activas</div></div>`;
            html += `<div style="text-align: center;"><div style="font-size: 24px; font-weight: bold; color: #1976d2;">${stats.UniquePatients || 0}</div><div style="color: #666; font-size: 14px;">Pacientes</div></div>`;
            html += '</div>';
            if (stats.LastPrescriptionDate) {
                html += `<p style="margin: 15px 0 0 0; text-align: center; color: #666;"> receta: ${fmtDate(stats.LastPrescriptionDate)}</p>`;
            }
            html += '</div>';
            
            // Insurance Partnerships
            html += '<div style="background: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">';
            html += '<h4 style="color: #155724; margin-top: 0;"> Seguros Vinculados ';
            html += `<button onclick="window.addInsurancePartnership(${id})" class="btn btn-sm btn-success" style="float: right;"> Agregar</button>`;
            html += '</h4>';
            
            if (insurance.length > 0) {
                html += '<table class="table" style="background: white; margin-top: 10px;">';
                html += '<thead><tr><th>Seguro</th><th>Contrato</th><th>Vigencia</th><th>Descuento</th><th>Acciones</th></tr></thead>';
                html += '<tbody>';
                insurance.forEach(ins => {
                    const effectiveFrom = ins.EffectiveFrom ? fmtDate(ins.EffectiveFrom) : '-';
                    const effectiveTo = ins.EffectiveTo ? fmtDate(ins.EffectiveTo) : ';
                    const vigencia = `${effectiveFrom} - ${effectiveTo}`;
                    const status = ins.IsActive ? ' Activo' : ' Inactivo';
                    
                    html += `<tr>`;
                    html += `<td><strong>${escHtml(ins.InsuranceName)}</strong></td>`;
                    html += `<td>${escHtml(ins.ContractNumber || 'N/A')}</td>`;
                    html += `<td>${vigencia}</td>`;
                    html += `<td><span class="badge badge-success">${ins.DiscountPercentage || 0}%</span></td>`;
                    html += `<td>`;
                    if (ins.IsActive) {
                        html += `<button class="btn btn-xs btn-danger" onclick="window.removeInsurancePartnership(${ins.PrescriberInsuranceID}, ${id})">
                    }
                    html += `</td>`;
                    html += `</tr>`;
                });
                html += '</tbody></table>';
            } else {
                html += '<p style="color: #666;">No tiene seguros vinculados</p>';
            }
            html += '</div>';
            
            // Action Buttons
            html += '<div style="text-align: center; margin-top: 30px;">';
            html += '<button onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px;">Cerrar</button>';
            html += `<button onclick="window.closeModal(); window.editDoctor(${id})" class="btn btn-primary" style="margin: 5px;"> Editar</button>`;
            html += '</div>';
            
            html += '</div>';
            
            showModal('Detalles del Doctor', html, '900px');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar doctor');
        }
    };
    
    // Add new doctor
    window.addDoctor = function() {
        let html = '<form onsubmit="window.saveDoctor(event, null)" style="max-width: 600px; margin: 0 auto;">';
        
        html += '<div class="form-group">';
        html += '<label>Nombre Completo *</label>';
        html += '<input type="text" id="doctorName" class="form-control" required>';
        html += '</div>';
        
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
        
        html += '<div class="form-group">';
        html += '<label>N de Licencia *</label>';
        html += '<input type="text" id="doctorLicense" class="form-control" required>';
        html += '</div>';
        
        html += '<div class="form-group">';
        html += '<label>N DEA</label>';
        html += '<input type="text" id="doctorDEA" class="form-control">';
        html += '</div>';
        
        html += '</div>';
        
        html += '<div class="form-group">';
        html += '<label>Especialidad *</label>';
        html += '<select id="doctorSpecialty" class="form-control" required>';
        html += '<option value="">Seleccione...</option>';
        html += '<option value="General Medicine">Medicina General</option>';
        html += '<option value="Family Medicine">Medicina Familiar</option>';
        html += '<option value="Internal Medicine">Medicina Interna</option>';
        html += '<option value="Cardiology">Cardiolog
        html += '<option value="Endocrinology">Endocrinolog
        html += '<option value="Pulmonology">Neumolog
        html += '<option value="Dermatology">Dermatolog
        html += '<option value="Pediatrics">Pediatr
        html += '<option value="Other">Otra</option>';
        html += '</select>';
        html += '</div>';
        
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
        
        html += '<div class="form-group">';
        html += '<label>Tel
        html += '<input type="tel" id="doctorPhone" class="form-control">';
        html += '</div>';
        
        html += '<div class="form-group">';
        html += '<label>Email</label>';
        html += '<input type="email" id="doctorEmail" class="form-control">';
        html += '</div>';
        
        html += '</div>';
        
        html += '<div style="text-align: center; margin-top: 30px;">';
        html += '<button type="button" onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px;">Cancelar</button>';
        html += '<button type="submit" class="btn btn-success" style="margin: 5px;"> Crear Doctor</button>';
        html += '</div>';
        
        html += '</form>';
        
        showModal('Nuevo Doctor', html, '700px');
    };
    
    // Edit doctor
    window.editDoctor = async function(id) {
        try {
            const res = await fetch(`/api/doctors/${id}`, {
                credentials: 'include'
            });
            
            if (!res.ok) {
                alert('Error al cargar doctor');
                return;
            }
            
            const data = await res.json();
            if (!data.success) {
                alert('Error al cargar doctor');
                return;
            }
            
            const d = data.doctor;
            
            let html = '<form onsubmit="window.saveDoctor(event, ' + id + ')" style="max-width: 600px; margin: 0 auto;">';
            
            html += '<div class="form-group">';
            html += '<label>Nombre Completo *</label>';
            html += `<input type="text" id="doctorName" class="form-control" value="${escHtml(d.FullName)}" required>`;
            html += '</div>';
            
            html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
            
            html += '<div class="form-group">';
            html += '<label>N de Licencia *</label>';
            html += `<input type="text" id="doctorLicense" class="form-control" value="${escHtml(d.LicenseNumber)}" required>`;
            html += '</div>';
            
            html += '<div class="form-group">';
            html += '<label>N DEA</label>';
            html += `<input type="text" id="doctorDEA" class="form-control" value="${escHtml(d.DEANumber || '')}">`;
            html += '</div>';
            
            html += '</div>';
            
            html += '<div class="form-group">';
            html += '<label>Especialidad *</label>';
            html += '<select id="doctorSpecialty" class="form-control" required>';
            html += `<option value="General Medicine" ${d.Specialty === 'General Medicine' ? 'selected' : ''}>Medicina General</option>`;
            html += `<option value="Family Medicine" ${d.Specialty === 'Family Medicine' ? 'selected' : ''}>Medicina Familiar</option>`;
            html += `<option value="Internal Medicine" ${d.Specialty === 'Internal Medicine' ? 'selected' : ''}>Medicina Interna</option>`;
            html += `<option value="Cardiology" ${d.Specialty === 'Cardiology' ? 'selected' : ''}>Cardiolog
            html += `<option value="Endocrinology" ${d.Specialty === 'Endocrinology' ? 'selected' : ''}>Endocrinolog
            html += `<option value="Pulmonology" ${d.Specialty === 'Pulmonology' ? 'selected' : ''}>Neumolog
            html += `<option value="Dermatology" ${d.Specialty === 'Dermatology' ? 'selected' : ''}>Dermatolog
            html += `<option value="Pediatrics" ${d.Specialty === 'Pediatrics' ? 'selected' : ''}>Pediatr
            html += `<option value="Other" ${d.Specialty === 'Other' ? 'selected' : ''}>Otra</option>`;
            html += '</select>';
            html += '</div>';
            
            html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
            
            html += '<div class="form-group">';
            html += '<label>Tel
            html += `<input type="tel" id="doctorPhone" class="form-control" value="${escHtml(d.Phone || '')}">`;
            html += '</div>';
            
            html += '<div class="form-group">';
            html += '<label>Email</label>';
            html += `<input type="email" id="doctorEmail" class="form-control" value="${escHtml(d.Email || '')}">`;
            html += '</div>';
            
            html += '</div>';
            
            html += '<div style="text-align: center; margin-top: 30px;">';
            html += '<button type="button" onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px;">Cancelar</button>';
            html += '<button type="submit" class="btn btn-primary" style="margin: 5px;"> Guardar Cambios</button>';
            html += '</div>';
            
            html += '</form>';
            
            showModal('Editar Doctor', html, '700px');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar doctor');
        }
    };
    
    // Save doctor (create or update)
    window.saveDoctor = async function(event, id) {
        event.preventDefault();
        
        const doctorData = {
            fullName: document.getElementById('doctorName').value.trim(),
            licenseNumber: document.getElementById('doctorLicense').value.trim(),
            deaNumber: document.getElementById('doctorDEA')?.value.trim() || null,
            specialty: document.getElementById('doctorSpecialty').value,
            phone: document.getElementById('doctorPhone')?.value.trim() || null,
            email: document.getElementById('doctorEmail')?.value.trim() || null
        };
        
        try {
            const url = id ? `/api/doctors/${id}` : '/api/doctors';
            const method = id ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(doctorData)
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                alert(' Error: ' + (errorData.message || 'No se pudo guardar'));
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(id ? ' Doctor actualizado exitosamente' : ' Doctor creado exitosamente');
                window.closeModal();
                await loadDoctors();
                updateStats();
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al guardar doctor');
        }
    };
    
    // Deactivate doctor
    window.deactivateDoctor = async function(id) {
        const doctor = allDoctors.find(d => d.PrescriberID === id);
        if (!doctor) return;
        
        if (!confirm(`t seguro que desea desactivar a ${doctor.FullName}?\n\nEsta acci marcar al doctor como inactivo pero preservar sus recetas existentes.`)) {
            return;
        }
        
        try {
            const res = await fetch(`/api/doctors/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!res.ok) {
                alert(' Error al desactivar doctor');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Doctor desactivado exitosamente');
                await loadDoctors();
                updateStats();
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al desactivar doctor');
        }
    };
    
    // ========================================
    // INSURANCE PARTNERSHIP MANAGEMENT
    // ========================================
    
    window.addInsurancePartnership = function(doctorId) {
        if (insuranceProviders.length === 0) {
            alert('  No hay proveedores de seguro disponibles');
            return;
        }
        
        let html = '<form onsubmit="window.saveInsurancePartnership(event, ' + doctorId + ')" style="max-width: 500px; margin: 0 auto;">';
        
        html += '<div class="form-group">';
        html += '<label>Proveedor de Seguro *</label>';
        html += '<select id="insuranceProviderId" class="form-control" required>';
        html += '<option value="">Seleccione...</option>';
        insuranceProviders.forEach(ip => {
            html += `<option value="${ip.InsuranceProviderID}">${escHtml(ip.Name)}</option>`;
        });
        html += '</select>';
        html += '</div>';
        
        html += '<div class="form-group">';
        html += '<label>N de Contrato</label>';
        html += '<input type="text" id="contractNumber" class="form-control">';
        html += '</div>';
        
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
        
        html += '<div class="form-group">';
        html += '<label>Vigencia Desde</label>';
        html += '<input type="date" id="effectiveFrom" class="form-control" value="' + new Date().toISOString().split('T')[0] + '">';
        html += '</div>';
        
        html += '<div class="form-group">';
        html += '<label>Vigencia Hasta</label>';
        html += '<input type="date" id="effectiveTo" class="form-control">';
        html += '</div>';
        
        html += '</div>';
        
        html += '<div style="text-align: center; margin-top: 30px;">';
        html += '<button type="button" onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px;">Cancelar</button>';
        html += '<button type="submit" class="btn btn-success" style="margin: 5px;"> Agregar Seguro</button>';
        html += '</div>';
        
        html += '</form>';
        
        showModal('Agregar Seguro', html, '600px');
    };
    
    window.saveInsurancePartnership = async function(event, doctorId) {
        event.preventDefault();
        
        const partnershipData = {
            insuranceProviderId: document.getElementById('insuranceProviderId').value,
            contractNumber: document.getElementById('contractNumber')?.value.trim() || null,
            effectiveFrom: document.getElementById('effectiveFrom').value || null,
            effectiveTo: document.getElementById('effectiveTo').value || null
        };
        
        try {
            const res = await fetch(`/api/doctors/${doctorId}/insurance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(partnershipData)
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                alert(' Error: ' + (errorData.message || 'No se pudo agregar'));
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Seguro agregado exitosamente');
                window.closeModal();
                window.viewDoctor(doctorId);
                await loadDoctors();
                updateStats();
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al agregar seguro');
        }
    };
    
    window.removeInsurancePartnership = async function(partnershipId, doctorId) {
        if (!confirm('t seguro que desea eliminar esta asociaci con el seguro?')) {
            return;
        }
        
        try {
            const res = await fetch(`/api/doctors/insurance/${partnershipId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!res.ok) {
                alert(' Error al eliminar seguro');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Seguro eliminado exitosamente');
                window.viewDoctor(doctorId);
                await loadDoctors();
                updateStats();
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al eliminar seguro');
        }
    };
    
    // ========================================
    // DISCOUNT RATE MANAGEMENT
    // ========================================
    
    window.editDiscountRate = function(insuranceId, insuranceName, currentDiscount, minAmount, maxDiscount) {
        let html = '<form onsubmit="window.saveDiscountRate(event, ' + insuranceId + ')" style="max-width: 500px; margin: 0 auto;">';
        
        html += `<div style="background: #e3f2fd; padding: 15px; border-radius: 4px; margin-bottom: 20px;">`;
        html += `<h4 style="margin: 0; color: #1976d2;">${escHtml(insuranceName)}</h4>`;
        html += `</div>`;
        
        html += '<div class="form-group">';
        html += '<label>Porcentaje de Descuento * (0-100)</label>';
        html += '<div style="display: flex; gap: 10px; align-items: center;">';
        html += `<input type="number" id="discountPercentage" class="form-control" min="0" max="100" step="0.01" value="${currentDiscount}" required style="flex: 1;">`;
        html += '<span style="font-size: 20px; font-weight: bold;">%</span>';
        html += '</div>';
        html += '</div>';
        
        html += '<div class="form-group">';
        html += '<label>Monto M de Receta (</label>';
        html += `<input type="number" id="minimumAmount" class="form-control" min="0" step="0.01" value="${minAmount || 0}">`;
        html += '<small style="color: #666;">Monto m para aplicar el descuento</small>';
        html += '</div>';
        
        html += '<div class="form-group">';
        html += '<label>Descuento M (</label>';
        html += `<input type="number" id="maximumDiscount" class="form-control" min="0" step="0.01" value="${maxDiscount || ''}">`;
        html += '<small style="color: #666;">L m del descuento (dejar vac para sin l
        html += '</div>';
        
        html += '<div class="form-group">';
        html += '<label>Descripci
        html += '<textarea id="discountDescription" class="form-control" rows="2"></textarea>';
        html += '</div>';
        
        html += '<div style="text-align: center; margin-top: 30px;">';
        html += '<button type="button" onclick="window.closeModal()" class="btn btn-secondary" style="margin: 5px;">Cancelar</button>';
        html += '<button type="submit" class="btn btn-primary" style="margin: 5px;"> Guardar Tarifa</button>';
        html += '</div>';
        
        html += '</form>';
        
        showModal('Editar Tarifa de Descuento', html, '600px');
    };
    
    window.saveDiscountRate = async function(event, insuranceId) {
        event.preventDefault();
        
        const discountData = {
            discountPercentage: parseFloat(document.getElementById('discountPercentage').value),
            minimumAmount: parseFloat(document.getElementById('minimumAmount').value) || 0,
            maximumDiscount: parseFloat(document.getElementById('maximumDiscount').value) || null,
            description: document.getElementById('discountDescription').value.trim() || null
        };
        
        if (discountData.discountPercentage < 0 || discountData.discountPercentage > 100) {
            alert(' El porcentaje debe estar entre 0 y 100');
            return;
        }
        
        try {
            const res = await fetch(`/api/doctors/discounts/rates/${insuranceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(discountData)
            });
            
            if (!res.ok) {
                alert(' Error al actualizar tarifa');
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert(' Tarifa actualizada exitosamente');
                window.closeModal();
                await loadDiscountRates();
                updateStats();
            } else {
                alert(' Error: ' + (result.message || ''));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(' Error al actualizar tarifa');
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
    
    function fmtCurrency(amount) {
        return new Intl.NumberFormat('es-CR', {
            style: 'currency',
            currency: 'CRC',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    console.log(' Doctors module loaded successfully');
    
})();