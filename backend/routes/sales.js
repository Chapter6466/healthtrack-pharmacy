const express = require('express');
const router = express.Router();
const { executeStoredProcedure } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// POST /api/sales/invoice - ULTRA SIMPLE VERSION
router.post('/invoice', requireAuth, async (req, res) => {
    try {
        const { 
            patientId, 
            warehouseId, 
            items,
            paymentMethod, 
            subtotal,
            tax,
            total 
        } = req.body;
        
        // Use warehouse ID from request, or default to 1
        const finalWarehouseId = warehouseId ? parseInt(warehouseId) : 1;
        
        console.log('Creating invoice:', {
            patientId: patientId || 'walk-in',
            warehouseId: finalWarehouseId,
            items: items?.length,
            total
        });
        
        const itemsJson = JSON.stringify(items || []);
        
        const result = await executeStoredProcedure('sp_CreateSalesInvoice', {
            PatientID: patientId ? parseInt(patientId) : null,
            WarehouseID: finalWarehouseId,
            UserID: req.session.user.userId,
            PaymentMethod: paymentMethod || 'Cash',
            Subtotal: parseFloat(subtotal) || 0,
            Tax: parseFloat(tax) || 0,
            Discount: 0,
            Total: parseFloat(total) || 0,
            Items: itemsJson
        });
        
        if (result[0] && result[0].length > 0) {
            const invoiceData = result[0][0];
            console.log('✅ Invoice created:', invoiceData.InvoiceID);
            
            res.json({ 
                success: true, 
                invoiceId: invoiceData.InvoiceID,
                invoiceNumber: invoiceData.InvoiceNumber,
                message: 'Venta procesada exitosamente'
            });
        } else {
            throw new Error('No invoice data returned');
        }
    } catch (error) {
        console.error('❌ Invoice creation error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error: ' + error.message 
        });
    }
});

module.exports = router;