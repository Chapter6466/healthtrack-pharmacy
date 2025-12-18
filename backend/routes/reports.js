// backend/routes/reports.js
const express = require('express');
const router = express.Router();

const { executeStoredProcedure } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

function normalizeDate(q) {
  if (!q) return null;
  const s = String(q).trim();
  return s === '' ? null : s; // expects YYYY-MM-DD from frontend
}

// GET /api/reports/overview?startDate=&endDate=
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const startDate = normalizeDate(req.query.startDate);
    const endDate = normalizeDate(req.query.endDate);

    const result = await executeStoredProcedure('sp_Report_Overview', {
      StartDate: startDate,
      EndDate: endDate
    });

    res.json({ success: true, overview: result[0]?.[0] || {} });
  } catch (error) {
    console.error('❌ reports/overview:', error);
    res.status(500).json({ success: false, message: 'Error loading overview', error: error.message });
  }
});

// GET /api/reports/sales-trend?startDate=&endDate=
router.get('/sales-trend', requireAuth, async (req, res) => {
  try {
    const startDate = normalizeDate(req.query.startDate);
    const endDate = normalizeDate(req.query.endDate);

    const result = await executeStoredProcedure('sp_Report_SalesTrend', {
      StartDate: startDate,
      EndDate: endDate
    });

    res.json({ success: true, rows: result[0] || [] });
  } catch (error) {
    console.error('❌ reports/sales-trend:', error);
    res.status(500).json({ success: false, message: 'Error loading sales trend', error: error.message });
  }
});

// GET /api/reports/top-products?startDate=&endDate=&top=10
router.get('/top-products', requireAuth, async (req, res) => {
  try {
    const startDate = normalizeDate(req.query.startDate);
    const endDate = normalizeDate(req.query.endDate);
    const top = req.query.top ? parseInt(req.query.top, 10) : 10;

    const result = await executeStoredProcedure('sp_Report_TopProducts', {
      StartDate: startDate,
      EndDate: endDate,
      Top: Number.isFinite(top) ? top : 10
    });

    res.json({ success: true, rows: result[0] || [] });
  } catch (error) {
    console.error('❌ reports/top-products:', error);
    res.status(500).json({ success: false, message: 'Error loading top products', error: error.message });
  }
});

// GET /api/reports/refunds?startDate=&endDate=
router.get('/refunds', requireAuth, async (req, res) => {
  try {
    const startDate = normalizeDate(req.query.startDate);
    const endDate = normalizeDate(req.query.endDate);

    const result = await executeStoredProcedure('sp_Report_RefundSummary', {
      StartDate: startDate,
      EndDate: endDate
    });

    res.json({ success: true, rows: result[0] || [] });
  } catch (error) {
    console.error('❌ reports/refunds:', error);
    res.status(500).json({ success: false, message: 'Error loading refunds', error: error.message });
  }
});

// GET /api/reports/inventory-movements?startDate=&endDate=
router.get('/inventory-movements', requireAuth, async (req, res) => {
  try {
    const startDate = normalizeDate(req.query.startDate);
    const endDate = normalizeDate(req.query.endDate);

    const result = await executeStoredProcedure('sp_Report_InventoryMovement', {
      StartDate: startDate,
      EndDate: endDate
    });

    res.json({ success: true, rows: result[0] || [] });
  } catch (error) {
    console.error('❌ reports/inventory-movements:', error);
    res.status(500).json({ success: false, message: 'Error loading inventory movements', error: error.message });
  }
});

module.exports = router;
