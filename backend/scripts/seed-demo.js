/**
 * Demo Data Seeder for QommerceHub
 *
 * Creates realistic demo data for client presentations:
 * - 1 Demo tenant/store (Urban Style Boutique)
 * - 18 Products across 4 categories
 * - 10 Customers with realistic profiles
 * - 15 Orders with various statuses
 *
 * Usage: node scripts/seed-demo.js
 *        npm run seed:demo
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Demo tenant credentials
const DEMO_TENANT = {
    email: 'demo@urbanstyle.shop',
    password: 'DemoPassword123!',
    store_name: 'Urban Style Boutique'
};

// 18 Products across 4 categories
const DEMO_PRODUCTS = [
    // Electronics (5 items)
    { name: 'Wireless Bluetooth Earbuds Pro', sku: 'ELEC-001', quantity: 45, price: 79.99, category: 'Electronics', description: 'Premium wireless earbuds with active noise cancellation and 24-hour battery life' },
    { name: 'Smart Watch Series X', sku: 'ELEC-002', quantity: 28, price: 249.99, category: 'Electronics', description: 'Advanced fitness tracking, heart rate monitor, GPS, and smartphone notifications' },
    { name: 'Portable Power Bank 20000mAh', sku: 'ELEC-003', quantity: 120, price: 39.99, category: 'Electronics', description: 'Fast-charging portable charger with dual USB ports and LED display' },
    { name: 'USB-C Hub 7-in-1', sku: 'ELEC-004', quantity: 65, price: 49.99, category: 'Electronics', description: 'Multi-port adapter with HDMI, USB 3.0, SD card reader for laptops' },
    { name: 'Wireless Charging Pad', sku: 'ELEC-005', quantity: 80, price: 29.99, category: 'Electronics', description: 'Qi-compatible 15W fast wireless charging station' },

    // Clothing (5 items)
    { name: 'Classic Denim Jacket', sku: 'CLO-001', quantity: 35, price: 89.99, category: 'Clothing', description: 'Vintage wash cotton denim with brass buttons, unisex fit' },
    { name: 'Premium Cotton T-Shirt', sku: 'CLO-002', quantity: 150, price: 24.99, category: 'Clothing', description: '100% organic cotton, pre-shrunk, available in 12 colors' },
    { name: 'Slim Fit Chino Pants', sku: 'CLO-003', quantity: 60, price: 59.99, category: 'Clothing', description: 'Comfortable stretch fabric with modern slim fit' },
    { name: 'Wool Blend Sweater', sku: 'CLO-004', quantity: 42, price: 79.99, category: 'Clothing', description: 'Warm merino wool blend, perfect for layering' },
    { name: 'Athletic Performance Hoodie', sku: 'CLO-005', quantity: 55, price: 64.99, category: 'Clothing', description: 'Moisture-wicking fabric with zippered pockets' },

    // Accessories (5 items)
    { name: 'Leather Wallet - Bifold', sku: 'ACC-001', quantity: 90, price: 45.99, category: 'Accessories', description: 'Genuine full-grain leather with RFID blocking technology' },
    { name: 'Aviator Sunglasses', sku: 'ACC-002', quantity: 70, price: 34.99, category: 'Accessories', description: 'UV400 protection, polarized lenses, metal frame' },
    { name: 'Canvas Messenger Bag', sku: 'ACC-003', quantity: 25, price: 69.99, category: 'Accessories', description: 'Water-resistant canvas with padded 15" laptop compartment' },
    { name: 'Leather Belt - Brown', sku: 'ACC-004', quantity: 85, price: 39.99, category: 'Accessories', description: 'Genuine leather with brushed nickel buckle' },
    { name: 'Silk Tie Collection', sku: 'ACC-005', quantity: 40, price: 29.99, category: 'Accessories', description: 'Hand-crafted silk ties in assorted patterns' },

    // Footwear (3 items)
    { name: 'Classic Canvas Sneakers', sku: 'FOOT-001', quantity: 75, price: 54.99, category: 'Footwear', description: 'Timeless low-top design with cushioned insole' },
    { name: 'Leather Oxford Shoes', sku: 'FOOT-002', quantity: 30, price: 129.99, category: 'Footwear', description: 'Premium leather dress shoes with Goodyear welt construction' },
    { name: 'Running Shoes Pro', sku: 'FOOT-003', quantity: 48, price: 89.99, category: 'Footwear', description: 'Lightweight mesh upper with responsive foam cushioning' }
];

// 10 Customers with realistic profiles
const DEMO_CUSTOMERS = [
    { name: 'Sarah Johnson', email: 'sarah.johnson@email.com', phone: '555-0101', address: '123 Oak Street, Austin, TX 78701' },
    { name: 'Michael Chen', email: 'mchen@email.com', phone: '555-0102', address: '456 Maple Avenue, San Francisco, CA 94102' },
    { name: 'Emily Rodriguez', email: 'emily.r@email.com', phone: '555-0103', address: '789 Pine Road, Denver, CO 80202' },
    { name: 'David Kim', email: 'dkim@email.com', phone: '555-0104', address: '321 Cedar Lane, Seattle, WA 98101' },
    { name: 'Jessica Williams', email: 'jwilliams@email.com', phone: '555-0105', address: '654 Birch Boulevard, Portland, OR 97201' },
    { name: 'Robert Martinez', email: 'rmartinez@email.com', phone: '555-0106', address: '987 Elm Street, Phoenix, AZ 85001' },
    { name: 'Amanda Thompson', email: 'athompson@email.com', phone: '555-0107', address: '147 Willow Way, Nashville, TN 37201' },
    { name: 'James Wilson', email: 'jwilson@email.com', phone: '555-0108', address: '258 Spruce Court, Atlanta, GA 30301' },
    { name: 'Lisa Anderson', email: 'landerson@email.com', phone: '555-0109', address: '369 Redwood Drive, Miami, FL 33101' },
    { name: 'Christopher Lee', email: 'clee@email.com', phone: '555-0110', address: '741 Aspen Circle, Chicago, IL 60601' }
];

// 15 Order templates with varied statuses
const ORDER_TEMPLATES = [
    // Completed orders (5)
    { customerIndex: 0, status: 'completed', items: [{ productIndex: 0, quantity: 1 }, { productIndex: 11, quantity: 2 }], notes: 'Gift wrapped please' },
    { customerIndex: 1, status: 'completed', items: [{ productIndex: 5, quantity: 1 }, { productIndex: 6, quantity: 3 }], notes: 'Express shipping requested' },
    { customerIndex: 2, status: 'completed', items: [{ productIndex: 15, quantity: 1 }], notes: 'Size 10' },
    { customerIndex: 3, status: 'completed', items: [{ productIndex: 1, quantity: 1 }, { productIndex: 10, quantity: 1 }], notes: 'Birthday gift' },
    { customerIndex: 4, status: 'completed', items: [{ productIndex: 7, quantity: 2 }, { productIndex: 13, quantity: 1 }], notes: 'Color: Navy Blue' },

    // Processing orders (4)
    { customerIndex: 5, status: 'processing', items: [{ productIndex: 2, quantity: 1 }, { productIndex: 4, quantity: 2 }], notes: 'Handle with care' },
    { customerIndex: 6, status: 'processing', items: [{ productIndex: 8, quantity: 1 }], notes: 'Size Medium' },
    { customerIndex: 7, status: 'processing', items: [{ productIndex: 16, quantity: 1 }, { productIndex: 12, quantity: 1 }], notes: 'Business address' },
    { customerIndex: 8, status: 'processing', items: [{ productIndex: 3, quantity: 3 }], notes: 'Bulk order for office' },

    // Pending orders (4)
    { customerIndex: 9, status: 'pending', items: [{ productIndex: 9, quantity: 1 }, { productIndex: 14, quantity: 2 }], notes: 'Call before delivery' },
    { customerIndex: 0, status: 'pending', items: [{ productIndex: 17, quantity: 1 }], notes: 'Size 9.5' },
    { customerIndex: 1, status: 'pending', items: [{ productIndex: 6, quantity: 2 }, { productIndex: 11, quantity: 1 }], notes: 'Leave at door' },
    { customerIndex: 2, status: 'pending', items: [{ productIndex: 0, quantity: 1 }], notes: 'Gift receipt needed' },

    // Cancelled orders (2)
    { customerIndex: 3, status: 'cancelled', items: [{ productIndex: 5, quantity: 1 }], notes: 'Customer changed mind' },
    { customerIndex: 4, status: 'cancelled', items: [{ productIndex: 10, quantity: 2 }, { productIndex: 15, quantity: 1 }], notes: 'Duplicate order' }
];

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function seedDemoData() {
    console.log('\n' + '='.repeat(55));
    log('  QommerceHub - Demo Data Seeder', 'cyan');
    console.log('='.repeat(55));

    let token = null;
    let productsCreated = [];
    let customersCreated = [];
    let ordersCreated = 0;

    try {
        // Step 1: Create or login demo tenant
        log('\n[Step 1] Setting up demo tenant...', 'yellow');

        // Try to create new tenant
        const signupResponse = await fetch(`${BASE_URL}/api/tenants/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(DEMO_TENANT)
        });

        if (signupResponse.status === 201) {
            log('  + Created new demo tenant', 'green');
        } else {
            log('  ~ Demo tenant already exists, logging in...', 'dim');
        }

        // Login to get token
        const loginResponse = await fetch(`${BASE_URL}/api/tenants/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: DEMO_TENANT.email,
                password: DEMO_TENANT.password
            })
        });

        if (!loginResponse.ok) {
            const errorData = await loginResponse.text();
            throw new Error(`Login failed: ${loginResponse.status} - ${errorData}`);
        }

        const loginData = await loginResponse.json();
        token = loginData.token;
        log('  + Authenticated successfully', 'green');

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // Step 2: Create products
        log('\n[Step 2] Creating inventory items...', 'yellow');

        for (const product of DEMO_PRODUCTS) {
            const response = await fetch(`${BASE_URL}/api/inventory`, {
                method: 'POST',
                headers,
                body: JSON.stringify(product)
            });

            if (response.ok) {
                const created = await response.json();
                productsCreated.push(created);
                log(`  + ${product.sku}: ${product.name}`, 'green');
            } else {
                log(`  ~ ${product.sku}: Already exists, skipping`, 'dim');
                // Try to fetch existing products
            }
        }

        // Fetch all products if some weren't created (already existed)
        if (productsCreated.length < DEMO_PRODUCTS.length) {
            const invResponse = await fetch(`${BASE_URL}/api/inventory?limit=50`, { headers });
            if (invResponse.ok) {
                const invData = await invResponse.json();
                productsCreated = invData.items || [];
            }
        }

        log(`  Total products available: ${productsCreated.length}`, 'cyan');

        // Step 3: Create customers
        log('\n[Step 3] Creating customers...', 'yellow');

        for (const customer of DEMO_CUSTOMERS) {
            const response = await fetch(`${BASE_URL}/api/customers`, {
                method: 'POST',
                headers,
                body: JSON.stringify(customer)
            });

            if (response.ok) {
                const created = await response.json();
                customersCreated.push(created);
                log(`  + ${customer.name} (${customer.email})`, 'green');
            } else {
                log(`  ~ ${customer.name}: Already exists, skipping`, 'dim');
            }
        }

        // Fetch all customers if some weren't created
        if (customersCreated.length < DEMO_CUSTOMERS.length) {
            const custResponse = await fetch(`${BASE_URL}/api/customers?limit=50`, { headers });
            if (custResponse.ok) {
                const custData = await custResponse.json();
                customersCreated = custData.items || [];
            }
        }

        log(`  Total customers available: ${customersCreated.length}`, 'cyan');

        // Step 4: Create orders
        log('\n[Step 4] Creating orders...', 'yellow');

        for (const template of ORDER_TEMPLATES) {
            const customer = customersCreated[template.customerIndex % customersCreated.length];
            if (!customer) {
                log(`  ! Skipping order: No customer available`, 'red');
                continue;
            }

            const orderItems = template.items.map(item => {
                const product = productsCreated[item.productIndex % productsCreated.length];
                if (!product) return null;
                return {
                    inventory_id: product.id,
                    quantity: item.quantity,
                    price: parseFloat(product.price)
                };
            }).filter(Boolean);

            if (orderItems.length === 0) {
                log(`  ! Skipping order: No products available`, 'red');
                continue;
            }

            try {
                const orderResponse = await fetch(`${BASE_URL}/api/orders`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        customer_id: customer.id,
                        items: orderItems,
                        notes: template.notes
                    })
                });

                if (orderResponse.ok) {
                    const order = await orderResponse.json();

                    // Update status if not pending
                    if (template.status !== 'pending') {
                        await fetch(`${BASE_URL}/api/orders/${order.id}/status`, {
                            method: 'PUT',
                            headers,
                            body: JSON.stringify({ status: template.status })
                        });
                    }

                    ordersCreated++;
                    const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    log(`  + Order #${order.id} | ${template.status.padEnd(10)} | $${total.toFixed(2).padStart(7)} | ${customer.name}`, 'green');
                } else {
                    const errorText = await orderResponse.text();
                    log(`  ! Order failed: ${errorText.substring(0, 50)}...`, 'red');
                }
            } catch (err) {
                log(`  ! Order error: ${err.message}`, 'red');
            }
        }

        log(`  Total orders created: ${ordersCreated}`, 'cyan');

        // Summary
        console.log('\n' + '='.repeat(55));
        log('  DEMO DATA SEEDING COMPLETE', 'green');
        console.log('='.repeat(55));

        console.log('\n  Demo Account Credentials:');
        console.log('  -------------------------');
        log(`  Email:    ${DEMO_TENANT.email}`, 'cyan');
        log(`  Password: ${DEMO_TENANT.password}`, 'cyan');
        log(`  Store:    ${DEMO_TENANT.store_name}`, 'cyan');

        console.log('\n  Data Summary:');
        console.log('  -------------');
        console.log(`  Products:  ${productsCreated.length}`);
        console.log(`  Customers: ${customersCreated.length}`);
        console.log(`  Orders:    ${ordersCreated}`);

        console.log('\n  Order Status Breakdown:');
        console.log('  -----------------------');
        console.log('  Completed:  5');
        console.log('  Processing: 4');
        console.log('  Pending:    4');
        console.log('  Cancelled:  2');

        console.log('\n');

    } catch (error) {
        console.log('\n' + '='.repeat(55));
        log('  SEEDING FAILED', 'red');
        console.log('='.repeat(55));
        console.error(`\n  Error: ${error.message}`);
        console.log('\n  Troubleshooting:');
        console.log('  1. Ensure the backend server is running (npm start)');
        console.log('  2. Check database connection');
        console.log('  3. Verify API_URL environment variable if not localhost');
        console.log('\n');
        process.exit(1);
    }
}

// Run seeder
seedDemoData();
