/**
 * Redis Configuration
 * Provides Redis client with automatic fallback to in-memory storage
 */

let redisClient = null;
let isRedisAvailable = false;

/**
 * Initialize Redis connection
 * Falls back gracefully if Redis is not available
 */
async function initRedis() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log('REDIS_URL not configured - using in-memory token blacklist');
    return null;
  }

  try {
    const Redis = require('ioredis');
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true
    });

    await redisClient.connect();

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err.message);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
      isRedisAvailable = true;
    });

    redisClient.on('close', () => {
      console.log('Redis connection closed');
      isRedisAvailable = false;
    });

    // Test the connection
    await redisClient.ping();
    isRedisAvailable = true;
    console.log('Redis initialized successfully');
    return redisClient;
  } catch (error) {
    console.warn('Failed to connect to Redis:', error.message);
    console.log('Falling back to in-memory token blacklist');
    redisClient = null;
    isRedisAvailable = false;
    return null;
  }
}

/**
 * Get the Redis client (may be null if not available)
 */
function getRedisClient() {
  return redisClient;
}

/**
 * Check if Redis is available
 */
function isRedisConnected() {
  return isRedisAvailable && redisClient !== null;
}

/**
 * Gracefully close Redis connection
 */
async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis:', error.message);
    }
  }
}

module.exports = {
  initRedis,
  getRedisClient,
  isRedisConnected,
  closeRedis
};
