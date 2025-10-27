const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

router.get('/', async (req, res) => {
  const pool = await getPool();
  try {
    const [rows] = await pool.query('SELECT * FROM vendors ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const pool = await getPool();
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const [result] = await pool.query('INSERT INTO vendors (name, email) VALUES (?, ?)', [name, email || null]);
    const [rows] = await pool.query('SELECT * FROM vendors WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const pool = await getPool();
  const { id } = req.params;
  const { name, email } = req.body;
  try {
    const [result] = await pool.query('UPDATE vendors SET name = ?, email = ? WHERE id = ?', [name, email, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    const [rows] = await pool.query('SELECT * FROM vendors WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const pool = await getPool();
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM vendors WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;