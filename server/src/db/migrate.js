require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://sliceline:sliceline_dev@localhost:5432/sliceline';

async function runMigrations() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get already-applied migrations
    const { rows: applied } = await pool.query('SELECT name FROM _migrations ORDER BY id');
    const appliedNames = new Set(applied.map(r => r.name));

    // Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');

    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found, skipping migrations.');
      await pool.end();
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedNames.has(file)) {
        console.log(`Migration ${file} already applied, skipping.`);
        continue;
      }

      console.log(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      try {
        await pool.query('BEGIN');
        await pool.query(sql);
        await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        console.log(`✅ Migration ${file} applied successfully.`);
      } catch (err) {
        await pool.query('ROLLBACK');
        console.error(`❌ Migration ${file} failed:`, err.message);
        throw err;
      }
    }

    console.log('All migrations applied.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();