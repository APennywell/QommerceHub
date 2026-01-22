const db = require("../db");
const emailService = require("./emailService");

// CREATE order with items
async function createOrder({ tenantId, customerId, items, notes }) {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Calculate total
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Create order
        const orderResult = await client.query(
            `INSERT INTO orders (tenant_id, customer_id, total_amount, status, notes)
            VALUES ($1, $2, $3, 'pending', $4)
            RETURNING *`,
            [tenantId, customerId, total, notes || null]
        );

        const order = orderResult.rows[0];

        // Create order items and update inventory with row locking to prevent race conditions
        for (const item of items) {
            // Lock and check inventory in one query (SELECT FOR UPDATE)
            const inventoryCheck = await client.query(
                `SELECT id, quantity, name FROM inventory
                WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE
                FOR UPDATE`,
                [item.inventory_id, tenantId]
            );

            if (inventoryCheck.rows.length === 0) {
                throw new Error(`Product not found: ${item.inventory_id}`);
            }

            const currentQuantity = inventoryCheck.rows[0].quantity;
            if (currentQuantity < item.quantity) {
                throw new Error(`Insufficient stock for "${inventoryCheck.rows[0].name}". Available: ${currentQuantity}, Requested: ${item.quantity}`);
            }

            // Add order item
            await client.query(
                `INSERT INTO order_items (order_id, inventory_id, quantity, price)
                VALUES ($1, $2, $3, $4)`,
                [order.id, item.inventory_id, item.quantity, item.price]
            );

            // Update inventory quantity (safe now due to FOR UPDATE lock)
            await client.query(
                `UPDATE inventory
                SET quantity = quantity - $1
                WHERE id = $2 AND tenant_id = $3`,
                [item.quantity, item.inventory_id, tenantId]
            );
        }

        await client.query('COMMIT');

        // Fetch complete order with items
        const completeOrder = await getOrderById(order.id, tenantId);

        // Send order confirmation email (async, don't wait)
        emailService.sendOrderConfirmation({
            customerEmail: completeOrder.customer_email,
            customerName: completeOrder.customer_name,
            orderId: completeOrder.id,
            orderTotal: completeOrder.total_amount,
            items: completeOrder.items
        }).catch(err => console.error('Failed to send order confirmation email:', err.message));

        return completeOrder;

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// GET orders with pagination
async function getOrders(tenantId, { page = 1, limit = 10, status = '' } = {}) {
    const offset = (page - 1) * limit;

    let query = `
        SELECT o.*, c.name as customer_name, c.email as customer_email
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.tenant_id = $1
    `;
    const params = [tenantId];

    if (status) {
        query += ` AND o.status = $${params.length + 1}`;
        params.push(status);
    }

    query += ` ORDER BY o.created_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    const countQuery = `SELECT COUNT(*) FROM orders WHERE tenant_id = $1 ${status ? 'AND status = $2' : ''}`;
    const countResult = await db.query(countQuery, status ? [tenantId, status] : [tenantId]);

    const total = parseInt(countResult.rows[0].count);

    return {
        items: result.rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

// GET order by ID with items
async function getOrderById(orderId, tenantId) {
    const orderResult = await db.query(
        `SELECT o.*, c.name as customer_name, c.email as customer_email
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.id = $1 AND o.tenant_id = $2`,
        [orderId, tenantId]
    );

    if (orderResult.rows.length === 0) return null;

    const order = orderResult.rows[0];

    const itemsResult = await db.query(
        `SELECT oi.*, i.name as product_name, i.sku
        FROM order_items oi
        LEFT JOIN inventory i ON oi.inventory_id = i.id
        WHERE oi.order_id = $1`,
        [orderId]
    );

    order.items = itemsResult.rows;
    return order;
}

// UPDATE order status
async function updateOrderStatus(orderId, tenantId, status) {
    // Get current order status before update
    const currentOrder = await getOrderById(orderId, tenantId);
    const oldStatus = currentOrder ? currentOrder.status : null;

    const result = await db.query(
        `UPDATE orders
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND tenant_id = $3
        RETURNING *`,
        [status, orderId, tenantId]
    );

    const updatedOrder = result.rows[0];

    // Send status update email if status changed (async, don't wait)
    if (currentOrder && oldStatus !== status) {
        emailService.sendOrderStatusUpdate({
            customerEmail: currentOrder.customer_email,
            customerName: currentOrder.customer_name,
            orderId: orderId,
            oldStatus: oldStatus,
            newStatus: status
        }).catch(err => console.error('Failed to send status update email:', err.message));
    }

    return updatedOrder;
}

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus
};
