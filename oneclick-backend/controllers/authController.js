const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Check if any admin exists yet
async function getSetupStatus(req, res) {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    res.json({ adminExists: rows[0].count > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check setup status' });
  }
}

// Create the first admin (only works if no admin exists yet)
async function createAdmin(req, res) {
  const { name, pin } = req.body;
  if (!name || !pin || pin.length < 4) {
    return res.status(400).json({ error: 'Name and a PIN of at least 4 characters are required' });
  }
  try {
    const [existing] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    if (existing[0].count > 0) {
      return res.status(403).json({ error: 'Admin already exists' });
    }
    const pinHash = await bcrypt.hash(pin, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, pin_hash, role) VALUES (?, ?, 'admin')",
      [name, pinHash]
    );
    const token = jwt.sign({ id: result.insertId, role: 'admin', name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: result.insertId, name, role: 'admin' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create admin' });
  }
}

// Add a viewer (max 3), admin-only — protected by middleware later
async function addViewer(req, res) {
  const { name, pin } = req.body;
  if (!name || !pin || pin.length < 4) {
    return res.status(400).json({ error: 'Name and a PIN of at least 4 characters are required' });
  }
  try {
    const [viewers] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'viewer'");
    if (viewers[0].count >= 3) {
      return res.status(403).json({ error: 'Viewer limit reached (3/3)' });
    }
    const pinHash = await bcrypt.hash(pin, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, pin_hash, role) VALUES (?, ?, 'viewer')",
      [name, pinHash]
    );
    res.status(201).json({ id: result.insertId, message: 'Viewer created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create viewer' });
  }
}

// Login (admin or viewer)
async function login(req, res) {
  const { userId, pin } = req.body;
  if (!userId || !pin) {
    return res.status(400).json({ error: 'userId and pin are required' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(pin, user.pin_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
}

// List users (for the login screen dropdown — id + name + role only, no pin_hash!)
async function listUsers(req, res) {
  try {
    const [rows] = await pool.query('SELECT id, name, role FROM users ORDER BY role, name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

module.exports = { getSetupStatus, createAdmin, addViewer, login, listUsers };