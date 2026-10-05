const pool = require('../config/db');

async function getAllSales(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id,
        s.client_id,
        c.display_name AS client_name,
        s.service_id,
        sv.display_name AS service_name,
        s.amount_excl_vat,
        s.amount_incl_vat,
        s.commission_rate,
        s.commission,
        s.date_paid,
        s.invoice_number,
        s.sale_month,
        s.notes,
        s.created_at
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

// CREATE a new sale
async function createSale(req, res) {
  const {
    client_id, service_id, amount_excl_vat, amount_incl_vat,
    commission_rate, commission, date_paid, invoice_number,
    sale_month, notes
  } = req.body;

  if (!client_id || !service_id || !amount_excl_vat || !sale_month) {
    return res.status(400).json({ error: 'client_id, service_id, amount_excl_vat and sale_month are required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO sales 
        (client_id, service_id, amount_excl_vat, amount_incl_vat, commission_rate, commission, date_paid, invoice_number, sale_month, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [client_id, service_id, amount_excl_vat, amount_incl_vat || 0,
       commission_rate || 0.15, commission || (amount_excl_vat * (commission_rate || 0.15)),
       date_paid || null, invoice_number || '', sale_month, notes || '']
    );
    res.status(201).json({ id: result.insertId, message: 'Sale created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create sale' });
  }
}

// UPDATE an existing sale
async function updateSale(req, res) {
  const { id } = req.params;
  const {
    client_id, service_id, amount_excl_vat, amount_incl_vat,
    commission_rate, commission, date_paid, invoice_number,
    sale_month, notes
  } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE sales SET
        client_id = ?, service_id = ?, amount_excl_vat = ?, amount_incl_vat = ?,
        commission_rate = ?, commission = ?, date_paid = ?, invoice_number = ?,
        sale_month = ?, notes = ?
       WHERE id = ?`,
      [client_id, service_id, amount_excl_vat, amount_incl_vat,
       commission_rate, commission, date_paid || null, invoice_number,
       sale_month, notes, id]
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

// DELETE a sale
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
