const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");
const auth = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../middleware/validation");
const { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } = require("../services/emailService");
const { addToBlacklist } = require("../middleware/tokenBlacklist");
const { logAudit } = require("../middleware/auditLog");

const router = express.Router();

// Constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Record a login attempt
 */
async function recordLoginAttempt(email, ip, success) {
  try {
    await db.query(
      'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)',
      [email, ip, success]
    );
  } catch (err) {
    // Table might not exist yet if migrations haven't run
    if (err.code !== '42P01') {
      console.error('Failed to record login attempt:', err.message);
    }
  }
}

/**
 * Check if account is locked
 */
async function isAccountLocked(email) {
  try {
    const result = await db.query(
      'SELECT locked_until FROM tenants WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) return false;

    const lockedUntil = result.rows[0].locked_until;
    if (!lockedUntil) return false;

    return new Date(lockedUntil) > new Date();
  } catch (err) {
    return false;
  }
}

/**
 * Lock account after too many failed attempts
 */
async function handleFailedLogin(email) {
  try {
    // Increment failed count
    await db.query(
      'UPDATE tenants SET failed_login_count = COALESCE(failed_login_count, 0) + 1 WHERE email = $1',
      [email]
    );

    // Check if should lock
    const result = await db.query(
      'SELECT failed_login_count FROM tenants WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0 && result.rows[0].failed_login_count >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      await db.query(
        'UPDATE tenants SET locked_until = $1 WHERE email = $2',
        [lockedUntil, email]
      );
      return { locked: true, lockedUntil };
    }

    return { locked: false };
  } catch (err) {
    console.error('Failed to handle failed login:', err.message);
    return { locked: false };
  }
}

/**
 * Reset failed login count on successful login
 */
async function resetFailedLogins(email) {
  try {
    await db.query(
      'UPDATE tenants SET failed_login_count = 0, locked_until = NULL WHERE email = $1',
      [email]
    );
  } catch (err) {
    console.error('Failed to reset failed logins:', err.message);
  }
}

/**
 * Generate tokens (access + refresh)
 */
function generateTokens(tenant) {
  const accessToken = jwt.sign(
    { tenantId: tenant.id, email: tenant.email, role: tenant.role || 'owner', type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { tenantId: tenant.id, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Try inserting with new columns, fall back to basic insert if columns don't exist
    let result;
    try {
      result = await db.query(
        `INSERT INTO tenants (email, password_hash, store_name, email_verified, verification_token, verification_token_expiry, role, first_login)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, email, store_name, created_at, email_verified`,
        [email, passwordHash, store_name, false, verificationTokenHash, verificationExpiry, 'owner', true]
      );
    } catch (insertErr) {
      // Fall back to basic insert if new columns don't exist
      if (insertErr.code === '42703') {
        result = await db.query(
          `INSERT INTO tenants (email, password_hash, store_name)
           VALUES ($1, $2, $3)
           RETURNING id, email, store_name, created_at`,
          [email, passwordHash, store_name]
        );
      } else {
        throw insertErr;
      }
    }

    const tenant = result.rows[0];

    // Send verification email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const verificationUrl = `${frontendUrl}/verify-email.html?token=${verificationToken}`;

    const emailResult = await sendVerificationEmail({
      email: tenant.email,
      storeName: store_name,
      verificationUrl
    });

    // Log audit
    logAudit({
      tenantId: tenant.id,
      action: 'create',
      entityType: 'tenant',
      entityId: tenant.id,
      newValues: { email, store_name },
      req
    });

    const response = {
      message: "Account created! Please check your email to verify your account.",
      tenant: result.rows[0],
      emailVerificationRequired: true
    };

    // In development, include preview URL
    if (process.env.NODE_ENV !== 'production' && emailResult.previewUrl) {
      response.emailPreviewUrl = emailResult.previewUrl;
    }

    res.status(201).json(response);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: "Email already registered" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/tenants/verify-email:
 *   post:
 *     summary: Verify email with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await db.query(
      `SELECT id, email, store_name FROM tenants
       WHERE verification_token = $1 AND verification_token_expiry > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired verification token" });
    }

    const tenant = result.rows[0];

    // Mark as verified
    await db.query(
      `UPDATE tenants
       SET email_verified = TRUE, verification_token = NULL, verification_token_expiry = NULL
       WHERE id = $1`,
      [tenant.id]
    );

    // Send welcome email
    await sendWelcomeEmail({
      email: tenant.email,
      storeName: tenant.store_name
    });

    // Log audit
    logAudit({
      tenantId: tenant.id,
      action: 'update',
      entityType: 'tenant',
      entityId: tenant.id,
      newValues: { email_verified: true },
      req
    });

    res.json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    console.error("VERIFY EMAIL ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/tenants/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Verification email sent
 */
router.post("/resend-verification", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const result = await db.query(
      'SELECT id, email, store_name, email_verified FROM tenants WHERE email = $1',
      [email]
    );

    // Always return success to prevent enumeration
    if (result.rows.length === 0 || result.rows[0].email_verified) {
      return res.json({ message: "If the email exists and is unverified, a verification link has been sent." });
    }

    const tenant = result.rows[0];

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      'UPDATE tenants SET verification_token = $1, verification_token_expiry = $2 WHERE id = $3',
      [verificationTokenHash, verificationExpiry, tenant.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const verificationUrl = `${frontendUrl}/verify-email.html?token=${verificationToken}`;

    const emailResult = await sendVerificationEmail({
      email: tenant.email,
      storeName: tenant.store_name,
      verificationUrl
    });

    const response = { message: "If the email exists and is unverified, a verification link has been sent." };

    if (process.env.NODE_ENV !== 'production' && emailResult.previewUrl) {
      response.emailPreviewUrl = emailResult.previewUrl;
    }

    res.json(response);
  } catch (err) {
    console.error("RESEND VERIFICATION ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/tenants/login:
 *   post:
 *     summary: Authenticate tenant and get JWT tokens
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
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 *       429:
 *         description: Rate limited
 */
router.post("/login", authLimiter, validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.connection?.remoteAddress;

    // Check if account is locked
    if (await isAccountLocked(email)) {
      await recordLoginAttempt(email, clientIp, false);
      return res.status(423).json({
        error: "Account is locked due to too many failed login attempts. Please try again later."
      });
    }

    const result = await db.query(
      "SELECT id, email, password_hash, store_name, email_verified, role, first_login FROM tenants WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      await recordLoginAttempt(email, clientIp, false);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const tenant = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, tenant.password_hash);

    if (!passwordMatch) {
      await recordLoginAttempt(email, clientIp, false);
      const lockResult = await handleFailedLogin(email);

      if (lockResult.locked) {
        return res.status(423).json({
          error: "Account locked due to too many failed attempts. Try again in 30 minutes."
        });
      }

      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check email verification (allow in development)
    if (tenant.email_verified === false && process.env.NODE_ENV === 'production') {
      await recordLoginAttempt(email, clientIp, false);
      return res.status(403).json({
        error: "Please verify your email before logging in",
        emailVerificationRequired: true
      });
    }

    // Success - reset failed attempts
    await recordLoginAttempt(email, clientIp, true);
    await resetFailedLogins(email);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(tenant);

    // Log audit
    logAudit({
      tenantId: tenant.id,
      action: 'login',
      entityType: 'session',
      entityId: tenant.id,
      req
    });

    res.json({
      message: "Login successful",
      token: accessToken,
      refreshToken,
      tenant: {
        id: tenant.id,
        email: tenant.email,
        store_name: tenant.store_name,
        role: tenant.role || 'owner',
        firstLogin: tenant.first_login
      }
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/tenants/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access token generated
 *       401:
 *         description: Invalid refresh token
 */
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: "Invalid token type" });
    }

    // Get tenant
    const result = await db.query(
      'SELECT id, email, role FROM tenants WHERE id = $1',
      [decoded.tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Tenant not found" });
    }

    const tenant = result.rows[0];

    // Generate new access token only
    const accessToken = jwt.sign(
      { tenantId: tenant.id, email: tenant.email, role: tenant.role || 'owner', type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    res.json({
      token: accessToken,
      expiresIn: ACCESS_TOKEN_EXPIRY
    });
  } catch (err) {
    console.error("REFRESH ERROR:", err);
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
 * /api/tenants/complete-onboarding:
 *   post:
 *     summary: Mark onboarding as complete
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding completed
 */
router.post("/complete-onboarding", auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE tenants SET first_login = FALSE WHERE id = $1',
      [req.tenant.id]
    );

    res.json({ message: "Onboarding completed" });
  } catch (err) {
    console.error("ONBOARDING ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
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
router.post("/logout", auth, async (req, res) => {
  try {
    // Add token to blacklist - 1h for access tokens
    await addToBlacklist(req.token, 60 * 60 * 1000);

    // Log audit
    logAudit({
      tenantId: req.tenant.id,
      action: 'logout',
      entityType: 'session',
      entityId: req.tenant.id,
      req
    });

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

    await db.query(
      `UPDATE tenants SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3`,
      [resetTokenHash, resetTokenExpiry, tenant.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const resetUrl = `${frontendUrl}/reset-password.html?token=${resetToken}`;

    const emailResult = await sendPasswordResetEmail({
      email: tenant.email,
      resetToken,
      resetUrl
    });

    if (emailResult.success) {
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

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await db.query(
      `SELECT id, email FROM tenants WHERE reset_token = $1 AND reset_token_expiry > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const tenant = result.rows[0];
    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE tenants SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2`,
      [passwordHash, tenant.id]
    );

    // Log audit
    logAudit({
      tenantId: tenant.id,
      action: 'update',
      entityType: 'tenant',
      entityId: tenant.id,
      newValues: { password_reset: true },
      req
    });

    res.json({ message: "Password reset successful. You can now log in with your new password." });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
