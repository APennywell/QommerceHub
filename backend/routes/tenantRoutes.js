const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");
const auth = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../middleware/validation");
const { sendPasswordResetEmail } = require("../services/emailService");
const { addToBlacklist } = require("../middleware/tokenBlacklist");

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

/**
 * @swagger
 * /api/tenants/logout:
 *   post:
 *     summary: Logout and invalidate current token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/logout", auth, (req, res) => {
  try {
    // Add token to blacklist - it will be rejected on future requests
    // Token expires from blacklist when JWT would naturally expire (24h)
    addToBlacklist(req.token, 24 * 60 * 60 * 1000);

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/tenants/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: user@example.com }
 *     responses:
 *       200:
 *         description: If email exists, reset link will be sent
 *       429:
 *         description: Rate limited
 */
router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if user exists
    const result = await db.query(
      "SELECT id, email FROM tenants WHERE email = $1",
      [email]
    );

    // Always return success to prevent email enumeration attacks
    if (result.rows.length === 0) {
      return res.json({ message: "If the email exists, a reset link has been sent." });
    }

    const tenant = result.rows[0];

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save hashed token to database
    await db.query(
      `UPDATE tenants
       SET reset_token = $1, reset_token_expiry = $2
       WHERE id = $3`,
      [resetTokenHash, resetTokenExpiry, tenant.id]
    );

    // Build reset URL (frontend page)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password.html?token=${resetToken}`;

    // Send email
    const emailResult = await sendPasswordResetEmail({
      email: tenant.email,
      resetToken,
      resetUrl
    });

    if (emailResult.success) {
      // In development, include preview URL in response
      const response = { message: "If the email exists, a reset link has been sent." };
      if (process.env.NODE_ENV !== 'production' && emailResult.previewUrl) {
        response.previewUrl = emailResult.previewUrl;
      }
      return res.json(response);
    } else {
      console.error('Failed to send reset email:', emailResult.error);
      return res.json({ message: "If the email exists, a reset link has been sent." });
    }
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/tenants/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Hash the provided token to match stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const result = await db.query(
      `SELECT id, email FROM tenants
       WHERE reset_token = $1 AND reset_token_expiry > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const tenant = result.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await db.query(
      `UPDATE tenants
       SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL
       WHERE id = $2`,
      [passwordHash, tenant.id]
    );

    res.json({ message: "Password reset successful. You can now log in with your new password." });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;