const path = require('path');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { getPool, ensureDatabase } = require('./db');
const { runMigrations } = require('./migrations');

const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const vendorsRouter = require('./routes/vendors');
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');
const analyticsRouter = require('./routes/analytics');

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// View engine
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');

// Pages
app.get('/', (req, res) => {
  res.render('index', { title: 'E-commerce Marketplace' });
});

app.get('/products', (req, res) => {
  res.render('products', { title: 'Products' });
});

app.get('/categories', (req, res) => {
  res.render('categories', { title: 'Categories' });
});

app.get('/vendors', (req, res) => {
  res.render('vendors', { title: 'Vendors' });
});

app.get('/customers', (req, res) => {
  res.render('customers', { title: 'Customers' });
});

app.get('/orders', (req, res) => {
  res.render('orders', { title: 'Orders' });
});

app.get('/analytics', (req, res) => {
  res.render('analytics', { title: 'Analytics' });
});

// API routes
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/analytics', analyticsRouter);

// Health
app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await ensureDatabase();
    const migrate = (process.env.MIGRATE_ON_START || 'true').toLowerCase() === 'true';
    if (migrate) {
      const seed = (process.env.SEED_ON_START || 'true').toLowerCase() === 'true';
      await runMigrations({ seed });
    }
  } catch (err) {
    console.error('Startup DB/migrations error:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start();