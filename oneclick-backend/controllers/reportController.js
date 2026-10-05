const pool = require('../config/db');

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

function getDateRange(period, refDate) {
  const now = refDate || new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();

  if (period === 'daily') {
    const dateStr = toDateStr(y, m, d);
    return { startStr: dateStr, endStr: dateStr, label: dateStr };
  }
  if (period === 'weekly') {
    const day = now.getDay();
    const startDate = new Date(y, m, d - day);
    const endDate = new Date(y, m, d - day + 6);
    const startStr = toDateStr(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endStr = toDateStr(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    return { startStr, endStr, label: `${startStr} to ${endStr}` };
  }
  if (period === 'monthly') {
    const lastDay = new Date(y, m + 1, 0).getDate();
    const startStr = toDateStr(y, m, 1);
    const endStr = toDateStr(y, m, lastDay);
    return { startStr, endStr, label: now.toLocaleString('default', { month: 'long', year: 'numeric' }) };
  }
  if (period === 'annual') {
    return { startStr: `${y}-01-01`, endStr: `${y}-12-31`, label: `${y}` };
  }
  if (period === 'all-time') {
  return { startStr: '2000-01-01', endStr: '2100-01-01', label: 'All time', isAllTime: true };
}
}

async function generateReport(req, res) {
  const { period } = req.params;
  try {
    const { startStr, endStr, label } = getDateRange(period);

    const [rows] = await pool.query(
      `SELECT s.*, c.display_name AS client_name, sv.display_name AS service_name
       FROM sales s
       JOIN clients c ON s.client_id = c.id
       JOIN services sv ON s.service_id = sv.id
       WHERE (s.date_paid BETWEEN ? AND ?) OR (s.date_paid IS NULL AND s.sale_month BETWEEN ? AND ?)`,
      [startStr, endStr, startStr.slice(0, 7), endStr.slice(0, 7)]
    );

    const paid = rows.filter(r => r.date_paid);
    const pending = rows.filter(r => !r.date_paid);
    const totalRevenue = paid.reduce((a, r) => a + Number(r.commission), 0);
    const totalPending = pending.reduce((a, r) => a + Number(r.commission), 0);

    const clientMap = new Map();
    rows.forEach(r => {
      clientMap.set(r.client_name, (clientMap.get(r.client_name) || 0) + Number(r.commission));
    });
    const topClients = Array.from(clientMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const serviceMap = new Map();
    rows.forEach(r => {
      serviceMap.set(r.service_name, (serviceMap.get(r.service_name) || 0) + Number(r.commission));
    });
    const topServices = Array.from(serviceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    res.json({
      period, label, startDate: startStr, endDate: endStr,
      totalDeals: rows.length, paidDeals: paid.length, pendingDeals: pending.length,
      totalRevenue, totalPending,
      topClients, topServices,
      entries: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

module.exports = { generateReport };