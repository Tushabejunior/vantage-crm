const pool = require('../config/db');

// Get all targets as a simple object: { monthlyRevenue: 1000000, avgDealSize: 130000, ... }
async function getAllTargets(req, res) {
  try {
    const [rows] = await pool.query('SELECT target_key, target_value FROM targets');
    const targets = {};
    rows.forEach(r => { targets[r.target_key] = parseFloat(r.target_value); });
    res.json(targets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch targets' });
  }
}

// Update a single target by key
async function updateTarget(req, res) {
  const { key } = req.params;
  const { value } = req.body;
  if (value === undefined || isNaN(value)) {
    return res.status(400).json({ error: 'A numeric value is required' });
  }
  try {
    const [result] = await pool.query(
      'UPDATE targets SET target_value = ? WHERE target_key = ?',
      [value, key]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Target key not found' });
    }
    res.json({ message: 'Target updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update target' });
  }
}

module.exports = { getAllTargets, updateTarget };