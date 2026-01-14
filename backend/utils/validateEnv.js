// Environment variable validation
function validateEnv() {
  const requiredEnvVars = [
    "PORT",
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "JWT_SECRET",
    "NODE_ENV",
  ];

  const missing = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((varName) => console.error(`  - ${varName}`));
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error("❌ JWT_SECRET must be at least 32 characters long for security");
    process.exit(1);
  }

  console.log("✅ Environment variables validated successfully");
}

module.exports = { validateEnv };
