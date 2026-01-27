const jwt = require("jsonwebtoken");
const { isBlacklisted } = require("./tokenBlacklist");

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
        // Continue with token validation if blacklist check fails
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.tenant = {
            id: decoded.tenantId,
            email: decoded.email,
        };
        req.token = token; // Store token for potential logout

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token expired" });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
};
