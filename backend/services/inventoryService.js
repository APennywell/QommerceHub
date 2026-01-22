const db = require("../db");

console.log("🔥 inventoryService loaded");


// CREATE
async function createInventory({tenantId, name, sku, quantity, price}) {
    const result = await db.query(
        `INSERT INTO inventory (tenant_id, name, sku, quantity, price)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [tenantId, name, sku, quantity, price]
    );
    return result.rows[0];
}



// READ (active items only) with pagination and search
async function getInventory(tenantId, { page = 1, limit = 10, search = '', sortBy = 'created_at', sortOrder = 'DESC' } = {}) {
    const offset = (page - 1) * limit;

    let query = `
        SELECT * FROM inventory
        WHERE tenant_id = $1 AND is_deleted = FALSE
    `;
    const params = [tenantId];

    // Add search filter
    if (search) {
        query += ` AND (name ILIKE $${params.length + 1} OR sku ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
    }

    // Add sorting
    const validSortColumns = ['name', 'sku', 'quantity', 'price', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${order}`;

    // Add pagination
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count for pagination metadata
    const countResult = await db.query(
        `SELECT COUNT(*) FROM inventory WHERE tenant_id = $1 AND is_deleted = FALSE ${search ? 'AND (name ILIKE $2 OR sku ILIKE $2)' : ''}`,
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

// UPDATE
async function updateInventory(id, tenantId, { name, sku, quantity, price }) {
  const result = await db.query(
    `
    UPDATE inventory
    SET
      name = COALESCE($1, name),
      sku = COALESCE($2, sku),
      quantity = COALESCE($3, quantity),
      price = COALESCE($4, price)
    WHERE id = $5
      AND tenant_id = $6
      AND is_deleted = FALSE
    RETURNING *
    `,
    [name, sku, quantity, price, id, tenantId]
  );

  return result.rows[0];
}


// RESTORE
async function restoreInventory(id, tenantId) {
    const result = await db.query(
        `UPDATE inventory SET is_deleted = FALSE WHERE id = $1 AND tenant_id = $2 AND is_deleted = TRUE RETURNING *`,
        [id, tenantId]
    );
    return result.rows[0];
}

// DELETE (soft delete)
async function deleteInventory(id, tenantId) {
    const result = await db.query(
        "UPDATE inventory SET is_deleted = TRUE WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE RETURNING *",
        [id, tenantId]
    );
    return result.rows[0];
}

module.exports = {
    createInventory,
    getInventory,
    updateInventory,
    deleteInventory,
    restoreInventory
};