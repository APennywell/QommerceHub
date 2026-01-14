const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus
} = require("../services/orderService");

const { generateInvoice } = require("../services/pdfService");

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get paginated orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, processing, completed, cancelled] }
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get("/", auth, async (req, res) => {
    try {
        const { page, limit, status } = req.query;
        const result = await getOrders(req.tenant.id, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            status: status || ''
        });
        res.json(result);
    } catch (err) {
        console.error("GET ORDERS ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID with items
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Order details with items
 */
router.get("/:id", auth, async (req, res) => {
    try {
        const order = await getOrderById(
            Number(req.params.id),
            req.tenant.id
        );

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.json(order);
    } catch (err) {
        console.error("GET ORDER ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customer_id, items]
 *             properties:
 *               customer_id: { type: integer, example: 1 }
 *               notes: { type: string, example: Rush delivery }
 *               items: {
 *                 type: array,
 *                 items: {
 *                   type: object,
 *                   properties: {
 *                     inventory_id: { type: integer },
 *                     quantity: { type: integer },
 *                     price: { type: number }
 *                   }
 *                 }
 *               }
 *     responses:
 *       201:
 *         description: Order created
 */
router.post("/", auth, async (req, res) => {
    try {
        const { customer_id, items, notes } = req.body;

        if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Invalid order data" });
        }

        const order = await createOrder({
            tenantId: req.tenant.id,
            customerId: customer_id,
            items,
            notes
        });

        res.status(201).json(order);
    } catch (err) {
        console.error("CREATE ORDER ERROR:", err);
        if (err.message && err.message.includes('quantity')) {
            return res.status(400).json({ error: "Insufficient inventory" });
        }
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: {
 *                 type: string,
 *                 enum: [pending, processing, completed, cancelled]
 *               }
 *     responses:
 *       200:
 *         description: Order status updated
 */
router.put("/:id/status", auth, async (req, res) => {
    try {
        const { status } = req.body;

        if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const order = await updateOrderStatus(
            Number(req.params.id),
            req.tenant.id,
            status
        );

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.json(order);
    } catch (err) {
        console.error("UPDATE ORDER STATUS ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @swagger
 * /api/orders/{id}/invoice:
 *   get:
 *     summary: Download order invoice as PDF
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: PDF invoice
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get("/:id/invoice", auth, async (req, res) => {
    try {
        const order = await getOrderById(
            Number(req.params.id),
            req.tenant.id
        );

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Get store name from tenant (you could fetch from DB)
        const storeName = req.tenant.store_name || 'QommerceHub';

        // Generate PDF
        const pdfBuffer = await generateInvoice(order, storeName);

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.id}.pdf`);
        res.send(pdfBuffer);

    } catch (err) {
        console.error("GENERATE INVOICE ERROR:", err);
        res.status(500).json({ error: "Failed to generate invoice" });
    }
});

module.exports = router;
