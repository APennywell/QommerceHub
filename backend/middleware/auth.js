const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.tenant = {
            id: decoded.tenantId,
            email: decoded.email,
        };

        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
};