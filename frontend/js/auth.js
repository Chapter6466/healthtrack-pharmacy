// Login functionality
console.log('Auth.js loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, setting up login form');
    
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.error('Login form not found!');
        return;
    }
    
    console.log('Login form found');
    
    const errorMessage = document.getElementById('errorMessage');
    const loadingSpinner = document.getElementById('loadingSpinner');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted');

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        console.log('Username entered:', username);

        if (!username || !password) {
            showError('Por favor ingrese usuario y contrasena');
            return;
        }

        if (loadingSpinner) loadingSpinner.style.display = 'block';
        if (errorMessage) errorMessage.style.display = 'none';

        try {
            console.log('Sending login request to /api/auth/login');
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            console.log('Response received. Status:', response.status);

            const data = await response.json();
            console.log('Response data:', data);

            if (data.success) {
                console.log('Login successful! Redirecting to dashboard...');
                sessionStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = '/dashboard.html';
            } else {
                console.log('Login failed:', data.message);
                showError(data.message || 'Usuario o contrasena incorrectos');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Error de conexion. Verifique que el servidor este corriendo.');
        } finally {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    });

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
        console.error('Error shown to user:', message);
    }
});
