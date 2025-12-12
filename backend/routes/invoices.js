// ============================================
// BACKEND: Invoices API Routes
// File: backend/routes/invoices.js
// ============================================

const express = require('express');
const router = express.Router();
const { executeStoredProcedure } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// Helper to extract user ID from session
function getUserId(req) {
    if (req.session && req.session.user) {
        return req.session.user.UserID || req.session.user.userId || req.session.user.id;
    }
    return null;
}

// ============================================
// GET /api/invoices - Get all invoices with filters
// ============================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const { startDate, endDate, status, patientId } = req.query;
        
        const result = await executeStoredProcedure('sp_GetAllInvoices', {
            StartDate: startDate || null,
            EndDate: endDate || null,
            Status: status || 'All',
            PatientID: patientId || null
        });
        
        res.json({
            success: true,
            invoices: result[0] || []
        });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading invoices',
            error: error.message
        });
    }
});

// ============================================
// GET /api/invoices/stats - Get invoice statistics
// ============================================
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_GetInvoiceStats');
        
        res.json({
            success: true,
            stats: result[0] && result[0][0] ? result[0][0] : {}
        });
    } catch (error) {
        console.error('Get invoice stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading statistics',
            error: error.message
        });
    }
});

// ============================================
// GET /api/invoices/search - Search invoices
// ============================================
router.get('/search', requireAuth, async (req, res) => {
    try {
        const { term, invoiceId } = req.query;
        
        if (!term && !invoiceId) {
            return res.status(400).json({
                success: false,
                message: 'Search term or invoice ID required'
            });
        }
        
        const result = await executeStoredProcedure('sp_SearchInvoices', {
            SearchTerm: term || null,
            InvoiceID: invoiceId || null
        });
        
        res.json({
            success: true,
            invoices: result[0] || []
        });
    } catch (error) {
        console.error('Search invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching invoices',
            error: error.message
        });
    }
});

// ============================================
// GET /api/invoices/:id - Get invoice details
// ============================================
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const invoiceId = parseInt(req.params.id);
        
        if (!invoiceId || isNaN(invoiceId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid invoice ID required'
            });
        }
        
        const result = await executeStoredProcedure('sp_GetInvoiceDetails', {
            InvoiceID: invoiceId
        });
        
        if (!result[0] || result[0].length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }
        
        res.json({
            success: true,
            invoice: result[0][0],           // Header
            items: result[1] || [],          // Items
            refunds: result[2] || []         // Refund history
        });
    } catch (error) {
        console.error('Get invoice details error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading invoice details',
            error: error.message
        });
    }
});

// ============================================
// POST /api/invoices/:id/void - Void an invoice
// ============================================
router.post('/:id/void', requireAuth, async (req, res) => {
    try {
        const invoiceId = parseInt(req.params.id);
        const { voidReason } = req.body;
        const userId = getUserId(req);
        
        if (!invoiceId || isNaN(invoiceId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid invoice ID required'
            });
        }
        
        if (!voidReason || voidReason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Void reason is required'
            });
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const result = await executeStoredProcedure('sp_VoidInvoice', {
            InvoiceID: invoiceId,
            VoidedBy: userId,
            VoidReason: voidReason
        });
        
        res.json({
            success: true,
            message: 'Invoice voided successfully',
            invoice: result[0] && result[0][0] ? result[0][0] : null
        });
    } catch (error) {
        console.error('Void invoice error:', error);
        
        // Handle specific business rule errors
        if (error.message && error.message.includes('already voided')) {
            return res.status(400).json({
                success: false,
                message: 'Invoice is already voided'
            });
        }
        
        if (error.message && error.message.includes('existing refunds')) {
            return res.status(400).json({
                success: false,
                message: 'Cannot void invoice with existing refunds'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error voiding invoice',
            error: error.message
        });
    }
});

// ============================================
// POST /api/invoices/:id/refund - Process a refund
// ============================================
router.post('/:id/refund', requireAuth, async (req, res) => {
    try {
        const invoiceId = parseInt(req.params.id);
        const { refundAmount, refundReason, refundMethod, notes, items } = req.body;
        const userId = getUserId(req);
        
        if (!invoiceId || isNaN(invoiceId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid invoice ID required'
            });
        }
        
        if (!refundAmount || refundAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid refund amount required'
            });
        }
        
        if (!refundReason || refundReason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Refund reason is required'
            });
        }
        
        if (!refundMethod || !['CASH', 'CARD', 'CREDIT_NOTE'].includes(refundMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Valid refund method required (CASH, CARD, or CREDIT_NOTE)'
            });
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Convert items array to JSON string if provided
        let itemsJSON = null;
        if (items && Array.isArray(items) && items.length > 0) {
            itemsJSON = JSON.stringify(items);
        }
        
        const result = await executeStoredProcedure('sp_ProcessRefund', {
            InvoiceID: invoiceId,
            RefundAmount: refundAmount,
            RefundReason: refundReason,
            RefundMethod: refundMethod,
            ProcessedBy: userId,
            Notes: notes || null,
            ItemsJSON: itemsJSON
        });
        
        res.json({
            success: true,
            message: 'Refund processed successfully',
            refund: result[0] && result[0][0] ? result[0][0] : null
        });
    } catch (error) {
        console.error('Process refund error:', error);
        
        // Handle specific business rule errors
        if (error.message && error.message.includes('is voided')) {
            return res.status(400).json({
                success: false,
                message: 'Cannot refund a voided invoice'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error processing refund',
            error: error.message
        });
    }
});

module.exports = router;