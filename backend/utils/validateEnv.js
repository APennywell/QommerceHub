// Environment variable validation
function validateEnv() {
  const missing = [];

  // JWT_SECRET is always required
  if (!process.env.JWT_SECRET) {
    missing.push("JWT_SECRET");
  }

  // Either DATABASE_URL (Railway/Heroku) OR individual DB vars (local)
  const hasDbUrl = !!process.env.DATABASE_URL;
  const hasIndividualDbVars = process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME;

  if (!hasDbUrl && !hasIndividualDbVars) {
    missing.push("DATABASE_URL (or DB_HOST, DB_USER, DB_NAME, DB_PASSWORD, DB_PORT)");
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
