const express = require('express');
const router = express.Router();
const { executeStoredProcedure } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// GET /api/inventory/levels - Get inventory levels (existing)
router.get('/levels', requireAuth, async (req, res) => {
    try {
        const { lowStockOnly, warehouseId } = req.query;
        
        const result = await executeStoredProcedure('sp_GetInventoryLevels', {
            LowStockOnly: lowStockOnly === 'true' ? 1 : 0,
            WarehouseID: warehouseId ? parseInt(warehouseId) : null
        });
        
        res.json({ 
            success: true, 
            inventory: result[0] || [] 
        });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading inventory' 
        });
    }
});

// GET /api/inventory/products - Get all products
router.get('/products', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_SearchProducts', {
            SearchTerm: null,
            CategoryID: null,
            IncludeInactive: 0
        });
        
        res.json({ 
            success: true, 
            products: result[0] || [] 
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading products' 
        });
    }
});

// GET /api/inventory/products/:id - Get product details
router.get('/products/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await executeStoredProcedure('sp_GetProductDetails', {
            ProductID: parseInt(id)
        });
        
        res.json({ 
            success: true, 
            product: result[0] ? result[0][0] : null,
            inventory: result[1] || []
        });
    } catch (error) {
        console.error('Get product details error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading product details' 
        });
    }
});

// POST /api/inventory/products - Create new product
router.post('/products', requireAuth, async (req, res) => {
    try {
        const { 
            name, 
            description, 
            categoryId, 
            unitId, 
            minStock, 
            maxStock, 
            reorderPoint,
            price,
            isActive,
            initialStock,
            expiryDate
        } = req.body;
        
        console.log('Creating product:', name, 
            initialStock ? `with ${initialStock} initial stock` : 'without stock',
            expiryDate ? `expiry: ${expiryDate}` : ''
        );
        
        const result = await executeStoredProcedure('sp_CreateProductWithStock', {
            Name: name,
            Description: description || null,
            CategoryID: parseInt(categoryId),
            UnitID: parseInt(unitId),
            MinStock: parseInt(minStock) || 0,
            MaxStock: parseInt(maxStock) || 1000,
            ReorderPoint: parseInt(reorderPoint) || 10,
            Price: parseFloat(price),
            IsActive: isActive !== false ? 1 : 0,
            InitialStock: initialStock ? parseInt(initialStock) : null,
            ExpiryDate: expiryDate || null,
            WarehouseID: 1,
            LocationID: 1
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Product created:', response.ProductID);
            
            res.json({ 
                success: true, 
                productId: response.ProductID,
                message: response.Message
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error creating product' 
            });
        }
    } catch (error) {
        console.error('❌ Create product error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error creating product' 
        });
    }
});

// PUT /api/inventory/products/:id - Update product
router.put('/products/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            description, 
            categoryId, 
            unitId, 
            minStock, 
            maxStock, 
            reorderPoint,
            price,
            isActive 
        } = req.body;
        
        console.log('Updating product:', id);
        
        const result = await executeStoredProcedure('sp_UpdateProduct', {
            ProductID: parseInt(id),
            Name: name,
            Description: description || null,
            CategoryID: parseInt(categoryId),
            UnitID: parseInt(unitId),
            MinStock: parseInt(minStock),
            MaxStock: parseInt(maxStock),
            ReorderPoint: parseInt(reorderPoint),
            Price: price ? parseFloat(price) : null,
            IsActive: isActive !== false ? 1 : 0
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Product updated:', response.ProductID);
            
            res.json({ 
                success: true, 
                message: response.Message
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error updating product' 
            });
        }
    } catch (error) {
        console.error('❌ Update product error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating product' 
        });
    }
});

// POST /api/inventory/adjust - Adjust inventory quantity
router.post('/adjust', requireAuth, async (req, res) => {
    try {
        const { 
            productId, 
            batchId, 
            warehouseId, 
            locationId,
            adjustmentType,
            quantity,
            reason 
        } = req.body;
        
        console.log('Adjusting inventory:', {productId, batchId, adjustmentType, quantity});
        
        const result = await executeStoredProcedure('sp_AdjustInventory', {
            ProductID: parseInt(productId),
            BatchID: parseInt(batchId),
            WarehouseID: parseInt(warehouseId),
            LocationID: parseInt(locationId),
            AdjustmentType: adjustmentType,
            Quantity: parseInt(quantity),
            Reason: reason || null,
            UserID: req.session.user.userId
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Inventory adjusted:', response.OldQuantity, '→', response.NewQuantity);
            
            res.json({ 
                success: true, 
                oldQuantity: response.OldQuantity,
                newQuantity: response.NewQuantity,
                message: response.Message
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error adjusting inventory' 
            });
        }
    } catch (error) {
        console.error('❌ Adjust inventory error:', error);
        
        // Extract user-friendly error message
        let errorMessage = 'Error al ajustar inventario';
        
        if (error.message) {
            if (error.message.includes('no puede ser negativa')) {
                errorMessage = 'No hay suficiente stock. La cantidad resultante no puede ser negativa.';
            } else if (error.message.includes('inválido')) {
                errorMessage = 'Tipo de ajuste inválido.';
            } else {
                errorMessage = error.message;
            }
        }
        
        res.status(400).json({ 
            success: false, 
            message: errorMessage
        });
    }
});

// GET /api/inventory/categories - Get categories
router.get('/categories', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_GetCategories');
        
        res.json({ 
            success: true, 
            categories: result[0] || [] 
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading categories' 
        });
    }
});

// GET /api/inventory/units - Get units
router.get('/units', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_GetUnits');
        
        res.json({ 
            success: true, 
            units: result[0] || [] 
        });
    } catch (error) {
        console.error('Get units error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading units' 
        });
    }
});

// GET /api/inventory/expiring - Get expiring products (existing)
router.get('/expiring', requireAuth, async (req, res) => {
    try {
        const { daysThreshold = 90 } = req.query;
        
        const result = await executeStoredProcedure('sp_GetExpiringProducts', {
            DaysThreshold: parseInt(daysThreshold)
        });
        
        res.json({ 
            success: true, 
            expiring: result[0] || [] 
        });
    } catch (error) {
        console.error('Get expiring products error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading expiring products' 
        });
    }
});

// GET /api/inventory/low-stock - Get low stock products (existing)
router.get('/low-stock', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_GetLowStockProducts');
        
        res.json({ 
            success: true, 
            lowStock: result[0] || [] 
        });
    } catch (error) {
        console.error('Get low stock products error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading low stock products' 
        });
    }
});

// DELETE /api/inventory/products/:id - Delete product (soft delete)
router.delete('/products/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'La razón de eliminación es obligatoria'
            });
        }
        
        console.log('Deleting product:', id, 'Reason:', reason);
        
        const result = await executeStoredProcedure('sp_DeleteProduct', {
            ProductID: parseInt(id),
            Reason: reason.trim(),
            UserID: req.session.user.userId
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Product deleted:', response.ProductName);
            
            if (response.RemainingStock > 0) {
                console.log('⚠️ Warning: Product had', response.RemainingStock, 'units in stock');
            }
            
            res.json({
                success: true,
                message: response.Message,
                remainingStock: response.RemainingStock
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Error deleting product'
            });
        }
    } catch (error) {
        console.error('❌ Delete product error:', error);
        
        let errorMessage = 'Error al eliminar producto';
        if (error.message) {
            if (error.message.includes('no encontrado')) {
                errorMessage = 'Producto no encontrado';
            } else if (error.message.includes('obligatoria')) {
                errorMessage = 'La razón de eliminación es obligatoria';
            } else {
                errorMessage = error.message;
            }
        }
        
        res.status(400).json({
            success: false,
            message: errorMessage
        });
    }
});

// GET /api/inventory/available - Get available products for POS
router.get('/available', requireAuth, async (req, res) => {
    try {
        console.log('📦 Loading available products for POS...');
        
        // Get products with stock from InventoryBalance
        const result = await executeStoredProcedure('sp_GetAvailableProducts');
        
        if (result && result[0]) {
            const products = result[0];
            console.log('✅ Loaded', products.length, 'available products');
            
            res.json({
                success: true,
                products: products
            });
        } else {
            res.json({
                success: true,
                products: []
            });
        }
    } catch (error) {
        console.error('❌ Error loading available products:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading products',
            products: []
        });
    }
});

module.exports = router;