const pool = require('../config/db');

async function getAllAppraisals(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM appraisals ORDER BY period_key DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appraisals' });
  }
}

async function saveAppraisal(req, res) {
  const {
    period_key, period_label, revenue_snapshot,
    deal_count_snapshot, target_snapshot, wins, challenges, focus
  } = req.body;

  if (!period_key || !period_label) {
    return res.status(400).json({ error: 'period_key and period_label are required' });
  }

  try {
    // Check if an appraisal for this period already exists
    const [existing] = await pool.query(
      'SELECT id FROM appraisals WHERE period_key = ?',
      [period_key]
    );

    if (existing.length > 0) {
      // Update it
      await pool.query(
        `UPDATE appraisals SET
          revenue_snapshot = ?, deal_count_snapshot = ?, target_snapshot = ?,
          wins = ?, challenges = ?, focus = ?
         WHERE period_key = ?`,
        [revenue_snapshot, deal_count_snapshot, target_snapshot, wins, challenges, focus, period_key]
      );
      return res.json({ message: 'Appraisal updated' });
    }

    // Otherwise create it
    const [result] = await pool.query(
      `INSERT INTO appraisals
        (period_key, period_label, revenue_snapshot, deal_count_snapshot, target_snapshot, wins, challenges, focus, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [period_key, period_label, revenue_snapshot, deal_count_snapshot, target_snapshot, wins, challenges, focus, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Appraisal created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save appraisal' });
  }
}

async function deleteAppraisal(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM appraisals WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Appraisal not found' });
    }
    res.json({ message: 'Appraisal deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete appraisal' });
  }
}

module.exports = { getAllAppraisals, saveAppraisal, deleteAppraisal };