const pool = require('../config/db');

async function getAllClients(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM clients ORDER BY display_name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
}

async function updateClientSector(req, res) {
  const { id } = req.params;
  const { sector } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE clients SET sector = ? WHERE id = ?',
      [sector || null, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Sector updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update sector' });
  }
}

module.exports = { getAllClients, updateClientSector };