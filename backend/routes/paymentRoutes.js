const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const orderService = require('../services/orderService');

/**
 * @swagger
 * /api/payments/create-intent:
 *   post:
 *     summary: Create a payment intent for an order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, orderId, customerEmail]
 *             properties:
 *               amount: { type: number, example: 99.99 }
 *               orderId: { type: integer, example: 1 }
 *               customerEmail: { type: string, example: customer@example.com }
 *               currency: { type: string, example: usd }
 *     responses:
 *       200:
 *         description: Payment intent created
 */
router.post('/create-intent', auth, async (req, res) => {
    try {
        const { amount, orderId, customerEmail, currency } = req.body;

        if (!amount || !orderId || !customerEmail) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate order belongs to authenticated tenant
        const order = await orderService.getOrderById(orderId, req.tenant.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const result = await paymentService.createPaymentIntent({
            amount,
            currency: currency || 'usd',
            orderId,
            customerEmail
        });

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Create Payment Intent Error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

/**
 * @swagger
 * /api/payments/status/{paymentIntentId}:
 *   get:
 *     summary: Get payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentIntentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment status retrieved
 */
router.get('/status/:paymentIntentId', auth, async (req, res) => {
    try {
        const result = await paymentService.getPaymentStatus(req.params.paymentIntentId);

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Get Payment Status Error:', error);
        res.status(500).json({ error: 'Failed to get payment status' });
    }
});

/**
 * @swagger
 * /api/payments/refund:
 *   post:
 *     summary: Create a refund for a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentIntentId]
 *             properties:
 *               paymentIntentId: { type: string }
 *               amount: { type: number }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Refund created
 */
router.post('/refund', auth, async (req, res) => {
    try {
        const { paymentIntentId, amount, reason } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({ error: 'Payment Intent ID required' });
        }

        const result = await paymentService.createRefund({
            paymentIntentId,
            amount,
            reason
        });

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Create Refund Error:', error);
        res.status(500).json({ error: 'Failed to create refund' });
    }
});

module.exports = router;
