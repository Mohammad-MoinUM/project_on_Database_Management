const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// Top categories by product count (group by)
router.get('/top-categories', async (req, res) => {
  const pool = await getPool();
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, COUNT(pc.product_id) AS product_count
       FROM categories c
       LEFT JOIN product_categories pc ON pc.category_id = c.id
       GROUP BY c.id
       ORDER BY product_count DESC, c.name ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sales by day (aggregation + group by)
router.get('/sales-by-day', async (req, res) => {
  const pool = await getPool();
  try {
    const [rows] = await pool.query(
      `SELECT DATE(o.created_at) AS day,
              COALESCE(SUM(oi.quantity * oi.price), 0) AS total_sales,
              COUNT(DISTINCT o.id) AS orders_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       GROUP BY day
       ORDER BY day DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendors with more than N products (subquery)
router.get('/vendors-with-many-products', async (req, res) => {
  const pool = await getPool();
  const n = Number(req.query.n || 2);
  try {
    const [rows] = await pool.query(
      `SELECT v.*
       FROM vendors v
       WHERE (SELECT COUNT(*) FROM products p WHERE p.vendor_id = v.id) > ?
       ORDER BY v.name ASC`,
      [n]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products not ordered (subquery NOT EXISTS)
router.get('/products-not-ordered', async (req, res) => {
  const pool = await getPool();
  try {
    const [rows] = await pool.query(
      `SELECT p.*
       FROM products p
       WHERE NOT EXISTS (
         SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
       )
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Top products by quantity sold (join + aggregation)
router.get('/top-products', async (req, res) => {
  const pool = await getPool();
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, v.name AS vendor_name,
              COALESCE(SUM(oi.quantity), 0) AS qty_sold,
              COALESCE(SUM(oi.quantity * oi.price), 0) AS revenue
       FROM products p
       JOIN vendors v ON v.id = p.vendor_id
       LEFT JOIN order_items oi ON oi.product_id = p.id
       GROUP BY p.id
       ORDER BY qty_sold DESC, revenue DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Average ratings per product (join + group by)
router.get('/product-ratings', async (req, res) => {
  const pool = await getPool();
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.name,
              AVG(r.rating) AS avg_rating,
              COUNT(r.id) AS reviews_count
       FROM products p
       LEFT JOIN reviews r ON r.product_id = p.id
       GROUP BY p.id
       ORDER BY avg_rating DESC IS NULL, avg_rating DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;