const pool = require('../config/db');

async function getAllServices(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM services ORDER BY display_name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
}

async function createService(req, res) {
  const { display_name } = req.body;
  if (!display_name || !display_name.trim()) {
    return res.status(400).json({ error: 'display_name is required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO services (display_name) VALUES (?)',
      [display_name.trim()]
    );
    res.status(201).json({ id: result.insertId, message: 'Service created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A service with this name already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create service' });
  }
}

async function updateService(req, res) {
  const { id } = req.params;
  const { display_name } = req.body;
  if (!display_name || !display_name.trim()) {
    return res.status(400).json({ error: 'display_name is required' });
  }
  try {
    const [result] = await pool.query(
      'UPDATE services SET display_name = ? WHERE id = ?',
      [display_name.trim(), id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json({ message: 'Service updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update service' });
  }
}

async function deleteService(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM services WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json({ message: 'Service deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Cannot delete — this service has sales linked to it' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to delete service' });
  }
}

module.exports = { getAllServices, createService, updateService, deleteService };