/**
 * Role-Based Access Control Middleware
 * Provides permission checking for different user roles
 */

const db = require('../db');

// Permission cache (refreshed on server restart)
let permissionCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load permissions from database
 */
async function loadPermissions() {
  const now = Date.now();
  if (permissionCache && (now - cacheTimestamp) < CACHE_TTL) {
    return permissionCache;
  }

  const result = await db.query('SELECT role, permission FROM role_permissions');

  // Build permission map: { role: Set<permission> }
  permissionCache = {};
  for (const row of result.rows) {
    if (!permissionCache[row.role]) {
      permissionCache[row.role] = new Set();
    }
    permissionCache[row.role].add(row.permission);
  }

  cacheTimestamp = now;
  return permissionCache;
}

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 */
async function hasPermission(role, permission) {
  const permissions = await loadPermissions();
  return permissions[role]?.has(permission) || false;
}

/**
 * Middleware to require a specific permission
 * @param {string|string[]} requiredPermissions - Permission(s) required
 * @param {Object} options - Options
 * @param {boolean} options.requireAll - Require all permissions (default: false, any one is enough)
 */
function requirePermission(requiredPermissions, options = {}) {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  const { requireAll = false } = options;

  return async (req, res, next) => {
    try {
      const role = req.tenant?.role || 'owner';

      // Owner has all permissions
      if (role === 'owner') {
        return next();
      }

      const permissionMap = await loadPermissions();
      const userPermissions = permissionMap[role] || new Set();

      let hasAccess;
      if (requireAll) {
        hasAccess = permissions.every(p => userPermissions.has(p));
      } else {
        hasAccess = permissions.some(p => userPermissions.has(p));
      }

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Permission denied',
          required: permissions,
          role: role
        });
      }

      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware to require owner role
 */
function requireOwner() {
  return (req, res, next) => {
    const role = req.tenant?.role || 'owner';

    if (role !== 'owner') {
      return res.status(403).json({
        error: 'This action requires owner access',
        role: role
      });
    }

    next();
  };
}

/**
 * Middleware to require at least manager role
 */
function requireManager() {
  return (req, res, next) => {
    const role = req.tenant?.role || 'owner';

    if (role !== 'owner' && role !== 'manager') {
      return res.status(403).json({
        error: 'This action requires manager or owner access',
        role: role
      });
    }

    next();
  };
}

/**
 * Get all permissions for a role
 * @param {string} role - The role to get permissions for
 */
async function getPermissionsForRole(role) {
  const permissions = await loadPermissions();
  return Array.from(permissions[role] || []);
}

/**
 * Clear permission cache (call when permissions change)
 */
function clearPermissionCache() {
  permissionCache = null;
  cacheTimestamp = 0;
}

// Predefined permissions
const PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_PRODUCTS: 'manage_products',
  MANAGE_ORDERS: 'manage_orders',
  MANAGE_CUSTOMERS: 'manage_customers',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_PAYMENTS: 'manage_payments',
  EXPORT_DATA: 'export_data'
};

module.exports = {
  requirePermission,
  requireOwner,
  requireManager,
  hasPermission,
  getPermissionsForRole,
  clearPermissionCache,
  PERMISSIONS
};
