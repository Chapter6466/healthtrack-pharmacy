const express = require('express');
const router = express.Router();
const { executeStoredProcedure } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// GET /api/dashboard/summary - Get dashboard summary statistics
router.get('/summary', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_GetDashboardSummary');
        
        console.log('Dashboard summary result:', result[0]);
        
        res.json({ 
            success: true, 
            data: result[0] || [] 
        });
    } catch (error) {
        console.error('Dashboard summary error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading dashboard data' 
        });
    }
});

// GET /api/dashboard/top-products - Get top selling products
router.get('/top-products', requireAuth, async (req, res) => {
    try {
        const { limit = 10, days = 30 } = req.query;
        
        const result = await executeStoredProcedure('sp_GetTopProducts', {
            TopN: parseInt(limit),
            DaysBack: parseInt(days)
        });
        
        console.log('Top products result:', result[0]);
        
        res.json({ 
            success: true, 
            products: result[0] || [] 
        });
    } catch (error) {
        console.error('Top products error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading top products' 
        });
    }
});

module.exports = router;