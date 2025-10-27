const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// List orders with aggregates
router.get('/', async (req, res) => {
  const pool = await getPool();
  try {
    const [rows] = await pool.query(
      `SELECT o.id, o.customer_id, c.name AS customer_name, o.status, o.created_at,
              COALESCE(SUM(oi.quantity * oi.price), 0) AS total_amount,
              COUNT(oi.id) AS item_count
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single order with items
router.get('/:id', async (req, res) => {
  const pool = await getPool();
  const { id } = req.params;
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orders.length) return res.status(404).json({ error: 'Not found' });
    const [items] = await pool.query(
      `SELECT oi.*, p.name AS product_name
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [id]
    );
    res.json({ ...orders[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create order
router.post('/', async (req, res) => {
  const pool = await getPool();
  const { customer_id, items = [], status = 'pending' } = req.body;
  if (!customer_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customer_id and items required' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [orderResult] = await conn.query('INSERT INTO orders (customer_id, status) VALUES (?, ?)', [customer_id, status]);
    const orderId = orderResult.insertId;

    for (const item of items) {
      const { product_id, quantity } = item;
      if (!product_id || !quantity || quantity <= 0) {
        throw new Error('Each item needs product_id and positive quantity');
      }
      const [prodRows] = await conn.query('SELECT price, stock FROM products WHERE id = ?', [product_id]);
      if (!prodRows.length) throw new Error(`Product ${product_id} not found`);
      const price = prodRows[0].price;
      const stock = prodRows[0].stock;
      if (stock < quantity) throw new Error(`Insufficient stock for product ${product_id}`);
      await conn.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, product_id, quantity, price]);
      await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, product_id]);
    }

    await conn.commit();

    const [orders] = await pool.query(
      `SELECT o.id, o.customer_id, c.name AS customer_name, o.status, o.created_at,
              COALESCE(SUM(oi.quantity * oi.price), 0) AS total_amount,
              COUNT(oi.id) AS item_count
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = ?
       GROUP BY o.id`,
      [orderId]
    );
    res.status(201).json(orders[0]);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Update order status
router.put('/:id', async (req, res) => {
  const pool = await getPool();
  const { id } = req.params;
  const { status } = req.body;
  try {
    const [result] = await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    res.json(orders[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete order (restores stock)
router.delete('/:id', async (req, res) => {
  const pool = await getPool();
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [items] = await conn.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
    for (const it of items) {
      await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [it.quantity, it.product_id]);
    }
    await conn.query('DELETE FROM order_items WHERE order_id = ?', [id]);
    const [result] = await conn.query('DELETE FROM orders WHERE id = ?', [id]);
    await conn.commit();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;