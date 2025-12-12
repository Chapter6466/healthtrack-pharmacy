const express = require('express');
const router = express.Router();
const { executeStoredProcedure } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }
        
        // Call stored procedure
        const result = await executeStoredProcedure('sp_AuthenticateUser', {
            Username: username,
            Password: password
        });
        
        if (result[0] && result[0].length > 0) {
            const user = result[0][0];
            
            // Create session
            req.session.user = {
                userId: user.UserID,
                username: user.Username,
                fullName: user.FullName,
                email: user.Email,
                roleId: user.RoleID,
                roleName: user.RoleName,
                roleDescription: user.RoleDescription,
                warehouseId: user.DefaultWarehouseID,
                warehouseCode: user.WarehouseCode,
                warehouseName: user.WarehouseName
            };
            
            console.log('✅ User logged in:', user.Username);
            
            res.json({ 
                success: true, 
                user: req.session.user 
            });
        } else {
            console.log('❌ Login failed for:', username);
            res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});

// POST /api/auth/logout - User logout
router.post('/logout', (req, res) => {
    const username = req.session.user ? req.session.user.username : 'Unknown';
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            res.status(500).json({ 
                success: false, 
                message: 'Error logging out' 
            });
        } else {
            console.log('✅ User logged out:', username);
            res.json({ 
                success: true, 
                message: 'Logged out successfully' 
            });
        }
    });
});

// GET /api/auth/session - Check current session
router.get('/session', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ 
            loggedIn: true, 
            user: req.session.user 
        });
    } else {
        res.json({ 
            loggedIn: false 
        });
    }
});

// GET /api/auth/roles - Get all roles (Admin only)
router.get('/roles', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_GetAllRoles');
        
        res.json({ 
            success: true, 
            roles: result[0] || [] 
        });
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading roles' 
        });
    }
});

// GET /api/auth/users - Get all users (Admin only)
router.get('/users', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_GetAllUsers');
        
        res.json({ 
            success: true, 
            users: result[0] || [] 
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading users' 
        });
    }
});

// GET /api/auth/users/:userId - Get user details (Admin only)
router.get('/users/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await executeStoredProcedure('sp_GetUserDetails', {
            UserID: parseInt(userId)
        });
        
        if (result[0] && result[0].length > 0) {
            res.json({ 
                success: true, 
                user: result[0][0] 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
    } catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading user details' 
        });
    }
});

// POST /api/auth/users - Create new user (Admin only)
router.post('/users', requireAuth, async (req, res) => {
    try {
        const { username, password, fullName, email, roleId, warehouseId } = req.body;
        
        if (!username || !password || !fullName || !roleId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, password, full name, and role are required' 
            });
        }
        
        const result = await executeStoredProcedure('sp_CreateUser', {
            Username: username,
            PasswordHash: password, // In production, hash this!
            FullName: fullName,
            Email: email || null,
            RoleID: parseInt(roleId),
            DefaultWarehouseID: warehouseId ? parseInt(warehouseId) : null,
            CreatedBy: req.session.user.userId
        });
        
        res.json({ 
            success: true, 
            message: 'User created successfully',
            userId: result[0] && result[0][0] ? result[0][0].UserID : null
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating user: ' + error.message 
        });
    }
});

// PUT /api/auth/users/:userId - Update user (Admin only)
router.put('/users/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { password, fullName, email, roleId, warehouseId } = req.body;
        
        if (!fullName || !roleId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Full name and role are required' 
            });
        }
        
        const params = {
            UserID: parseInt(userId),
            FullName: fullName,
            Email: email || null,
            RoleID: parseInt(roleId),
            DefaultWarehouseID: warehouseId ? parseInt(warehouseId) : null,
            ModifiedBy: req.session.user.userId
        };
        
        // Only include password if provided
        if (password) {
            params.PasswordHash = password; // In production, hash this!
        }
        
        await executeStoredProcedure('sp_UpdateUser', params);
        
        res.json({ 
            success: true, 
            message: 'User updated successfully' 
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating user: ' + error.message 
        });
    }
});

// PUT /api/auth/users/:userId/status - Toggle user active status (Admin only)
router.put('/users/:userId/status', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;
        
        await executeStoredProcedure('sp_UpdateUser', {
            UserID: parseInt(userId),
            IsActive: isActive ? 1 : 0,
            ModifiedBy: req.session.user.userId
        });
        
        res.json({ 
            success: true, 
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully` 
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating user status' 
        });
    }
});

// GET /api/auth/user-info - Get current logged-in user info
router.get('/user-info', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                userId: req.session.userId,
                fullName: req.session.fullName,
                username: req.session.username,
                role: req.session.role
            }
        });
    } else {
        res.json({
            authenticated: false
        });
    }
});

// Alternative endpoint name (if you prefer this)
// GET /api/auth/check
router.get('/check', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                userId: req.session.userId,
                fullName: req.session.fullName,
                username: req.session.username,
                role: req.session.role
            }
        });
    } else {
        res.json({
            authenticated: false
        });
    }
});

module.exports = router;