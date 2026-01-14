const nodemailer = require('nodemailer');

// Create reusable transporter
// For production, use real SMTP credentials (Gmail, SendGrid, etc.)
// For development, this uses ethereal.email (test email service)
let transporter = null;

async function initializeTransporter() {
    if (transporter) return transporter;

    // Check if real SMTP credentials are provided
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else {
        // Development mode: use Ethereal (test email)
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        console.log('📧 Email Service: Using test account (Ethereal)');
        console.log('   Preview emails at: https://ethereal.email');
    }

    return transporter;
}

/**
 * Send order confirmation email
 */
async function sendOrderConfirmation({ customerEmail, customerName, orderId, orderTotal, items }) {
    try {
        const transporter = await initializeTransporter();

        let itemsHtml = '<ul style="list-style: none; padding: 0;">';
        items.forEach(item => {
            const itemTotal = item.quantity * parseFloat(item.price);
            itemsHtml += `
                <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong>${item.product_name}</strong> (${item.sku})<br>
                    Quantity: ${item.quantity} × $${parseFloat(item.price).toFixed(2)} = $${itemTotal.toFixed(2)}
                </li>
            `;
        });
        itemsHtml += '</ul>';

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"QommerceHub" <noreply@qommercehub.com>',
            to: customerEmail,
            subject: `Order Confirmation #${orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🛍️ Order Confirmed!</h1>
                    </div>
                    <div style="padding: 30px; background: #f9fafb;">
                        <p style="font-size: 16px;">Hi ${customerName},</p>
                        <p>Thank you for your order! We've received your order and are processing it now.</p>

                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h2 style="color: #667eea; margin-top: 0;">Order #${orderId}</h2>
                            ${itemsHtml}
                            <div style="text-align: right; padding-top: 15px; border-top: 2px solid #667eea; margin-top: 15px;">
                                <strong style="font-size: 18px; color: #667eea;">Total: $${parseFloat(orderTotal).toFixed(2)}</strong>
                            </div>
                        </div>

                        <p>We'll send you another email when your order ships.</p>
                        <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact our support team.</p>
                    </div>
                    <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                        <p>© ${new Date().getFullYear()} QommerceHub. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        // In development, log the preview URL
        if (process.env.NODE_ENV !== 'production') {
            console.log('📧 Email sent! Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email sending failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send order status update email
 */
async function sendOrderStatusUpdate({ customerEmail, customerName, orderId, oldStatus, newStatus }) {
    try {
        const transporter = await initializeTransporter();

        const statusMessages = {
            'pending': 'Your order is pending and will be processed soon.',
            'processing': 'Your order is being processed and prepared for shipment.',
            'completed': 'Your order has been completed and shipped!',
            'cancelled': 'Your order has been cancelled. If you have questions, please contact support.'
        };

        const statusEmojis = {
            'pending': '⏳',
            'processing': '📦',
            'completed': '✅',
            'cancelled': '❌'
        };

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"QommerceHub" <noreply@qommercehub.com>',
            to: customerEmail,
            subject: `Order #${orderId} Status Update`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">${statusEmojis[newStatus]} Order Update</h1>
                    </div>
                    <div style="padding: 30px; background: #f9fafb;">
                        <p style="font-size: 16px;">Hi ${customerName},</p>
                        <p>Your order status has been updated.</p>

                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h2 style="color: #667eea; margin-top: 0;">Order #${orderId}</h2>
                            <p style="font-size: 18px;"><strong>New Status:</strong> <span style="color: #667eea; text-transform: uppercase;">${newStatus}</span></p>
                            <p>${statusMessages[newStatus]}</p>
                        </div>

                        <p style="color: #6b7280; font-size: 14px;">Thank you for shopping with us!</p>
                    </div>
                    <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                        <p>© ${new Date().getFullYear()} QommerceHub. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        if (process.env.NODE_ENV !== 'production') {
            console.log('📧 Status update email sent! Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email sending failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send low stock alert email to store owner
 */
async function sendLowStockAlert({ storeEmail, storeName, product }) {
    try {
        const transporter = await initializeTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"QommerceHub" <noreply@qommercehub.com>',
            to: storeEmail,
            subject: `⚠️ Low Stock Alert: ${product.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #ef4444; padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">⚠️ Low Stock Alert</h1>
                    </div>
                    <div style="padding: 30px; background: #f9fafb;">
                        <p style="font-size: 16px;">Hi ${storeName},</p>
                        <p>The following product is running low on stock:</p>

                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                            <h2 style="color: #ef4444; margin-top: 0;">${product.name}</h2>
                            <p><strong>SKU:</strong> ${product.sku}</p>
                            <p><strong>Current Stock:</strong> <span style="color: #ef4444; font-size: 24px; font-weight: bold;">${product.quantity}</span></p>
                            <p><strong>Price:</strong> $${parseFloat(product.price).toFixed(2)}</p>
                        </div>

                        <p>Please reorder soon to avoid running out of stock.</p>
                    </div>
                    <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                        <p>© ${new Date().getFullYear()} QommerceHub. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        if (process.env.NODE_ENV !== 'production') {
            console.log('📧 Low stock alert sent! Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email sending failed:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendOrderConfirmation,
    sendOrderStatusUpdate,
    sendLowStockAlert
};
