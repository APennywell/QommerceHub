/**
 * Token Blacklist Middleware
 * Uses Redis for production scalability, falls back to in-memory storage
 */

const { getRedisClient, isRedisConnected } = require('../config/redis');

// In-memory store for blacklisted tokens (fallback)
// Format: { token: expiryTimestamp }
const blacklistedTokens = new Map();

// Maximum blacklist size to prevent memory exhaustion (for in-memory fallback)
const MAX_BLACKLIST_SIZE = 10000;

// Redis key prefix for token blacklist
const REDIS_PREFIX = 'token:blacklist:';

/**
 * Clean up expired tokens (in-memory only)
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, expiry] of blacklistedTokens.entries()) {
    if (expiry < now) {
      blacklistedTokens.delete(token);
    }
  }
}

// Clean up expired tokens every hour (skip in test environment)
let cleanupInterval = null;
if (process.env.NODE_ENV !== 'test') {
  cleanupInterval = setInterval(cleanupExpiredTokens, 60 * 60 * 1000); // 1 hour
}

/**
 * Add a token to the blacklist
 * @param {string} token - The JWT token to blacklist
 * @param {number} expiryMs - Token expiry time in milliseconds from now
 */
async function addToBlacklist(token, expiryMs = 24 * 60 * 60 * 1000) {
  // Try Redis first
  if (isRedisConnected()) {
    try {
      const redis = getRedisClient();
      const expirySeconds = Math.ceil(expiryMs / 1000);
      await redis.setex(`${REDIS_PREFIX}${token}`, expirySeconds, '1');
      return;
    } catch (error) {
      console.error('Redis blacklist add failed, falling back to memory:', error.message);
    }
  }

  // Fallback to in-memory
  // If approaching limit, clean up expired tokens first
  if (blacklistedTokens.size >= MAX_BLACKLIST_SIZE * 0.9) {
    cleanupExpiredTokens();
  }

  // If still at limit after cleanup, remove oldest entries
  if (blacklistedTokens.size >= MAX_BLACKLIST_SIZE) {
    console.warn('Token blacklist at capacity, removing oldest entries');
    const entries = Array.from(blacklistedTokens.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, Math.floor(MAX_BLACKLIST_SIZE * 0.1));
    entries.forEach(([key]) => blacklistedTokens.delete(key));
  }

  blacklistedTokens.set(token, Date.now() + expiryMs);
}

/**
 * Check if a token is blacklisted
 * @param {string} token - The JWT token to check
 * @returns {Promise<boolean>} - True if blacklisted
 */
async function isBlacklisted(token) {
  // Try Redis first
  if (isRedisConnected()) {
    try {
      const redis = getRedisClient();
      const result = await redis.get(`${REDIS_PREFIX}${token}`);
      return result !== null;
    } catch (error) {
      console.error('Redis blacklist check failed, falling back to memory:', error.message);
    }
  }

  // Fallback to in-memory
  if (!blacklistedTokens.has(token)) {
    return false;
  }

  const expiry = blacklistedTokens.get(token);
  if (expiry < Date.now()) {
    blacklistedTokens.delete(token);
    return false;
  }

  return true;
}

/**
 * Invalidate all tokens for a tenant (e.g., on password change or logout-all)
 * Increments token_version in DB so all existing tokens become invalid
 * @param {number} tenantId - The tenant ID
 */
async function invalidateAllForTenant(tenantId) {
  try {
    const db = require('../db');
    await db.query(
      'UPDATE tenants SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1',
      [tenantId]
    );
  } catch (err) {
    // Column may not exist yet
    console.warn(`Token invalidation for tenant ${tenantId}:`, err.message);
  }
}

/**
 * Get blacklist stats (for monitoring)
 */
async function getStats() {
  const stats = {
    storage: isRedisConnected() ? 'redis' : 'memory'
  };

  if (isRedisConnected()) {
    try {
      const redis = getRedisClient();
      const keys = await redis.keys(`${REDIS_PREFIX}*`);
      stats.totalBlacklisted = keys.length;
    } catch (error) {
      stats.totalBlacklisted = 'unknown';
      stats.error = error.message;
    }
  } else {
    stats.totalBlacklisted = blacklistedTokens.size;
  }

  return stats;
}

module.exports = {
  addToBlacklist,
  isBlacklisted,
  invalidateAllForTenant,
  getStats
};
