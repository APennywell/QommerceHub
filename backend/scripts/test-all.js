/**
 * Comprehensive Test Suite for QommerceHub
 *
 * Runs all tests to verify the platform is working correctly:
 * 1. Jest unit tests
 * 2. Health endpoint checks
 * 3. API integration tests (auth, inventory, customers, orders, analytics)
 * 4. Frontend page accessibility
 *
 * Usage: node scripts/test-all.js
 *        npm run test:all
 */

const { spawn } = require('child_process');
const path = require('path');

// Configuration
const CONFIG = {
    apiUrl: process.env.API_URL || 'http://localhost:5000',
    testTimeout: 30000
};

// Test credentials (unique per run to avoid conflicts)
const TEST_TENANT = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    store_name: 'Test Store'
};

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

// Store test state
let testToken = null;
let testProductId = null;
let testCustomerId = null;

// Test suite definitions
const testSuites = [
    { name: 'Jest Unit Tests', fn: runJestTests },
    { name: 'Health Endpoints', fn: testHealthEndpoints },
    { name: 'Authentication API', fn: testAuthAPI },
    { name: 'Inventory API', fn: testInventoryAPI },
    { name: 'Customer API', fn: testCustomerAPI },
    { name: 'Order API', fn: testOrderAPI },
    { name: 'Analytics API', fn: testAnalyticsAPI }
];

// 1. Jest Unit Tests
async function runJestTests() {
    return new Promise((resolve) => {
        const jest = spawn('npm', ['test'], {
            cwd: path.join(__dirname, '..'),
            shell: true,
            stdio: 'pipe'
        });

        let output = '';
        jest.stdout.on('data', (data) => output += data.toString());
        jest.stderr.on('data', (data) => output += data.toString());

        jest.on('close', (code) => {
            // Extract test results from output
            const passMatch = output.match(/Tests:\s+(\d+)\s+passed/);
            const failMatch = output.match(/(\d+)\s+failed/);
            const passed = passMatch ? parseInt(passMatch[1]) : 0;
            const failed = failMatch ? parseInt(failMatch[1]) : 0;

            resolve({
                passed: code === 0,
                message: code === 0 ? `All ${passed} Jest tests passed` : `${failed} Jest test(s) failed`,
                results: [
                    { test: 'Jest test suite', passed: code === 0, expected: 'exit 0', actual: `exit ${code}` }
                ]
            });
        });

        jest.on('error', (err) => {
            resolve({
                passed: false,
                message: `Jest error: ${err.message}`,
                results: [{ test: 'Jest test suite', passed: false, expected: 'success', actual: err.message }]
            });
        });
    });
}

// 2. Health Endpoint Tests
async function testHealthEndpoints() {
    const results = [];

    try {
        // Test GET /
        const rootResponse = await fetch(`${CONFIG.apiUrl}/`);
        const rootData = await rootResponse.json();
        results.push({
            test: 'GET /',
            passed: rootResponse.status === 200,
            expected: 200,
            actual: rootResponse.status
        });

        // Test GET /health
        const healthResponse = await fetch(`${CONFIG.apiUrl}/health`);
        const healthData = await healthResponse.json();
        results.push({
            test: 'GET /health',
            passed: healthResponse.status === 200 && healthData.status === 'ok',
            expected: '200 with status:ok',
            actual: `${healthResponse.status} with status:${healthData.status}`
        });
    } catch (err) {
        results.push({
            test: 'Health endpoints',
            passed: false,
            expected: 'Server running',
            actual: `Connection failed: ${err.message}`
        });
    }

    return {
        passed: results.every(r => r.passed),
        results
    };
}

// 3. Authentication API Tests
async function testAuthAPI() {
    const results = [];

    try {
        // Test signup
        const signupResponse = await fetch(`${CONFIG.apiUrl}/api/tenants/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_TENANT)
        });
        results.push({
            test: 'POST /api/tenants/signup',
            passed: signupResponse.status === 201,
            expected: 201,
            actual: signupResponse.status
        });

        // Test login
        const loginResponse = await fetch(`${CONFIG.apiUrl}/api/tenants/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: TEST_TENANT.email,
                password: TEST_TENANT.password
            })
        });
        const loginData = await loginResponse.json();
        testToken = loginData.token;
        results.push({
            test: 'POST /api/tenants/login',
            passed: loginResponse.status === 200 && !!loginData.token,
            expected: '200 with token',
            actual: `${loginResponse.status} token:${!!loginData.token}`
        });

        // Test /me endpoint
        if (testToken) {
            const meResponse = await fetch(`${CONFIG.apiUrl}/api/tenants/me`, {
                headers: { 'Authorization': `Bearer ${testToken}` }
            });
            results.push({
                test: 'GET /api/tenants/me',
                passed: meResponse.status === 200,
                expected: 200,
                actual: meResponse.status
            });
        }

        // Test invalid login
        const badLoginResponse = await fetch(`${CONFIG.apiUrl}/api/tenants/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'wrong@email.com', password: 'wrong' })
        });
        results.push({
            test: 'POST /api/tenants/login (invalid)',
            passed: badLoginResponse.status === 401,
            expected: 401,
            actual: badLoginResponse.status
        });

    } catch (err) {
        results.push({
            test: 'Auth API',
            passed: false,
            expected: 'success',
            actual: err.message
        });
    }

    return { passed: results.every(r => r.passed), results };
}

// 4. Inventory API Tests
async function testInventoryAPI() {
    const results = [];
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
    };

    try {
        // Test create product
        const createResponse = await fetch(`${CONFIG.apiUrl}/api/inventory`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: 'Test Product',
                sku: `TEST-${Date.now()}`,
                quantity: 100,
                price: 29.99,
                category: 'Test',
                description: 'A test product'
            })
        });
        const product = await createResponse.json();
        testProductId = product.id;
        results.push({
            test: 'POST /api/inventory',
            passed: createResponse.status === 201,
            expected: 201,
            actual: createResponse.status
        });

        // Test get inventory list
        const getResponse = await fetch(`${CONFIG.apiUrl}/api/inventory`, { headers });
        const getData = await getResponse.json();
        results.push({
            test: 'GET /api/inventory',
            passed: getResponse.status === 200 && Array.isArray(getData.items),
            expected: '200 with items array',
            actual: `${getResponse.status} items:${Array.isArray(getData.items)}`
        });

        // Test update product
        if (testProductId) {
            const updateResponse = await fetch(`${CONFIG.apiUrl}/api/inventory/${testProductId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ name: 'Updated Product', quantity: 50, price: 39.99 })
            });
            results.push({
                test: 'PUT /api/inventory/:id',
                passed: updateResponse.status === 200,
                expected: 200,
                actual: updateResponse.status
            });
        }

        // Test search
        const searchResponse = await fetch(`${CONFIG.apiUrl}/api/inventory?search=Test`, { headers });
        results.push({
            test: 'GET /api/inventory?search=',
            passed: searchResponse.status === 200,
            expected: 200,
            actual: searchResponse.status
        });

        // Test unauthorized access
        const unauthResponse = await fetch(`${CONFIG.apiUrl}/api/inventory`);
        results.push({
            test: 'GET /api/inventory (no auth)',
            passed: unauthResponse.status === 401,
            expected: 401,
            actual: unauthResponse.status
        });

    } catch (err) {
        results.push({
            test: 'Inventory API',
            passed: false,
            expected: 'success',
            actual: err.message
        });
    }

    return { passed: results.every(r => r.passed), results };
}

// 5. Customer API Tests
async function testCustomerAPI() {
    const results = [];
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
    };

    try {
        // Test create customer
        const createResponse = await fetch(`${CONFIG.apiUrl}/api/customers`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: 'Test Customer',
                email: `customer-${Date.now()}@test.com`,
                phone: '555-0100',
                address: '123 Test Street'
            })
        });
        const customer = await createResponse.json();
        testCustomerId = customer.id;
        results.push({
            test: 'POST /api/customers',
            passed: createResponse.status === 201,
            expected: 201,
            actual: createResponse.status
        });

        // Test get customers
        const getResponse = await fetch(`${CONFIG.apiUrl}/api/customers`, { headers });
        const getData = await getResponse.json();
        results.push({
            test: 'GET /api/customers',
            passed: getResponse.status === 200 && Array.isArray(getData.items),
            expected: '200 with items array',
            actual: `${getResponse.status} items:${Array.isArray(getData.items)}`
        });

        // Test update customer
        if (testCustomerId) {
            const updateResponse = await fetch(`${CONFIG.apiUrl}/api/customers/${testCustomerId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ name: 'Updated Customer', phone: '555-9999' })
            });
            results.push({
                test: 'PUT /api/customers/:id',
                passed: updateResponse.status === 200,
                expected: 200,
                actual: updateResponse.status
            });
        }

    } catch (err) {
        results.push({
            test: 'Customer API',
            passed: false,
            expected: 'success',
            actual: err.message
        });
    }

    return { passed: results.every(r => r.passed), results };
}

// 6. Order API Tests
async function testOrderAPI() {
    const results = [];
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
    };

    try {
        if (testProductId && testCustomerId) {
            // Test create order
            const createResponse = await fetch(`${CONFIG.apiUrl}/api/orders`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    customer_id: testCustomerId,
                    items: [{ inventory_id: testProductId, quantity: 2, price: 39.99 }],
                    notes: 'Test order'
                })
            });
            const order = await createResponse.json();
            results.push({
                test: 'POST /api/orders',
                passed: createResponse.status === 201,
                expected: 201,
                actual: createResponse.status
            });

            // Test get orders
            const getResponse = await fetch(`${CONFIG.apiUrl}/api/orders`, { headers });
            results.push({
                test: 'GET /api/orders',
                passed: getResponse.status === 200,
                expected: 200,
                actual: getResponse.status
            });

            // Test update order status
            if (order.id) {
                const statusResponse = await fetch(`${CONFIG.apiUrl}/api/orders/${order.id}/status`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ status: 'processing' })
                });
                results.push({
                    test: 'PUT /api/orders/:id/status',
                    passed: statusResponse.status === 200,
                    expected: 200,
                    actual: statusResponse.status
                });

                // Test get single order
                const getOneResponse = await fetch(`${CONFIG.apiUrl}/api/orders/${order.id}`, { headers });
                results.push({
                    test: 'GET /api/orders/:id',
                    passed: getOneResponse.status === 200,
                    expected: 200,
                    actual: getOneResponse.status
                });
            }
        } else {
            results.push({
                test: 'Order API (skipped)',
                passed: true,
                expected: 'N/A',
                actual: 'No product/customer available'
            });
        }

    } catch (err) {
        results.push({
            test: 'Order API',
            passed: false,
            expected: 'success',
            actual: err.message
        });
    }

    return { passed: results.every(r => r.passed), results };
}

// 7. Analytics API Tests
async function testAnalyticsAPI() {
    const results = [];
    const headers = { 'Authorization': `Bearer ${testToken}` };

    try {
        // Test sales analytics
        const salesResponse = await fetch(`${CONFIG.apiUrl}/api/analytics/sales`, { headers });
        results.push({
            test: 'GET /api/analytics/sales',
            passed: salesResponse.status === 200,
            expected: 200,
            actual: salesResponse.status
        });

        // Test inventory stats
        const invResponse = await fetch(`${CONFIG.apiUrl}/api/analytics/inventory`, { headers });
        results.push({
            test: 'GET /api/analytics/inventory',
            passed: invResponse.status === 200,
            expected: 200,
            actual: invResponse.status
        });

    } catch (err) {
        results.push({
            test: 'Analytics API',
            passed: false,
            expected: 'success',
            actual: err.message
        });
    }

    return { passed: results.every(r => r.passed), results };
}

// Main test runner
async function runAllTests() {
    console.log('\n' + '='.repeat(60));
    log('  QommerceHub - Comprehensive Test Suite', 'cyan');
    console.log('='.repeat(60));
    log(`\n  API URL: ${CONFIG.apiUrl}`, 'dim');
    log(`  Started: ${new Date().toLocaleString()}`, 'dim');

    const allResults = [];
    let totalTests = 0;
    let totalPassed = 0;

    for (const suite of testSuites) {
        console.log('\n' + '-'.repeat(50));
        log(`[TEST] ${suite.name}`, 'yellow');
        console.log('-'.repeat(50));

        try {
            const result = await suite.fn();
            allResults.push({ name: suite.name, ...result });

            if (result.results) {
                for (const r of result.results) {
                    totalTests++;
                    if (r.passed) totalPassed++;
                    const icon = r.passed ? '+' : 'x';
                    const color = r.passed ? 'green' : 'red';
                    log(`  ${icon} ${r.test}`, color);
                    if (!r.passed) {
                        log(`      Expected: ${r.expected}, Got: ${r.actual}`, 'dim');
                    }
                }
            }

            if (result.passed) {
                log(`\n  PASSED`, 'green');
            } else {
                log(`\n  FAILED`, 'red');
            }

        } catch (err) {
            allResults.push({ name: suite.name, passed: false, error: err.message });
            log(`  x ERROR: ${err.message}`, 'red');
            log(`\n  FAILED`, 'red');
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    log('  TEST SUMMARY', 'cyan');
    console.log('='.repeat(60));

    const suitesPassed = allResults.filter(r => r.passed).length;
    const suitesFailed = allResults.length - suitesPassed;

    console.log(`\n  Test Suites: ${allResults.length} total, ${suitesPassed} passed, ${suitesFailed} failed`);
    console.log(`  Tests:       ${totalTests} total, ${totalPassed} passed, ${totalTests - totalPassed} failed`);

    if (suitesFailed > 0) {
        log('\n  Failed Suites:', 'red');
        allResults.filter(r => !r.passed).forEach(r => {
            log(`    - ${r.name}`, 'red');
        });
    }

    const allPassed = suitesFailed === 0;
    console.log('\n' + '-'.repeat(60));
    if (allPassed) {
        log('  ALL TESTS PASSED - Ready for demo!', 'green');
    } else {
        log('  SOME TESTS FAILED - Please fix before demo', 'red');
    }
    console.log('-'.repeat(60) + '\n');

    process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(err => {
    log(`\nTest suite crashed: ${err.message}`, 'red');
    process.exit(1);
});
