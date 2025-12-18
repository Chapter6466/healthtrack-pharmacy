// ============================================
// BACKEND: Enhanced Invoices API Routes
// CUSTOMIZED FOR YOUR DATABASE (SalesInvoice)
// File: backend/routes/invoices.js
// ============================================

const express = require('express');
const router = express.Router();

const { executeStoredProcedure } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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

    // IMPORTANT:
    // - Frontend does NOT send status when it's "All"
    // - Many SPs expect NULL to mean "no filter"
    const normalizedStatus =
      !status || String(status).trim() === '' || String(status).toLowerCase() === 'all'
        ? null
        : String(status).trim();

    const normalizedPatientId =
      patientId && !isNaN(parseInt(patientId)) ? parseInt(patientId) : null;

    const result = await executeStoredProcedure('sp_GetAllInvoices', {
      StartDate: startDate || null,
      EndDate: endDate || null,
      Status: normalizedStatus, // <-- changed (NULL means "all")
      PatientID: normalizedPatientId
    });

    res.json({
      success: true,
      invoices: result[0] || []
    });
  } catch (error) {
    console.error('❌ Get invoices error:', error);
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
    console.error('❌ Get invoice stats error:', error);
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

    const normalizedInvoiceId =
      invoiceId && !isNaN(parseInt(invoiceId)) ? parseInt(invoiceId) : null;

    const result = await executeStoredProcedure('sp_SearchInvoices', {
      SearchTerm: term || null,
      InvoiceID: normalizedInvoiceId
    });

    res.json({
      success: true,
      invoices: result[0] || []
    });
  } catch (error) {
    console.error('❌ Search invoices error:', error);
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
      invoice: result[0][0],
      items: result[1] || [],
      refunds: result[2] || []
    });
  } catch (error) {
    console.error('❌ Get invoice details error:', error);
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
      return res.status(400).json({ success: false, message: 'Valid invoice ID required' });
    }

    if (!voidReason || voidReason.trim() === '') {
      return res.status(400).json({ success: false, message: 'Void reason is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const result = await executeStoredProcedure('sp_VoidInvoice', {
      InvoiceID: invoiceId,
      VoidedBy: userId,
      VoidReason: voidReason.trim()
    });

    res.json({
      success: true,
      message: 'Invoice voided successfully',
      invoice: result[0] && result[0][0] ? result[0][0] : null
    });
  } catch (error) {
    console.error('❌ Void invoice error:', error);

    if (error.message && error.message.includes('already voided')) {
      return res.status(400).json({ success: false, message: 'Invoice is already voided' });
    }

    if (error.message && error.message.includes('existing refunds')) {
      return res
        .status(400)
        .json({ success: false, message: 'Cannot void invoice with existing refunds' });
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
      return res.status(400).json({ success: false, message: 'Valid invoice ID required' });
    }

    const amt = parseFloat(refundAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Valid refund amount required' });
    }

    if (!refundReason || refundReason.trim() === '') {
      return res.status(400).json({ success: false, message: 'Refund reason is required' });
    }

    if (!refundMethod || !['CASH', 'CARD', 'CREDIT_NOTE'].includes(refundMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Valid refund method required (CASH, CARD, or CREDIT_NOTE)'
      });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const itemsJSON =
      items && Array.isArray(items) && items.length > 0 ? JSON.stringify(items) : null;

    const result = await executeStoredProcedure('sp_ProcessRefund', {
      InvoiceID: invoiceId,
      RefundAmount: amt,
      RefundReason: refundReason.trim(),
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
    console.error('❌ Process refund error:', error);

    if (error.message && error.message.includes('is voided')) {
      return res.status(400).json({ success: false, message: 'Cannot refund a voided invoice' });
    }

    res.status(500).json({
      success: false,
      message: 'Error processing refund',
      error: error.message
    });
  }
});

// ============================================
// GET /api/invoices/:id/pdf - Download invoice as PDF
// ============================================
router.get('/:id/pdf', requireAuth, async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);

    if (!invoiceId || isNaN(invoiceId)) {
      return res.status(400).json({ success: false, message: 'Valid invoice ID required' });
    }

    console.log(`📄 Generating PDF for invoice #${invoiceId}`);

    const result = await executeStoredProcedure('sp_GetInvoiceDetails', {
      InvoiceID: invoiceId
    });

    if (!result[0] || result[0].length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = result[0][0];
    const items = result[1] || [];
    const refunds = result[2] || [];

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${invoiceId}.pdf`);

    doc.pipe(res);

    // Logo path aligned to your backend static setup: /frontend is served by express.static
    // Put the logo under: frontend/img/healthtrack-logo.png
    try {
        const logoPath = path.join(process.cwd(), 'frontend', 'img', 'healthtrack-logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 45, { width: 150 });
        }
    } catch (err) {
        console.warn('⚠️ Logo skipped:', err.message);
    }

    doc
      .fontSize(10)
      .text('HealthTrack Systems', 400, 50, { align: 'right' })
      .text('Control, precisión y bienestar', 400, 65, { align: 'right' })
      .text('Tel: +506 2222-3333', 400, 80, { align: 'right' })
      .text('info@healthtrack.cr', 400, 95, { align: 'right' });

    doc.fontSize(20).text('FACTURA', 50, 140, { align: 'center' });

    doc
      .fontSize(12)
      .text(`Factura #: ${invoiceId}`, 50, 180)
      .text(`Número: ${invoice.InvoiceNumber || 'N/A'}`, 50, 200)
      .text(`Fecha: ${formatDate(invoice.InvoiceDate)}`, 50, 220)
      .text(`Vendedor: ${invoice.SoldByName || 'N/A'}`, 50, 240);

    if (invoice.PatientName && invoice.PatientName !== 'Mostrador') {
      doc
        .text(`Cliente: ${invoice.PatientName}`, 350, 180)
        .text(`Documento: ${invoice.PatientDocument || 'N/A'}`, 350, 200);
    } else {
      doc.text(`Cliente: Mostrador`, 350, 180);
    }

    let statusText = 'ACTIVA';
    if (invoice.IsVoided) statusText = 'ANULADA';
    else if (refunds.length > 0) statusText = 'CON REEMBOLSO';

    doc.fontSize(10).text(`Estado: ${statusText}`, 350, 240);

    doc.moveTo(50, 270).lineTo(550, 270).stroke();

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Producto', 50, 290)
      .text('Cant.', 300, 290)
      .text('Precio Unit.', 350, 290)
      .text('Total', 480, 290, { align: 'right' });

    doc.font('Helvetica');

    let yPos = 315;
    items.forEach((item) => {
      doc
        .fontSize(9)
        .text(item.ProductName || '', 50, yPos, { width: 240 })
        .text(String(item.Quantity ?? ''), 300, yPos)
        .text(`CRC ${toMoney(item.UnitPrice)}`, 350, yPos)
        .text(`CRC ${toMoney(item.LineTotal)}`, 480, yPos, { align: 'right' });

      yPos += 25;

      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
    });

    yPos += 20;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 15;

    doc
      .fontSize(10)
      .text('Subtotal:', 380, yPos)
      .text(`CRC ${toMoney(invoice.Subtotal)}`, 480, yPos, { align: 'right' });

    yPos += 20;
    doc
      .text('IVA (13%):', 380, yPos)
      .text(`CRC ${toMoney(invoice.TaxTotal)}`, 480, yPos, { align: 'right' });

    if (Number(invoice.DiscountTotal) > 0) {
      yPos += 20;
      doc
        .text('Descuento:', 380, yPos)
        .text(`CRC ${toMoney(invoice.DiscountTotal)}`, 480, yPos, { align: 'right' });
    }

    if (Number(invoice.InsuranceCoverage) > 0) {
      yPos += 20;
      doc
        .text('Cobertura Seguro:', 380, yPos)
        .text(`CRC ${toMoney(invoice.InsuranceCoverage)}`, 480, yPos, { align: 'right' });
    }

    yPos += 25;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TOTAL:', 380, yPos)
      .text(`CRC ${toMoney(invoice.GrandTotal)}`, 480, yPos, { align: 'right' });

    if (Number(invoice.InsuranceCoverage) > 0) {
      yPos += 25;
      doc
        .fontSize(11)
        .text('Paciente Paga:', 380, yPos)
        .text(`CRC ${toMoney(invoice.PatientPays)}`, 480, yPos, { align: 'right' });
    }

    doc.font('Helvetica');

    if (refunds && refunds.length > 0) {
      yPos += 40;
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }

      doc.fontSize(12).font('Helvetica-Bold').text('HISTORIAL DE REEMBOLSOS', 50, yPos);
      yPos += 20;

      doc.font('Helvetica').fontSize(9);

      refunds.forEach((refund) => {
        doc
          .text(`Reembolso #${refund.RefundID} - ${formatDate(refund.ProcessedAt)}`, 50, yPos)
          .text(`Monto: CRC ${toMoney(refund.RefundAmount)}`, 70, yPos + 15)
          .text(`Método: ${refund.RefundMethod}`, 70, yPos + 30)
          .text(`Razón: ${refund.RefundReason}`, 70, yPos + 45)
          .text(`Procesado por: ${refund.ProcessedByName}`, 70, yPos + 60);

        yPos += 85;
      });
    }

    if (invoice.IsVoided) {
      yPos += 40;
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }

      doc.fontSize(12).font('Helvetica-Bold').fillColor('red').text('FACTURA ANULADA', 50, yPos);
      yPos += 20;

      doc
        .fillColor('black')
        .font('Helvetica')
        .fontSize(9)
        .text(`Razón: ${invoice.VoidReason || 'N/A'}`, 70, yPos)
        .text(`Anulado por: ${invoice.VoidedByName || 'N/A'}`, 70, yPos + 15)
        .text(`Fecha: ${formatDate(invoice.VoidedAt)}`, 70, yPos + 30);
    }

    const bottomY = 750;
    doc
      .fontSize(8)
      .fillColor('gray')
      .text('Gracias por su compra', 50, bottomY, { align: 'center', width: 500 })
      .text('HealthTrack Systems - Sistema de Gestión Farmacéutica', 50, bottomY + 15, {
        align: 'center',
        width: 500
      });

    doc.end();

    console.log(`✅ PDF generated for invoice #${invoiceId}`);
  } catch (error) {
    console.error('❌ Generate PDF error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error generating PDF',
        error: error.message
      });
    }
  }
});

// Helpers
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function toMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '0.00';
  return n.toFixed(2);
}

module.exports = router;
