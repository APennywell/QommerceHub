/**
 * Audit Logging Middleware
 * Records all data-changing operations for accountability
 */

const db = require('../db');

/**
 * Log an audit event
 * @param {Object} params - Audit parameters
 * @param {number} params.tenantId - The tenant performing the action
 * @param {number} params.userId - Optional user ID (for sub-users)
 * @param {string} params.action - Action type (create, update, delete)
 * @param {string} params.entityType - Type of entity (product, order, customer, etc.)
 * @param {number} params.entityId - ID of the affected entity
 * @param {Object} params.oldValues - Previous values (for updates/deletes)
 * @param {Object} params.newValues - New values (for creates/updates)
 * @param {Object} params.req - Express request object (for IP and user agent)
 */
async function logAudit({
  tenantId,
  userId = null,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  req = null
}) {
  try {
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.get?.('User-Agent') || null;

    await db.query(
      `INSERT INTO audit_logs
       (tenant_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Audit log failed:', error.message);
  }
}

/**
 * Create a middleware that automatically logs specified actions
 * @param {string} entityType - The type of entity being modified
 * @param {string} action - The action being performed
 */
function auditMiddleware(entityType, action) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to capture response
    res.json = function (data) {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = data?.id || req.params?.id || null;

        logAudit({
          tenantId: req.tenant?.id,
          userId: req.tenant?.userId || null,
          action,
          entityType,
          entityId,
          oldValues: req.auditOldValues || null,
          newValues: action !== 'delete' ? (req.body || null) : null,
          req
        });
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Middleware to capture old values before update/delete
 */
function captureOldValues(getOldValuesFn) {
  return async (req, res, next) => {
    try {
      req.auditOldValues = await getOldValuesFn(req);
    } catch (error) {
      console.error('Failed to capture old values for audit:', error.message);
    }
    next();
  };
}

/**
 * Get audit logs for a tenant
 * @param {number} tenantId - The tenant ID
 * @param {Object} options - Query options
 */
async function getAuditLogs(tenantId, options = {}) {
  const {
    entityType = null,
    entityId = null,
    action = null,
    limit = 100,
    offset = 0,
    startDate = null,
    endDate = null
  } = options;

  let query = `
    SELECT * FROM audit_logs
    WHERE tenant_id = $1
  `;
  const params = [tenantId];
  let paramIndex = 2;

  if (entityType) {
    query += ` AND entity_type = $${paramIndex++}`;
    params.push(entityType);
  }

  if (entityId) {
    query += ` AND entity_id = $${paramIndex++}`;
    params.push(entityId);
  }

  if (action) {
    query += ` AND action = $${paramIndex++}`;
    params.push(action);
  }

  if (startDate) {
    query += ` AND created_at >= $${paramIndex++}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND created_at <= $${paramIndex++}`;
    params.push(endDate);
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
}

module.exports = {
  logAudit,
  auditMiddleware,
  captureOldValues,
  getAuditLogs
};
