// ============================================
// BACKEND: Server Entry Point
// File: backend/server.js
// ============================================

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'healthtrack-secret-key-change-this-in-production-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 60 * 1000, // 30 minutes
        httpOnly: true,
        secure: false // Set to true in production with HTTPS
    }
}));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/products', require('./routes/products'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/reports', require('./routes/reports'));

// Serve login page by default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Catch-all route for SPA - serve index/login page
app.get('*', (req, res, next) => {
    // If it's an API call, let it pass through to 404 handler
    if (req.path.startsWith('/api/')) {
        return next();
    }
    // Otherwise serve the login page
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// 404 handler for API endpoints
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'API endpoint not found' 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    res.status(500).json({ 
        success: false, 
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log('========================================');
    console.log('  💊 HealthTrack Pharmacy Server');
    console.log('========================================');
    console.log('  Server: http://localhost:' + PORT);
    console.log('  Database: ' + (process.env.DB_DATABASE || 'HealthTrackDB'));
    console.log('  Environment: ' + (process.env.NODE_ENV || 'development'));
    console.log('========================================');
    console.log('');
    console.log('✅ Server is running!');
    console.log('📝 Open http://localhost:' + PORT + ' in your browser');
    console.log('');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server gracefully...');
    process.exit(0);
});

module.exports = app;