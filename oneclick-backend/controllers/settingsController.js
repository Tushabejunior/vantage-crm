const pool = require('../config/db');

async function getSettings(req, res) {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

async function updateSetting(req, res) {
  const { key } = req.params;
  const { value } = req.body;
  if (!value || !value.trim()) {
    return res.status(400).json({ error: 'A value is required' });
  }
  try {
    const [result] = await pool.query(
      'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
      [value.trim(), key]
    );
    if (result.affectedRows === 0) {
      // key doesn't exist yet, insert it
      await pool.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, value.trim()]);
    }
    res.json({ message: 'Setting updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update setting' });
  }
}

module.exports = { getSettings, updateSetting };