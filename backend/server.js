require("dotenv").config();

// Handle unhandled promise rejections (log but don't crash — let health check report issues)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Validate environment variables on startup
const { validateEnv } = require("./utils/validateEnv");
validateEnv();

console.log("🔥 SERVER.JS LOADED 🔥");

// Initialize Redis (optional - for token blacklist persistence)
const { initRedis, closeRedis } = require("./config/redis");
initRedis().catch(err => {
  console.warn('Redis initialization skipped:', err.message);
});

const app = require("./app");

// SERVER START - bind to 0.0.0.0 for Railway/cloud hosting
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Schedule report cleanup every 6 hours
  try {
    const { cleanupOldReports } = require('./services/reportingService');
    setInterval(() => {
      try { cleanupOldReports(7); } catch (e) { /* ignore */ }
    }, 6 * 60 * 60 * 1000);
  } catch (e) { /* reportingService not critical */ }
});

server.on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeRedis();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeRedis();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
