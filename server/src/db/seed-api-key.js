#!/usr/bin/env node
/**
 * Seed script to create an initial API key for the Demo Pizza franchise.
 *
 * Usage:
 *   node src/db/seed-api-key.js
 *
 * Environment:
 *   DATABASE_URL — PostgreSQL connection string
 *
 * Output:
 *   Prints the raw API key ONCE (store it securely!)
 */

const crypto = require('crypto');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://sliceline:sliceline_dev@localhost:5432/sliceline';

async function seedApiKey() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Find the Demo Pizza franchise
    const { rows: franchises } = await pool.query(
      "SELECT id, name FROM franchises WHERE slug = 'demo-pizza' OR name ILIKE '%demo%' LIMIT 1"
    );

    let franchiseId;
    if (franchises.length > 0) {
      franchiseId = franchises[0].id;
      console.log(`Found franchise: ${franchises[0].name} (${franchiseId})`);
    } else {
      // Use the first franchise
      const { rows: allFranchises } = await pool.query('SELECT id, name FROM franchises ORDER BY created_at LIMIT 1');
      if (allFranchises.length === 0) {
        console.error('No franchises found. Run seed.sql first.');
        process.exit(1);
      }
      franchiseId = allFranchises[0].id;
      console.log(`Using franchise: ${allFranchises[0].name} (${franchiseId})`);
    }

    // Generate API key
    const randomBytes = crypto.randomBytes(24).toString('base64url');
    const rawKey = `sk_live_${randomBytes}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 8);

    // Insert into api_keys
    const { rows: [apiKey] } = await pool.query(
      `INSERT INTO api_keys (key_hash, key_prefix, name, franchise_id, permissions, rate_limit, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (key_hash) DO NOTHING
       RETURNING id, key_prefix, name, permissions, rate_limit, is_active, created_at`,
      [keyHash, keyPrefix, 'Demo Pizza — Default API Key', franchiseId, JSON.stringify(['read', 'write', 'admin']), 200, true]
    );

    if (!apiKey) {
      console.error('API key already exists or insert failed.');
      process.exit(1);
    }

    console.log('');
    console.log('✅ API Key created successfully!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  API Key (save this — it will NOT be shown again):');
    console.log('');
    console.log(`  ${rawKey}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`  Key ID:       ${apiKey.id}`);
    console.log(`  Key Prefix:   ${apiKey.key_prefix}`);
    console.log(`  Name:         ${apiKey.name}`);
    console.log(`  Franchise:    ${franchiseId}`);
    console.log(`  Permissions:  ${apiKey.permissions.join(', ')}`);
    console.log(`  Rate Limit:   ${apiKey.rate_limit} req/min`);
    console.log(`  Created:      ${apiKey.created_at}`);
    console.log('');
    console.log('  Usage:');
    console.log(`    curl -H "Authorization: Bearer ${rawKey}" https://sliceline.greyrockstudios.com/api/orders`);
    console.log(`    curl -H "x-api-key: ${rawKey}" https://sliceline.greyrockstudios.com/api/dashboard/<location-id>`);
    console.log('');

  } catch (err) {
    console.error('Error seeding API key:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedApiKey();