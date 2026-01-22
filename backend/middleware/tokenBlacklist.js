/**
 * Token Blacklist Middleware
 * Stores invalidated tokens in memory (use Redis for production scalability)
 */

// In-memory store for blacklisted tokens
// Format: { token: expiryTimestamp }
const blacklistedTokens = new Map();

// Maximum blacklist size to prevent memory exhaustion
const MAX_BLACKLIST_SIZE = 10000;

/**
 * Clean up expired tokens
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
function addToBlacklist(token, expiryMs = 24 * 60 * 60 * 1000) {
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
 * @returns {boolean} - True if blacklisted
 */
function isBlacklisted(token) {
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
 * Invalidate all tokens for a tenant (e.g., on password change)
 * This is a simple implementation - for production, store token version in DB
 * @param {number} tenantId - The tenant ID
 */
function invalidateAllForTenant(tenantId) {
  // In this simple implementation, we can't invalidate by tenant
  // For production, implement token versioning in the database
  console.log(`Token invalidation requested for tenant ${tenantId}`);
}

/**
 * Get blacklist stats (for monitoring)
 */
function getStats() {
  return {
    totalBlacklisted: blacklistedTokens.size
  };
}

module.exports = {
  addToBlacklist,
  isBlacklisted,
  invalidateAllForTenant,
  getStats
};
