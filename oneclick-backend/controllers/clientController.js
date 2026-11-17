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

async function createClient(req, res) {
  const { display_name, sector } = req.body;
  if (!display_name || !display_name.trim()) {
    return res.status(400).json({ error: 'display_name is required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO clients (display_name, sector) VALUES (?, ?)',
      [display_name.trim(), sector || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Client created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A client with this name already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create client' });
  }
}

async function updateClient(req, res) {
  const { id } = req.params;
  const { display_name, sector } = req.body;
  if (!display_name || !display_name.trim()) {
    return res.status(400).json({ error: 'display_name is required' });
  }
  try {
    const [result] = await pool.query(
      'UPDATE clients SET display_name = ?, sector = ? WHERE id = ?',
      [display_name.trim(), sector || null, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A client with this name already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update client' });
  }
}

async function updateClientSector(req, res) {
  const { id } = req.params;
  const { sector } = req.body;
  try {
    const [result] = await pool.query('UPDATE clients SET sector = ? WHERE id = ?', [sector || null, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Sector updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update sector' });
  }
}

async function deleteClient(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM clients WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Cannot delete — this client has sales or meetings linked to it' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
}

module.exports = { getAllClients, createClient, updateClient, updateClientSector, deleteClient };