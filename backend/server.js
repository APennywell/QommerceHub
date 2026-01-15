require("dotenv").config();

// Validate environment variables on startup
const { validateEnv } = require("./utils/validateEnv");
validateEnv();

console.log("🔥 SERVER.JS LOADED 🔥");

const app = require("./app");

// SERVER START - bind to 0.0.0.0 for Railway/cloud hosting
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
