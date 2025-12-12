const express = require('express');
const router = express.Router();
const { executeStoredProcedure } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// ============================================
// IMPORTANT: Most specific routes FIRST!
// ============================================

// GET /api/products/search - Search for products
router.get('/search', requireAuth, async (req, res) => {
    try {
        const { searchTerm, categoryId, warehouseId } = req.query;
        
        const result = await executeStoredProcedure('sp_SearchProducts', {
            SearchTerm: searchTerm || null,
            CategoryID: categoryId ? parseInt(categoryId) : null,
            WarehouseID: warehouseId ? parseInt(warehouseId) : null
        });
        
        res.json({ 
            success: true, 
            products: result[0] || [] 
        });
    } catch (error) {
        console.error('Product search error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error searching products' 
        });
    }
});

// GET /api/products - Get all products
// MOVED UP: This should come before /:productId routes
router.get('/', requireAuth, async (req, res) => {
    try {
        console.log('📦 Getting all products...');
        
        // Use existing stored procedure to get products
        const result = await executeStoredProcedure('sp_GetAllProducts');
        
        console.log(`✅ Found ${result[0]?.length || 0} products`);
        
        res.json({ 
            success: true, 
            products: result[0] || [] 
        });
    } catch (error) {
        console.error('❌ Get products error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading products',
            error: error.message 
        });
    }
});

// GET /api/products/:productId/batches - Get available batches for a product
// This should come AFTER the root route
router.get('/:productId/batches', requireAuth, async (req, res) => {
    try {
        const { productId } = req.params;
        const { warehouseId } = req.query;
        
        const result = await executeStoredProcedure('sp_GetAvailableBatches', {
            ProductID: parseInt(productId),
            WarehouseID: warehouseId ? parseInt(warehouseId) : null
        });
        
        res.json({ 
            success: true, 
            batches: result[0] || [] 
        });
    } catch (error) {
        console.error('Get batches error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading product batches' 
        });
    }
});

module.exports = router;