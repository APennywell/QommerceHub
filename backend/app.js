const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const path = require("path");
const fs = require("fs");
const { apiLimiter } = require("./middleware/rateLimiter");
const auth = require("./middleware/auth");

const app = express();

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Security middleware with proper CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "js.stripe.com", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "api.stripe.com"],
      frameSrc: ["'self'", "js.stripe.com"],
      fontSrc: ["'self'", "data:"],
    }
  },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false
}));

// CORS with restricted origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' })); // Reduced from 10mb for security

// Apply rate limiting to all API routes (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/', apiLimiter);
}

// Health Check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString()
  });
});

// Serve frontend files (public)
app.use(express.static(path.join(__dirname, '../frontend')));

// Protected file serving - uploads require authentication
app.get('/uploads/:filename', auth, (req, res) => {
  const filename = req.params.filename;
  const tenantId = req.tenant.id;

  // Validate filename belongs to tenant (filename format: tenantId-timestamp-random.ext)
  if (!filename.startsWith(`${tenantId}-`)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const filepath = path.join(__dirname, 'uploads', filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filepath);
});

// Protected reports - require authentication
app.get('/reports/:filename', auth, (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'reports', filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Report not found' });
  }

  res.download(filepath);
});

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "QommerceHub API Documentation"
}));

// ROUTES
const tenantRoutes = require("./routes/tenantRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const customerRoutes = require("./routes/customerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reportingRoutes = require("./routes/reportingRoutes");
const customizationRoutes = require("./routes/customizationRoutes");

// ROUTE MOUNTS
app.use("/api/tenants", tenantRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportingRoutes);
app.use("/api/customization", customizationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);

  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(isDevelopment && { stack: err.stack }),
  });
});

module.exports = app;
