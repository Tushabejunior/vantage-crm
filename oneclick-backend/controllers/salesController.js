const pool = require('../config/db');

function round2(n) { return Math.round(n * 100) / 100; }

async function getVatRate() {
  const [rows] = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'vat_rate'");
  const v = rows.length ? parseFloat(rows[0].setting_value) : 0.18;
  return isNaN(v) ? 0.18 : v;
}

// Commission is always calculated here from the amount and rate.
// Incl-VAT is calculated too, unless an amount was supplied.
async function buildAmounts(body) {
  const excl = parseFloat(body.amount_excl_vat) || 0;
  let rate = parseFloat(body.commission_rate);
  if (isNaN(rate)) rate = 0.15;
  const vat = await getVatRate();
  const suppliedIncl = parseFloat(body.amount_incl_vat);
  return {
    excl,
    rate,
    incl: suppliedIncl > 0 ? suppliedIncl : round2(excl * (1 + vat)),
    commission: round2(excl * rate),
  };
}

function validate(body) {
  if (!body.client_id || !body.service_id) return 'client_id and service_id are required';
  if (!(parseFloat(body.amount_excl_vat) > 0)) return 'amount_excl_vat must be greater than 0';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.sale_month || '')) return 'sale_month must look like 2026-07';
  return null;
}

async function getAllSales(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.id, s.client_id, c.display_name AS client_name,
        s.service_id, sv.display_name AS service_name,
        s.amount_excl_vat, s.amount_incl_vat, s.commission_rate, s.commission,
        s.date_paid, s.invoice_number, s.sale_month, s.notes, s.created_at
      FROM sales s
      JOIN clients c ON s.client_id = c.id
      JOIN services sv ON s.service_id = sv.id
      ORDER BY s.date_paid DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
}

async function createSale(req, res) {
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ error: problem });
  try {
    const a = await buildAmounts(req.body);
    const b = req.body;
    const [result] = await pool.query(
      `INSERT INTO sales
        (client_id, service_id, amount_excl_vat, amount_incl_vat, commission_rate, commission,
         date_paid, invoice_number, sale_month, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.client_id, b.service_id, a.excl, a.incl, a.rate, a.commission,
       b.date_paid || null, b.invoice_number || '', b.sale_month, b.notes || '', req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Sale created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create sale' });
  }
}

async function updateSale(req, res) {
  const { id } = req.params;
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ error: problem });
  try {
    const a = await buildAmounts(req.body);
    const b = req.body;
    const [result] = await pool.query(
      `UPDATE sales SET
        client_id = ?, service_id = ?, amount_excl_vat = ?, amount_incl_vat = ?,
        commission_rate = ?, commission = ?, date_paid = ?, invoice_number = ?,
        sale_month = ?, notes = ?
       WHERE id = ?`,
      [b.client_id, b.service_id, a.excl, a.incl, a.rate, a.commission,
       b.date_paid || null, b.invoice_number || '', b.sale_month, b.notes || '', id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json({ message: 'Sale updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update sale' });
  }
}

async function deleteSale(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM sales WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json({ message: 'Sale deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete sale' });
  }
}

module.exports = { getAllSales, createSale, updateSale, deleteSale };