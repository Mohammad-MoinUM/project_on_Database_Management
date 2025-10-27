require('dotenv').config();
const { ensureDatabase } = require('../src/db');
const { runMigrations } = require('../src/migrations');

async function main() {
  try {
    console.log('Ensuring database exists...');
    await ensureDatabase();
    console.log('Applying schema and seed data...');
    await runMigrations({ seed: true });
    console.log('✅ Database seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();