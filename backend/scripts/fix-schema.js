/**
 * Schema Fix Script
 * Adds missing columns and tables to existing database
 */

require('dotenv').config();
const { Pool } = require('pg');

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

async function fixSchema() {
    console.log('Fixing database schema...\n');

    try {
        // Add missing columns to tenants table
        console.log('1. Adding missing columns to tenants table...');
        await pool.query(`
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `).catch(e => console.log('   Columns may already exist:', e.message));
        console.log('   Done');

        // Create customers table if not exists
        console.log('2. Creating customers table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
                name VARCHAR(200) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, email)
            );
        `);
        console.log('   Done');

        // Create orders table if not exists
        console.log('3. Creating orders table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
                customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'pending',
                total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   Done');

        // Create order_items table if not exists
        console.log('4. Creating order_items table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                inventory_id INTEGER REFERENCES inventory(id) ON DELETE RESTRICT,
                quantity INTEGER NOT NULL CHECK (quantity > 0),
                price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   Done');

        // Create indexes
        console.log('5. Creating indexes...');
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);',
            'CREATE INDEX IF NOT EXISTS idx_tenants_reset_token ON tenants(reset_token);',
            'CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory(tenant_id);',
            'CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(tenant_id, sku);',
            'CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(tenant_id, barcode);',
            'CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(tenant_id, category);',
            'CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);',
            'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(tenant_id, email);',
            'CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);',
            'CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);',
            'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);',
            'CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);'
        ];

        for (const idx of indexes) {
            await pool.query(idx).catch(() => { });
        }
        console.log('   Done');

        console.log('\nSchema fix completed successfully!');

    } catch (error) {
        console.error('Schema fix failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

fixSchema();
