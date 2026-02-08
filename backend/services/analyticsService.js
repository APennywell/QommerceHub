const db = require('../db');

/**
 * Get sales analytics for dashboard
 */
async function getSalesAnalytics(tenantId, { days = 30 } = {}) {
    // Validate and sanitize days parameter to prevent SQL injection
    const validDays = Math.min(Math.max(parseInt(days, 10) || 30, 1), 365);

    try {
        // Run all queries in parallel for performance
        const [
            revenueResult,
            periodResult,
            topProductsResult,
            statusResult,
            lowStockResult,
            topCustomersResult,
            recentResult
        ] = await Promise.all([
            db.query(
                `SELECT COALESCE(SUM(total_amount), 0) as total_revenue,
                        COUNT(*) as total_orders,
                        COALESCE(AVG(total_amount), 0) as avg_order_value
                 FROM orders
                 WHERE tenant_id = $1 AND status != 'cancelled'`,
                [tenantId]
            ),
            db.query(
                `SELECT DATE(created_at) as date,
                        COUNT(*) as order_count,
                        SUM(total_amount) as revenue
                 FROM orders
                 WHERE tenant_id = $1 AND status != 'cancelled'
                       AND created_at >= NOW() - INTERVAL '1 day' * $2
                 GROUP BY DATE(created_at)
                 ORDER BY date ASC`,
                [tenantId, validDays]
            ),
            db.query(
                `SELECT i.id, i.name, i.sku,
                        SUM(oi.quantity) as total_sold,
                        SUM(oi.quantity * oi.price) as total_revenue
                 FROM order_items oi
                 JOIN inventory i ON oi.inventory_id = i.id
                 JOIN orders o ON oi.order_id = o.id
                 WHERE i.tenant_id = $1 AND o.status != 'cancelled'
                 GROUP BY i.id, i.name, i.sku
                 ORDER BY total_sold DESC
                 LIMIT 10`,
                [tenantId]
            ),
            db.query(
                `SELECT status, COUNT(*) as count
                 FROM orders
                 WHERE tenant_id = $1
                 GROUP BY status`,
                [tenantId]
            ),
            db.query(
                `SELECT id, name, sku, quantity, price
                 FROM inventory
                 WHERE tenant_id = $1 AND is_deleted = FALSE AND quantity < 10
                 ORDER BY quantity ASC
                 LIMIT 10`,
                [tenantId]
            ),
            db.query(
                `SELECT c.id, c.name, c.email,
                        COUNT(o.id) as order_count,
                        SUM(o.total_amount) as total_spent
                 FROM customers c
                 JOIN orders o ON c.id = o.customer_id
                 WHERE c.tenant_id = $1 AND o.status != 'cancelled'
                 GROUP BY c.id, c.name, c.email
                 ORDER BY total_spent DESC
                 LIMIT 10`,
                [tenantId]
            ),
            db.query(
                `SELECT total_amount, created_at
                 FROM orders
                 WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
                 ORDER BY created_at DESC
                 LIMIT 100`,
                [tenantId]
            )
        ]);

        return {
            revenue: revenueResult.rows[0],
            salesByDate: periodResult.rows,
            topProducts: topProductsResult.rows,
            ordersByStatus: statusResult.rows,
            lowStock: lowStockResult.rows,
            topCustomers: topCustomersResult.rows,
            recentOrders: recentResult.rows
        };
    } catch (error) {
        throw new Error('Failed to fetch analytics data');
    }
}

/**
 * Get inventory statistics
 */
async function getInventoryStats(tenantId) {
    try {
        const result = await db.query(
            `SELECT
                COUNT(*) as total_products,
                COALESCE(SUM(quantity), 0) as total_quantity,
                COALESCE(SUM(quantity * price), 0) as total_value,
                COUNT(CASE WHEN quantity < 10 THEN 1 END) as low_stock_count
             FROM inventory
             WHERE tenant_id = $1 AND is_deleted = FALSE`,
            [tenantId]
        );
        return result.rows[0];
    } catch (error) {
        throw new Error('Failed to fetch inventory stats');
    }
}

module.exports = {
    getSalesAnalytics,
    getInventoryStats
};
