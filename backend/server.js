require("dotenv").config();

// Validate environment variables on startup
const { validateEnv } = require("./utils/validateEnv");
validateEnv();

console.log("🔥 SERVER.JS LOADED 🔥");

const app = require("./app");

// SERVER START
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
