// Authentication Middleware

function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Not authenticated. Please login.' 
        });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }
        
        if (roles.includes(req.session.user.roleName)) {
            next();
        } else {
            res.status(403).json({ 
                success: false, 
                message: 'Insufficient permissions. Required role: ' + roles.join(' or ') 
            });
        }
    };
}

function optionalAuth(req, res, next) {
    // Doesn't require authentication, but populates user if authenticated
    next();
}

module.exports = { 
    requireAuth, 
    requireRole,
    optionalAuth 
};