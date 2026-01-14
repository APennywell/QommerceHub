const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/analytics/sales:
 *   get:
 *     summary: Get sales analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Sales analytics data
 *       401:
 *         description: Unauthorized
 */
router.get('/sales', auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const analytics = await analyticsService.getSalesAnalytics(req.tenant.id, { days });
        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/analytics/inventory:
 *   get:
 *     summary: Get inventory statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory statistics
 *       401:
 *         description: Unauthorized
 */
router.get('/inventory', auth, async (req, res) => {
    try {
        const stats = await analyticsService.getInventoryStats(req.tenant.id);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
