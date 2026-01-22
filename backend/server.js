require("dotenv").config();

// Handle unhandled promise rejections (critical for production stability)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Validate environment variables on startup
const { validateEnv } = require("./utils/validateEnv");
validateEnv();

console.log("🔥 SERVER.JS LOADED 🔥");

const app = require("./app");

// SERVER START - bind to 0.0.0.0 for Railway/cloud hosting
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
