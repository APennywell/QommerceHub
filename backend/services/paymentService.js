const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.warn('STRIPE_SECRET_KEY not configured — payment endpoints will return errors');
}
const stripe = stripeKey ? require('stripe')(stripeKey) : null;

function ensureStripe() {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
  }
  return stripe;
}

/**
 * Create a payment intent for an order
 */
async function createPaymentIntent({ amount, currency = 'usd', orderId, customerEmail }) {
    try {
        const paymentIntent = await ensureStripe().paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency,
            metadata: {
                order_id: orderId.toString(),
                customer_email: customerEmail
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return {
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100
        };
    } catch (error) {
        console.error('Payment Intent Creation Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Confirm a payment
 */
async function confirmPayment(paymentIntentId) {
    try {
        const paymentIntent = await ensureStripe().paymentIntents.retrieve(paymentIntentId);

        return {
            success: true,
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            orderId: paymentIntent.metadata.order_id
        };
    } catch (error) {
        console.error('Payment Confirmation Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Create a refund for a payment
 */
async function createRefund({ paymentIntentId, amount, reason = 'requested_by_customer' }) {
    try {
        const refund = await ensureStripe().refunds.create({
            payment_intent: paymentIntentId,
            amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
            reason: reason
        });

        return {
            success: true,
            refundId: refund.id,
            amount: refund.amount / 100,
            status: refund.status
        };
    } catch (error) {
        console.error('Refund Creation Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get payment status
 */
async function getPaymentStatus(paymentIntentId) {
    try {
        const paymentIntent = await ensureStripe().paymentIntents.retrieve(paymentIntentId);

        return {
            success: true,
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            created: new Date(paymentIntent.created * 1000)
        };
    } catch (error) {
        console.error('Get Payment Status Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Create a customer in Stripe
 */
async function createStripeCustomer({ email, name, phone }) {
    try {
        const customer = await ensureStripe().customers.create({
            email: email,
            name: name,
            phone: phone,
            metadata: {
                source: 'qommercehub'
            }
        });

        return {
            success: true,
            customerId: customer.id,
            email: customer.email
        };
    } catch (error) {
        console.error('Stripe Customer Creation Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    createPaymentIntent,
    confirmPayment,
    createRefund,
    getPaymentStatus,
    createStripeCustomer
};
