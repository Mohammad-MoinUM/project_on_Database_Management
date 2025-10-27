const fs = require('fs');
const path = require('path');
const { getPool, DB_NAME } = require('./db');

async function runMigrations({ seed = false } = {}) {
  const pool = await getPool();
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const seedPath = path.join(__dirname, '..', 'db', 'seed.sql');

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);

  if (seed && fs.existsSync(seedPath)) {
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await pool.query(seedSql);
  }
}

module.exports = { runMigrations };