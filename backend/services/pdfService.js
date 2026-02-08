const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate invoice PDF for an order
 */
async function generateInvoice(order, storeName = 'QommerceHub') {
    return new Promise((resolve, reject) => {
        try {
            // Create PDF document
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50
            });

            // Create buffer to store PDF
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);

            // Header with gradient-like colors
            doc.rect(0, 0, doc.page.width, 120).fill('#667eea');

            // Store name
            doc.fontSize(28)
               .fillColor('#ffffff')
               .text(storeName, 50, 40);

            doc.fontSize(12)
               .text('INVOICE', 50, 75);

            // Invoice details box
            doc.fontSize(10)
               .fillColor('#ffffff')
               .text(`Invoice #${order.id}`, doc.page.width - 200, 40, { width: 150, align: 'right' })
               .text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, doc.page.width - 200, 55, { width: 150, align: 'right' })
               .text(`Status: ${order.status.toUpperCase()}`, doc.page.width - 200, 70, { width: 150, align: 'right' });

            // Reset position after header
            doc.moveDown(4);
            let currentY = 140;

            // Customer information
            doc.fontSize(12)
               .fillColor('#333333')
               .text('Bill To:', 50, currentY, { underline: true });

            currentY += 20;
            doc.fontSize(11)
               .fillColor('#000000')
               .text(order.customer_name, 50, currentY);

            currentY += 15;
            doc.fontSize(10)
               .fillColor('#666666')
               .text(order.customer_email, 50, currentY);

            currentY += 40;

            // Table header
            const tableTop = currentY;
            const itemX = 50;
            const skuX = 200;
            const quantityX = 300;
            const priceX = 380;
            const totalX = 480;

            doc.fontSize(11)
               .fillColor('#ffffff');

            // Table header background
            doc.rect(50, tableTop - 5, doc.page.width - 100, 25).fill('#667eea');

            doc.text('Item', itemX, tableTop, { width: 140 })
               .text('SKU', skuX, tableTop, { width: 90 })
               .text('Qty', quantityX, tableTop, { width: 70 })
               .text('Price', priceX, tableTop, { width: 90 })
               .text('Total', totalX, tableTop, { width: 80, align: 'right' });

            currentY = tableTop + 30;

            // Table rows
            doc.fillColor('#000000');
            let subtotal = 0;

            order.items.forEach((item, index) => {
                const itemTotal = item.quantity * parseFloat(item.price);
                subtotal += itemTotal;

                // Alternating row colors
                if (index % 2 === 0) {
                    doc.rect(50, currentY - 5, doc.page.width - 100, 25).fill('#f9fafb');
                }

                doc.fontSize(10)
                   .fillColor('#000000')
                   .text(item.product_name, itemX, currentY, { width: 140 })
                   .text(item.sku, skuX, currentY, { width: 90 })
                   .text(item.quantity.toString(), quantityX, currentY, { width: 70 })
                   .text(`$${parseFloat(item.price).toFixed(2)}`, priceX, currentY, { width: 90 })
                   .text(`$${itemTotal.toFixed(2)}`, totalX, currentY, { width: 80, align: 'right' });

                currentY += 25;

                // Check if we need a new page
                if (currentY > doc.page.height - 150) {
                    doc.addPage();
                    currentY = 50;
                }
            });

            // Totals section
            currentY += 20;
            const totalsX = doc.page.width - 250;

            // Subtotal
            doc.fontSize(11)
               .fillColor('#666666')
               .text('Subtotal:', totalsX, currentY, { width: 100 })
               .fillColor('#000000')
               .text(`$${subtotal.toFixed(2)}`, totalsX + 100, currentY, { width: 100, align: 'right' });

            currentY += 20;

            // Tax (if applicable)
            const taxRate = parseFloat(process.env.TAX_RATE || '0');
            const tax = subtotal * taxRate;
            if (tax > 0) {
                doc.fillColor('#666666')
                   .text('Tax:', totalsX, currentY, { width: 100 })
                   .fillColor('#000000')
                   .text(`$${tax.toFixed(2)}`, totalsX + 100, currentY, { width: 100, align: 'right' });
                currentY += 20;
            }

            // Total
            doc.rect(totalsX - 10, currentY - 5, 210, 30).fill('#667eea');
            doc.fontSize(14)
               .fillColor('#ffffff')
               .text('TOTAL:', totalsX, currentY + 5, { width: 100 })
               .text(`$${parseFloat(order.total_amount).toFixed(2)}`, totalsX + 100, currentY + 5, { width: 100, align: 'right' });

            currentY += 50;

            // Notes section
            if (order.notes) {
                doc.fontSize(10)
                   .fillColor('#666666')
                   .text('Notes:', 50, currentY)
                   .fillColor('#000000')
                   .text(order.notes, 50, currentY + 15, { width: doc.page.width - 100 });
            }

            // Footer
            const footerY = doc.page.height - 50;
            doc.fontSize(9)
               .fillColor('#999999')
               .text(
                   `Thank you for your business! | ${storeName} | Generated on ${new Date().toLocaleDateString()}`,
                   50,
                   footerY,
                   { align: 'center', width: doc.page.width - 100 }
               );

            // Finalize PDF
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Save invoice PDF to file system
 */
async function saveInvoiceToFile(order, storeName, outputDir = './invoices') {
    try {
        // Create directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const pdfBuffer = await generateInvoice(order, storeName);
        const filename = `invoice-${order.id}-${Date.now()}.pdf`;
        const filepath = path.join(outputDir, filename);

        fs.writeFileSync(filepath, pdfBuffer);
        return { success: true, filepath, filename };
    } catch (error) {
        console.error('Error saving invoice:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    generateInvoice,
    saveInvoiceToFile
};
