/**
 * Database Migration Script
 * Runs all SQL migrations in order with idempotency tracking
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration (same as db.js)
const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };

const pool = new Pool(poolConfig);

/**
 * Ensure migration tracking table exists
 */
async function ensureMigrationTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            checksum VARCHAR(64)
        )
    `);
}

/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations() {
    const result = await pool.query('SELECT name, checksum FROM _migrations ORDER BY id');
    return new Map(result.rows.map(row => [row.name, row.checksum]));
}

/**
 * Calculate simple checksum for migration content
 */
function calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Record a migration as executed
 */
async function recordMigration(name, checksum) {
    await pool.query(
        'INSERT INTO _migrations (name, checksum) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [name, checksum]
    );
}

async function runMigrations() {
    const migrationsDir = path.join(__dirname, '../migrations');

    try {
        // Ensure tracking table exists
        await ensureMigrationTable();
        console.log('Migration tracking table ready');

        // Get already executed migrations
        const executed = await getExecutedMigrations();
        console.log(`Found ${executed.size} previously executed migrations`);

        // Get all SQL files sorted by name
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log(`Found ${files.length} migration files`);

        let newMigrations = 0;
        let skipped = 0;

        for (const file of files) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            const checksum = calculateChecksum(sql);

            if (executed.has(file)) {
                const existingChecksum = executed.get(file);
                if (existingChecksum !== checksum) {
                    console.warn(`  WARNING: ${file} has changed since last run!`);
                    console.warn(`    Previous checksum: ${existingChecksum}`);
                    console.warn(`    Current checksum:  ${checksum}`);
                }
                skipped++;
                continue;
            }

            console.log(`Running migration: ${file}`);

            // Run migration in a transaction for atomicity
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query(
                    'INSERT INTO _migrations (name, checksum) VALUES ($1, $2)',
                    [file, checksum]
                );
                await client.query('COMMIT');
                console.log(`  Completed: ${file}`);
                newMigrations++;
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        }

        console.log('');
        console.log('Migration summary:');
        console.log(`  New migrations run: ${newMigrations}`);
        console.log(`  Already executed:   ${skipped}`);
        console.log('All migrations completed successfully');
    } catch (error) {
        console.error('Migration failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();
