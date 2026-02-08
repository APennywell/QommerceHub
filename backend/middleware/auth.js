const jwt = require("jsonwebtoken");
const { isBlacklisted } = require("./tokenBlacklist");
const db = require("../db");

module.exports = async function (req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Check if token is blacklisted (logged out)
    try {
        const blacklisted = await isBlacklisted(token);
        if (blacklisted) {
            return res.status(401).json({ error: "Token has been revoked" });
        }
    } catch (error) {
        console.error('Error checking token blacklist:', error);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check token_version for multi-device logout support
        if (decoded.tokenVersion !== undefined) {
            try {
                const result = await db.query(
                    "SELECT token_version FROM tenants WHERE id = $1",
                    [decoded.tenantId]
                );
                if (result.rows.length > 0 && result.rows[0].token_version !== null) {
                    if (decoded.tokenVersion < result.rows[0].token_version) {
                        return res.status(401).json({ error: "Token has been revoked (password changed or logout-all)" });
                    }
                }
            } catch (dbErr) {
                // Column may not exist yet; skip check
            }
        }

        req.tenant = {
            id: decoded.tenantId,
            email: decoded.email,
            role: decoded.role || 'owner',
        };
        req.token = token;

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token expired" });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
};
