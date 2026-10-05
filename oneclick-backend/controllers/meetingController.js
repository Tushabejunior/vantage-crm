const pool = require('../config/db');

async function getAllMeetings(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT m.*, c.display_name AS client_name
      FROM meetings m
      JOIN clients c ON m.client_id = c.id
      ORDER BY m.meeting_date ASC, m.meeting_time ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
}

async function createMeeting(req, res) {
  const { client_id, title, meeting_type, meeting_date, meeting_time, notes } = req.body;
  if (!client_id || !title || !meeting_date) {
    return res.status(400).json({ error: 'client_id, title, and meeting_date are required' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO meetings (client_id, title, meeting_type, meeting_date, meeting_time, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [client_id, title, meeting_type || 'Follow-up', meeting_date, meeting_time || null, notes || '', req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Meeting created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
}

async function updateMeeting(req, res) {
  const { id } = req.params;
  const { client_id, title, meeting_type, meeting_date, meeting_time, status, notes } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE meetings SET
        client_id = ?, title = ?, meeting_type = ?, meeting_date = ?,
        meeting_time = ?, status = ?, notes = ?
       WHERE id = ?`,
      [client_id, title, meeting_type, meeting_date, meeting_time || null, status, notes || '', id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    res.json({ message: 'Meeting updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
}

async function updateMeetingStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!['Scheduled', 'Completed', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const [result] = await pool.query('UPDATE meetings SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
}

async function deleteMeeting(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM meetings WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    res.json({ message: 'Meeting deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
}

module.exports = { getAllMeetings, createMeeting, updateMeeting, updateMeetingStatus, deleteMeeting };