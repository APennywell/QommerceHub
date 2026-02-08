const { Pool } = require('pg');
require('dotenv').config();

// Support both DATABASE_URL (Railway/Heroku) and individual env vars (local)
const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        // Always use SSL with DATABASE_URL (Railway/Heroku require it)
        ssl: { rejectUnauthorized: false },
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

// Test connection (non-blocking — pool retries automatically on next query)
pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL');
        client.release();
    })
    .catch(err => {
        console.error('Initial database connection failed:', err.message);
        console.error('The pool will retry automatically on next query');
    });

module.exports = pool;