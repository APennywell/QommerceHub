const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const auth = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../middleware/validation");

const router = express.Router();

/**
 * @swagger
 * /api/tenants/signup:
 *   post:
 *     summary: Register a new tenant
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, store_name]
 *             properties:
 *               email: { type: string, format: email, example: user@example.com }
 *               password: { type: string, minLength: 8, example: SecurePass123! }
 *               store_name: { type: string, example: My Store }
 *     responses:
 *       201:
 *         description: Tenant created successfully
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limited
 */
router.post("/signup", authLimiter, validate(schemas.signup), async (req, res) => {
  try {
    const { email, password, store_name } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
       `
       INSERT INTO tenants (email, password_hash, store_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, store_name, created_at
       `,
      [email, passwordHash, store_name]
    );

    res.status(201).json({
      message: "Tenant created successfully",
      tenant: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/tenants/login:
 *   post:
 *     summary: Authenticate tenant and get JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: test@example.com }
 *               password: { type: string, example: SecurePassword123! }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 token: { type: string }
 *                 tenant: { $ref: '#/components/schemas/Tenant' }
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Rate limited
 */
router.post("/login", authLimiter, validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.query(
      "SELECT id, email, password_hash, store_name FROM tenants WHERE email = $1",
      [email]
    ); 

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const tenant = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      tenant.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { tenantId: tenant.id, email: tenant.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      tenant: {
        id: tenant.id,
        email: tenant.email,
        store_name: tenant.store_name
      }
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/tenants/me:
 *   get:
 *     summary: Get current authenticated tenant
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant information
 *       401:
 *         description: Unauthorized
 */
router.get("/me", auth, async (req, res) => {
  res.json({
    message: "Protected route access granted",
    tenant: req.tenant,
  });
});

module.exports = router;