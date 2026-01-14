const { createObjectCsvWriter } = require('csv-writer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Create reports directory
const reportsDir = path.join(__dirname, '../reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

/**
 * Generate Sales Report (CSV)
 */
async function generateSalesReportCSV(tenantId, { startDate, endDate } = {}) {
    try {
        let query = `
            SELECT
                o.id as order_id,
                o.created_at as order_date,
                o.status,
                o.total_amount,
                c.name as customer_name,
                c.email as customer_email,
                COUNT(oi.id) as items_count
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.tenant_id = $1
        `;

        const params = [tenantId];

        if (startDate) {
            query += ` AND o.created_at >= $${params.length + 1}`;
            params.push(startDate);
        }

        if (endDate) {
            query += ` AND o.created_at <= $${params.length + 1}`;
            params.push(endDate);
        }

        query += ` GROUP BY o.id, c.name, c.email ORDER BY o.created_at DESC`;

        const result = await db.query(query, params);

        const filename = `sales-report-${Date.now()}.csv`;
        const filepath = path.join(reportsDir, filename);

        const csvWriter = createObjectCsvWriter({
            path: filepath,
            header: [
                { id: 'order_id', title: 'Order ID' },
                { id: 'order_date', title: 'Date' },
                { id: 'customer_name', title: 'Customer' },
                { id: 'customer_email', title: 'Email' },
                { id: 'items_count', title: 'Items' },
                { id: 'total_amount', title: 'Total' },
                { id: 'status', title: 'Status' }
            ]
        });

        await csvWriter.writeRecords(result.rows);

        return { success: true, filename, filepath };
    } catch (error) {
        console.error('CSV Generation Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate Inventory Report (Excel)
 */
async function generateInventoryReportExcel(tenantId) {
    try {
        const result = await db.query(
            `SELECT
                id, name, sku, quantity, price,
                (quantity * price) as total_value,
                created_at,
                CASE
                    WHEN quantity = 0 THEN 'Out of Stock'
                    WHEN quantity < 10 THEN 'Low Stock'
                    WHEN quantity < 50 THEN 'Normal'
                    ELSE 'Well Stocked'
                END as stock_status
            FROM inventory
            WHERE tenant_id = $1 AND deleted_at IS NULL
            ORDER BY name ASC`,
            [tenantId]
        );

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventory Report');

        // Add title
        worksheet.mergeCells('A1:H1');
        worksheet.getCell('A1').value = 'QommerceHub - Inventory Report';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add generation date
        worksheet.mergeCells('A2:H2');
        worksheet.getCell('A2').value = `Generated: ${new Date().toLocaleString()}`;
        worksheet.getCell('A2').font = { size: 10, italic: true };
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        // Add headers
        worksheet.addRow([]);
        const headerRow = worksheet.addRow([
            'ID', 'Product Name', 'SKU', 'Quantity', 'Price', 'Total Value', 'Stock Status', 'Created'
        ]);

        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF667eea' }
        };
        headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

        // Add data
        result.rows.forEach(row => {
            const dataRow = worksheet.addRow([
                row.id,
                row.name,
                row.sku,
                row.quantity,
                parseFloat(row.price).toFixed(2),
                parseFloat(row.total_value).toFixed(2),
                row.stock_status,
                new Date(row.created_at).toLocaleDateString()
            ]);

            // Color code stock status
            const statusCell = dataRow.getCell(7);
            if (row.stock_status === 'Out of Stock') {
                statusCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFEF4444' }
                };
                statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            } else if (row.stock_status === 'Low Stock') {
                statusCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF59E0B' }
                };
            }
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: false }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = Math.min(maxLength + 2, 50);
        });

        // Add summary
        const summaryRow = worksheet.addRow([]);
        summaryRow.getCell(1).value = 'SUMMARY';
        summaryRow.getCell(1).font = { bold: true };

        const totalItems = result.rows.length;
        const totalValue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_value), 0);
        const lowStockCount = result.rows.filter(r => r.stock_status === 'Low Stock' || r.stock_status === 'Out of Stock').length;

        worksheet.addRow(['Total Products:', totalItems]);
        worksheet.addRow(['Total Inventory Value:', `$${totalValue.toFixed(2)}`]);
        worksheet.addRow(['Low/Out of Stock Items:', lowStockCount]);

        const filename = `inventory-report-${Date.now()}.xlsx`;
        const filepath = path.join(reportsDir, filename);

        await workbook.xlsx.writeFile(filepath);

        return { success: true, filename, filepath };
    } catch (error) {
        console.error('Excel Generation Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate Customer Report (CSV)
 */
async function generateCustomerReportCSV(tenantId) {
    try {
        const result = await db.query(
            `SELECT
                c.id,
                c.name,
                c.email,
                c.phone,
                c.created_at,
                COUNT(o.id) as total_orders,
                COALESCE(SUM(o.total_amount), 0) as total_spent,
                MAX(o.created_at) as last_order_date
            FROM customers c
            LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'cancelled'
            WHERE c.tenant_id = $1
            GROUP BY c.id
            ORDER BY total_spent DESC`,
            [tenantId]
        );

        const filename = `customer-report-${Date.now()}.csv`;
        const filepath = path.join(reportsDir, filename);

        const csvWriter = createObjectCsvWriter({
            path: filepath,
            header: [
                { id: 'id', title: 'Customer ID' },
                { id: 'name', title: 'Name' },
                { id: 'email', title: 'Email' },
                { id: 'phone', title: 'Phone' },
                { id: 'total_orders', title: 'Total Orders' },
                { id: 'total_spent', title: 'Total Spent' },
                { id: 'last_order_date', title: 'Last Order' },
                { id: 'created_at', title: 'Customer Since' }
            ]
        });

        await csvWriter.writeRecords(result.rows);

        return { success: true, filename, filepath };
    } catch (error) {
        console.error('Customer Report Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete old reports (cleanup)
 */
function cleanupOldReports(daysOld = 7) {
    const files = fs.readdirSync(reportsDir);
    const now = Date.now();
    const maxAge = daysOld * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    files.forEach(file => {
        const filepath = path.join(reportsDir, file);
        const stats = fs.statSync(filepath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
            fs.unlinkSync(filepath);
            deletedCount++;
        }
    });

    return { success: true, deletedCount };
}

module.exports = {
    generateSalesReportCSV,
    generateInventoryReportExcel,
    generateCustomerReportCSV,
    cleanupOldReports,
    reportsDir
};
