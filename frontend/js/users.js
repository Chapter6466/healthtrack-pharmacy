// users.js - User Management (Admin Only)

let currentUser = null;
let allRoles = [];

// Initialize users page
async function initUsers() {
    currentUser = await initUserInfo();
    if (!currentUser) return;
    
    // Check if user is admin
    if (currentUser.roleName !== 'Administrator') {
        showToast('Acceso denegado. Solo administradores pueden acceder.', 'danger');
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 2000);
        return;
    }
    
    setupLogout();
    setupEventListeners();
    await loadRoles();
    await loadUsers();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addUserBtn').addEventListener('click', showAddUserModal);
    document.getElementById('closeUserModal').addEventListener('click', hideUserModal);
    document.getElementById('cancelUserBtn').addEventListener('click', hideUserModal);
    document.getElementById('userForm').addEventListener('submit', saveUser);
}

// Load all roles
async function loadRoles() {
    try {
        const response = await fetch('/api/auth/roles');
        const data = await response.json();
        
        if (data.success && data.roles) {
            allRoles = data.roles;
            populateRoleDropdown();
        }
    } catch (error) {
        console.error('Error loading roles:', error);
    }
}

// Populate role dropdown
function populateRoleDropdown() {
    const roleSelect = document.getElementById('roleId');
    roleSelect.innerHTML = '<option value="">Seleccione un rol...</option>';
    
    allRoles.forEach(role => {
        const option = document.createElement('option');
        option.value = role.RoleID;
        option.textContent = `${role.RoleName} - ${role.Description}`;
        roleSelect.appendChild(option);
    });
}

// Load all users
async function loadUsers() {
    const container = document.getElementById('usersList');
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        const response = await fetch('/api/auth/users');
        const data = await response.json();
        
        if (data.success && data.users && data.users.length > 0) {
            displayUsers(data.users);
        } else {
            container.innerHTML = '<p class="text-muted text-center">No hay usuarios registrados</p>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<p class="text-danger text-center">Error al cargar usuarios</p>';
        showToast('Error al cargar usuarios', 'danger');
    }
}

// Display users table
function displayUsers(users) {
    const container = document.getElementById('usersList');
    
    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Nombre Completo</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Almacén</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.UserID}</td>
                        <td><strong>${user.Username}</strong></td>
                        <td>${user.FullName}</td>
                        <td>${user.Email || 'N/A'}</td>
                        <td>
                            <span class="badge badge-info">
                                ${user.RoleName}
                            </span>
                        </td>
                        <td>${user.WarehouseName || 'N/A'}</td>
                        <td>
                            <span class="badge badge-${user.IsActive ? 'success' : 'danger'}">
                                ${user.IsActive ? 'Activo' : 'Inactivo'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="editUser(${user.UserID})">
                                ✏️ Editar
                            </button>
                            <button class="btn btn-sm btn-${user.IsActive ? 'warning' : 'success'}" 
                                    onclick="toggleUserStatus(${user.UserID}, ${!user.IsActive})">
                                ${user.IsActive ? '🚫 Desactivar' : '✅ Activar'}
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Show add user modal
function showAddUserModal() {
    document.getElementById('modalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('userForm').reset();
    document.getElementById('password').required = true;
    document.getElementById('userModal').style.display = 'flex';
}

// Hide user modal
function hideUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
}

// Edit user
async function editUser(userId) {
    try {
        const response = await fetch(`/api/auth/users/${userId}`);
        const data = await response.json();
        
        if (data.success && data.user) {
            const user = data.user;
            
            document.getElementById('modalTitle').textContent = 'Editar Usuario';
            document.getElementById('username').value = user.Username;
            document.getElementById('username').disabled = true; // Can't change username
            document.getElementById('password').required = false; // Password optional when editing
            document.getElementById('fullName').value = user.FullName;
            document.getElementById('email').value = user.Email || '';
            document.getElementById('roleId').value = user.RoleID;
            document.getElementById('warehouseId').value = user.DefaultWarehouseID || '';
            
            // Store userId for update
            document.getElementById('userForm').dataset.userId = userId;
            
            document.getElementById('userModal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showToast('Error al cargar datos del usuario', 'danger');
    }
}

// Save user (create or update)
async function saveUser(e) {
    e.preventDefault();
    
    const form = document.getElementById('userForm');
    const userId = form.dataset.userId;
    const isEdit = !!userId;
    
    const userData = {
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value || null,
        roleId: parseInt(document.getElementById('roleId').value),
        warehouseId: document.getElementById('warehouseId').value ? parseInt(document.getElementById('warehouseId').value) : null
    };
    
    // If editing and password is empty, remove it from update
    if (isEdit && !userData.password) {
        delete userData.password;
    }
    
    try {
        const url = isEdit ? `/api/auth/users/${userId}` : '/api/auth/users';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(isEdit ? 'Usuario actualizado' : 'Usuario creado', 'success');
            hideUserModal();
            await loadUsers();
            
            // Reset form
            form.reset();
            delete form.dataset.userId;
            document.getElementById('username').disabled = false;
        } else {
            showToast(data.message || 'Error al guardar usuario', 'danger');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        showToast('Error al guardar usuario', 'danger');
    }
}

// Toggle user active status
async function toggleUserStatus(userId, newStatus) {
    const action = newStatus ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Está seguro que desea ${action} este usuario?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/auth/users/${userId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: newStatus })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Usuario ${action}do exitosamente`, 'success');
            await loadUsers();
        } else {
            showToast(data.message || `Error al ${action} usuario`, 'danger');
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        showToast(`Error al ${action} usuario`, 'danger');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initUsers);