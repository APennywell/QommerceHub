const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requirePermission, PERMISSIONS } = require('../middleware/roles');
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
router.post('/refund', auth, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), async (req, res) => {
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

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Stripe webhook endpoint for payment events
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn('STRIPE_WEBHOOK_SECRET not configured — webhook endpoint disabled');
        return res.status(200).json({ received: true, warning: 'Webhook secret not configured' });
    }

    let event;
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const sig = req.headers['stripe-signature'];
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                const orderId = paymentIntent.metadata.order_id;
                if (orderId) {
                    const db = require('../db');
                    await db.query(
                        "UPDATE orders SET status = 'processing' WHERE id = $1 AND status = 'pending'",
                        [parseInt(orderId)]
                    );
                    console.log(`Payment succeeded for order ${orderId}`);
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                console.log(`Payment failed for order ${paymentIntent.metadata.order_id}: ${paymentIntent.last_payment_error?.message}`);
                break;
            }
            default:
                break;
        }

        res.json({ received: true });
    } catch (err) {
        console.error('Webhook processing error:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
