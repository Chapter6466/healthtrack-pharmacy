// frontend/js/reports.js
(function () {
  'use strict';

  const crcFormatter = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  document.addEventListener('DOMContentLoaded', () => init());

  async function init() {
    await initUserInfo();
    setupLogout();
    setTodayLabel();
    setupFilters();
    await loadAll();
  }

  function setTodayLabel() {
    const el = document.getElementById('currentDate');
    if (el) {
      el.textContent = new Date().toLocaleDateString('es-CR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  function setupFilters() {
    const btnApply = document.getElementById('btnApply');
    const btnClear = document.getElementById('btnClear');
    const btnLast7 = document.getElementById('btnLast7');
    const btnLast30 = document.getElementById('btnLast30');
    const btnThisMonth = document.getElementById('btnThisMonth');

    btnApply?.addEventListener('click', () => loadAll());
    btnClear?.addEventListener('click', () => {
      const start = document.getElementById('filterStartDate');
      const end = document.getElementById('filterEndDate');
      if (start) start.value = '';
      if (end) end.value = '';
      loadAll();
    });

    btnLast7?.addEventListener('click', () => setRangeDays(7));
    btnLast30?.addEventListener('click', () => setRangeDays(30));
    btnThisMonth?.addEventListener('click', () => setThisMonth());

    document.getElementById('btnExportSalesTrend')?.addEventListener('click', () => exportTableCSV('tblSalesTrend', 'sales-trend.csv'));
    document.getElementById('btnExportTopProducts')?.addEventListener('click', () => exportTableCSV('tblTopProducts', 'top-products.csv'));
    document.getElementById('btnExportRefunds')?.addEventListener('click', () => exportTableCSV('tblRefunds', 'refunds.csv'));
    document.getElementById('btnExportMovements')?.addEventListener('click', () => exportTableCSV('tblMovements', 'inventory-movements.csv'));
  }

  function setRangeDays(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const startInput = document.getElementById('filterStartDate');
    const endInput = document.getElementById('filterEndDate');
    if (startInput) startInput.value = toISODate(start);
    if (endInput) endInput.value = toISODate(end);
    loadAll();
  }

  function setThisMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startInput = document.getElementById('filterStartDate');
    const endInput = document.getElementById('filterEndDate');
    if (startInput) startInput.value = toISODate(start);
    if (endInput) endInput.value = toISODate(end);
    loadAll();
  }

  function toISODate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function getQuery() {
    const startDate = document.getElementById('filterStartDate')?.value || '';
    const endDate = document.getElementById('filterEndDate')?.value || '';
    const qs = new URLSearchParams();
    if (startDate) qs.append('startDate', startDate);
    if (endDate) qs.append('endDate', endDate);
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  async function loadAll() {
    await Promise.all([
      loadOverview(),
      loadSalesTrend(),
      loadTopProducts(),
      loadRefunds(),
      loadMovements()
    ]);
  }

  async function loadOverview() {
    const res = await fetch(`/api/reports/overview${getQuery()}`, { credentials: 'include' });
    const data = await res.json();
    if (!data.success) return;

    const o = data.overview || {};
    setText('kpiInvoices', o.TotalInvoices ?? 0);
    setText('kpiActive', o.ActiveInvoices ?? 0);
    setText('kpiVoided', o.VoidedInvoices ?? 0);
    setText('kpiGross', fmtCRC(o.GrossRevenue ?? 0));
    setText('kpiRefunds', fmtCRC(o.TotalRefunded ?? 0));
    setText('kpiRefundBreakdown', `${o.FullRefundCount ?? 0} Full / ${o.PartialRefundCount ?? 0} Partial`);
    setText('kpiNet', fmtCRC(o.NetRevenue ?? 0));
  }

  async function loadSalesTrend() {
    const res = await fetch(`/api/reports/sales-trend${getQuery()}`, { credentials: 'include' });
    const data = await res.json();
    const rows = (data.success ? data.rows : []) || [];

    const body = document.getElementById('salesTrendBody');
    if (!body) return;

    if (rows.length === 0) {
      body.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:25px; color:#666;">Sin datos</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(r => `
      <tr>
        <td>${fmtDate(r.Day)}</td>
        <td>${r.InvoiceCount ?? 0}</td>
        <td>${r.VoidedCount ?? 0}</td>
        <td>${fmtCRC(r.GrossRevenue ?? 0)}</td>
      </tr>
    `).join('');
  }

  async function loadTopProducts() {
    const res = await fetch(`/api/reports/top-products${getQuery()}&top=10`, { credentials: 'include' });
    const data = await res.json();
    const rows = (data.success ? data.rows : []) || [];

    const body = document.getElementById('topProductsBody');
    if (!body) return;

    if (rows.length === 0) {
      body.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:25px; color:#666;">Sin datos</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(r => `
      <tr>
        <td>${esc(r.ProductName)}</td>
        <td>${r.QtySold ?? 0}</td>
        <td>${fmtCRC(r.Revenue ?? 0)}</td>
      </tr>
    `).join('');
  }

  async function loadRefunds() {
    const res = await fetch(`/api/reports/refunds${getQuery()}`, { credentials: 'include' });
    const data = await res.json();
    const rows = (data.success ? data.rows : []) || [];

    const body = document.getElementById('refundsBody');
    if (!body) return;

    if (rows.length === 0) {
      body.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:25px; color:#666;">Sin datos</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(r => `
      <tr>
        <td>${esc(r.RefundMethod)}</td>
        <td>${r.RefundCount ?? 0}</td>
        <td>${fmtCRC(r.TotalRefunded ?? 0)}</td>
        <td>${r.FullRefundCount ?? 0}</td>
        <td>${r.PartialRefundCount ?? 0}</td>
      </tr>
    `).join('');
  }

  async function loadMovements() {
    const res = await fetch(`/api/reports/inventory-movements${getQuery()}`, { credentials: 'include' });
    const data = await res.json();
    const rows = (data.success ? data.rows : []) || [];

    const body = document.getElementById('movementsBody');
    if (!body) return;

    if (rows.length === 0) {
      body.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:25px; color:#666;">Sin datos</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(r => `
      <tr>
        <td>${esc(r.MovementType)}</td>
        <td>${r.Movements ?? 0}</td>
        <td>${r.TotalQty ?? 0}</td>
      </tr>
    `).join('');
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function fmtDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  function fmtCRC(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return crcFormatter.format(0);
    return crcFormatter.format(n);
  }

  function esc(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function exportTableCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tr')).map(tr =>
      Array.from(tr.querySelectorAll('th,td')).map(td => `"${String(td.innerText).replace(/"/g, '""')}"`).join(',')
    );

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
})();
