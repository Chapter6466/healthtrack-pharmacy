// ============================================
// BACKEND: Sales Routes (POS)
// File: backend/routes/sales.js
// Supports: CASH, CARD, TRANSFER, INSURANCE
// - CARD/TRANSFER require PaymentReference
// - CASH supports CashReceived + ChangeDue
// - INSURANCE supports InsuranceReference
// ============================================

const express = require('express');
const router = express.Router();
const { executeStoredProcedure } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

function getUserId(req) {
  if (!req.session || !req.session.user) return null;
  return (
    req.session.user.UserID ||
    req.session.user.userId ||
    req.session.user.id ||
    req.session.user.userid
  );
}

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// POST /api/sales/invoice
router.post('/invoice', requireAuth, async (req, res) => {
  try {
    const {
      patientId,
      warehouseId,
      items,
      paymentMethod,
      subtotal,
      tax,
      total,
      // NEW fields from POS modal
      paymentReference,
      cashReceived,
      changeDue,
      insuranceReference,
      notes
    } = req.body;

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const finalWarehouseId = warehouseId ? parseInt(warehouseId, 10) : 1;
    const method = String(paymentMethod || '').trim().toUpperCase();

    if (!['CASH', 'CARD', 'TRANSFER', 'INSURANCE'].includes(method)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    const nSubtotal = asNumber(subtotal) ?? 0;
    const nTax = asNumber(tax) ?? 0;
    const nTotal = asNumber(total) ?? 0;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items are required' });
    }

    // Validation by method
    const ref = paymentReference ? String(paymentReference).trim() : '';
    const insRef = insuranceReference ? String(insuranceReference).trim() : '';

    let nCashReceived = asNumber(cashReceived);
    let nChangeDue = asNumber(changeDue);

    if (method === 'CARD' || method === 'TRANSFER') {
      if (!ref) {
        return res.status(400).json({
          success: false,
          message: 'Reference/authorization number is required for card/transfer payments'
        });
      }
    }

    if (method === 'INSURANCE') {
      if (!insRef) {
        return res.status(400).json({
          success: false,
          message: 'Insurance reference/claim number is required for insurance payments'
        });
      }
    }

    if (method === 'CASH') {
      if (!Number.isFinite(nCashReceived) || nCashReceived <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Cash received must be greater than 0'
        });
      }

      // Ensure enough cash to cover total
      if (nCashReceived < nTotal) {
        return res.status(400).json({
          success: false,
          message: 'Cash received is less than total amount'
        });
      }

      // Compute change if not provided
      if (!Number.isFinite(nChangeDue)) {
        nChangeDue = Math.max(0, nCashReceived - nTotal);
      }
    } else {
      nCashReceived = null;
      nChangeDue = null;
    }

    // Persist items as JSON for the SP
    const itemsJson = JSON.stringify(items);

    console.log('🧾 Creating invoice:', {
      patientId: patientId || 'walk-in',
      warehouseId: finalWarehouseId,
      userId,
      method,
      items: items.length,
      total: nTotal
    });

    // Call stored procedure to create invoice
    const result = await executeStoredProcedure('sp_CreateSalesInvoice', {
      PatientID: patientId ? parseInt(patientId, 10) : null,
      WarehouseID: finalWarehouseId,
      UserID: parseInt(userId, 10),

      PaymentMethod: method,

      Subtotal: nSubtotal,
      Total: nTax,          // ⚠️ MATCH TABLE COLUMN
      DiscountTotal: 0,        // ⚠️ MATCH TABLE COLUMN
      GrandTotal: nTotal,      // ✅ THIS FIXES THE ERROR

      // Payment details
      PaymentReference:
        (method === 'CARD' || method === 'TRANSFER') ? ref : null,

      CashReceived:
        method === 'CASH' ? nCashReceived : null,

      ChangeDue:
        method === 'CASH'
          ? Math.max(0, nCashReceived - nTotal)
          : null,

      InsuranceReference:
        method === 'INSURANCE' ? insuranceRef : null,

      Items: itemsJson
    });

    if (result[0] && result[0].length > 0) {
      const invoiceData = result[0][0];
      console.log('✅ Invoice created:', invoiceData.InvoiceID);

      return res.json({
        success: true,
        invoiceId: invoiceData.InvoiceID,
        invoiceNumber: invoiceData.InvoiceNumber,
        message: 'Venta procesada exitosamente'
      });
    }

    throw new Error('No invoice data returned');
  } catch (error) {
    console.error('❌ Invoice creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error: ' + (error.message || 'Unknown error')
    });
  }
});

module.exports = router;
