const db = require("../db");

// CREATE customer
async function createCustomer({ tenantId, name, email, phone, address }) {
    const result = await db.query(
        `INSERT INTO customers (tenant_id, name, email, phone, address)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [tenantId, name, email, phone || null, address || null]
    );
    return result.rows[0];
}

// READ customers with pagination
async function getCustomers(tenantId, { page = 1, limit = 10, search = '' } = {}) {
    page = Math.max(1, page);
    limit = Math.min(Math.max(1, limit), 100);
    const offset = (page - 1) * limit;

    let query = `
        SELECT * FROM customers
        WHERE tenant_id = $1
    `;
    const params = [tenantId];

    if (search) {
        query += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    const countResult = await db.query(
        `SELECT COUNT(*) FROM customers WHERE tenant_id = $1 ${search ? 'AND (name ILIKE $2 OR email ILIKE $2)' : ''}`,
        search ? [tenantId, `%${search}%`] : [tenantId]
    );

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

// UPDATE customer
async function updateCustomer(id, tenantId, { name, email, phone, address }) {
    const result = await db.query(
        `UPDATE customers
        SET
            name = COALESCE($1, name),
            email = COALESCE($2, email),
            phone = COALESCE($3, phone),
            address = COALESCE($4, address)
        WHERE id = $5 AND tenant_id = $6
        RETURNING *`,
        [name, email, phone, address, id, tenantId]
    );
    return result.rows[0];
}

// DELETE customer
async function deleteCustomer(id, tenantId) {
    const result = await db.query(
        "DELETE FROM customers WHERE id = $1 AND tenant_id = $2 RETURNING *",
        [id, tenantId]
    );
    return result.rows[0];
}

module.exports = {
    createCustomer,
    getCustomers,
    updateCustomer,
    deleteCustomer
};
