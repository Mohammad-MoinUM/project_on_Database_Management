const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// List products with optional filters and joins
router.get('/', async (req, res) => {
  const pool = await getPool();
  const {
    search = '',
    category_id,
    vendor_id,
    min_price,
    max_price,
    sort = 'created_desc',
  } = req.query;

  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (vendor_id) {
    conditions.push('p.vendor_id = ?');
    params.push(vendor_id);
  }
  if (min_price) {
    conditions.push('p.price >= ?');
    params.push(min_price);
  }
  if (max_price) {
    conditions.push('p.price <= ?');
    params.push(max_price);
  }
  if (category_id) {
    conditions.push('EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = ?)');
    params.push(category_id);
  }

  let orderBy = 'p.created_at DESC';
  if (sort === 'price_asc') orderBy = 'p.price ASC';
  if (sort === 'price_desc') orderBy = 'p.price DESC';
  if (sort === 'created_asc') orderBy = 'p.created_at ASC';

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT p.*, v.name AS vendor_name,
           GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS category_names
    FROM products p
    JOIN vendors v ON v.id = p.vendor_id
    LEFT JOIN product_categories pc ON pc.product_id = p.id
    LEFT JOIN categories c ON c.id = pc.category_id
    ${where}
    GROUP BY p.id
    ORDER BY ${orderBy}
  `;

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product with categories
router.get('/:id', async (req, res) => {
  const pool = await getPool();
  const { id } = req.params;
  try {
    const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!products.length) return res.status(404).json({ error: 'Not found' });

    const [cats] = await pool.query(
      `SELECT c.* FROM categories c
       JOIN product_categories pc ON pc.category_id = c.id
       WHERE pc.product_id = ?`,
      [id]
    );
    res.json({ ...products[0], categories: cats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post('/', async (req, res) => {
  const pool = await getPool();
  const { name, description, price, stock = 0, vendor_id, category_ids = [] } = req.body;
  if (!name || !price || !vendor_id) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const [result] = await pool.query(
      'INSERT INTO products (name, description, price, stock, vendor_id) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', price, stock, vendor_id]
    );
    const productId = result.insertId;
    if (Array.isArray(category_ids)) {
      for (const cid of category_ids) {
        await pool.query('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)', [productId, cid]);
      }
    }
    const [productRows] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
    res.status(201).json(productRows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  const pool = await getPool();
  const { id } = req.params;
  const { name, description, price, stock, vendor_id, category_ids } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Not found' });

    await pool.query(
      'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, vendor_id = ? WHERE id = ?',
      [name, description, price, stock, vendor_id, id]
    );

    if (Array.isArray(category_ids)) {
      await pool.query('DELETE FROM product_categories WHERE product_id = ?', [id]);
      for (const cid of category_ids) {
        await pool.query('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)', [id, cid]);
      }
    }
    const [productRows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    res.json(productRows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  const pool = await getPool();
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM product_categories WHERE product_id = ?', [id]);
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;