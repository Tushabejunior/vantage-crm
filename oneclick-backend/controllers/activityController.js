const pool = require('../config/db');

const TYPES = ['Call', 'Email', 'Meeting', 'Visit', 'Note'];

function validate(body) {
  if (!body.client_id) return 'client_id is required';
  if (!body.summary || !body.summary.trim()) return 'summary is required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.activity_date || '')) return 'activity_date must look like 2026-11-18';
  if (!TYPES.includes(body.activity_type)) return 'Invalid activity_type';
  return null;
}

async function getAllActivities(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, c.display_name AS client_name
      FROM activities a
      JOIN clients c ON a.client_id = c.id
      ORDER BY a.activity_date DESC, a.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
}

async function createActivity(req, res) {
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ error: problem });
  const b = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO activities (client_id, activity_type, summary, details, activity_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [b.client_id, b.activity_type, b.summary.trim(), b.details || '', b.activity_date, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Activity logged' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
}

async function updateActivity(req, res) {
  const { id } = req.params;
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ error: problem });
  const b = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE activities SET client_id = ?, activity_type = ?, summary = ?, details = ?, activity_date = ?
       WHERE id = ?`,
      [b.client_id, b.activity_type, b.summary.trim(), b.details || '', b.activity_date, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json({ message: 'Activity updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update activity' });
  }
}

async function deleteActivity(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM activities WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
}

module.exports = { getAllActivities, createActivity, updateActivity, deleteActivity };