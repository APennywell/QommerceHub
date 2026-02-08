const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requirePermission, PERMISSIONS } = require('../middleware/roles');
const reportingService = require('../services/reportingService');
const path = require('path');

/**
 * @swagger
 * /api/reports/sales/csv:
 *   get:
 *     summary: Generate and download sales report (CSV)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get('/sales/csv', auth, requirePermission(PERMISSIONS.EXPORT_DATA), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const result = await reportingService.generateSalesReportCSV(req.tenant.id, {
            startDate,
            endDate
        });

        if (result.success) {
            res.download(result.filepath, result.filename, (err) => {
                if (err) {
                    console.error('Download Error:', err);
                }
            });
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Generate Sales Report Error:', error);
        res.status(500).json({ error: 'Failed to generate sales report' });
    }
});

/**
 * @swagger
 * /api/reports/inventory/excel:
 *   get:
 *     summary: Generate and download inventory report (Excel)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel file download
 */
router.get('/inventory/excel', auth, requirePermission(PERMISSIONS.EXPORT_DATA), async (req, res) => {
    try {
        const result = await reportingService.generateInventoryReportExcel(req.tenant.id);

        if (result.success) {
            res.download(result.filepath, result.filename, (err) => {
                if (err) {
                    console.error('Download Error:', err);
                }
            });
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Generate Inventory Report Error:', error);
        res.status(500).json({ error: 'Failed to generate inventory report' });
    }
});

/**
 * @swagger
 * /api/reports/customers/csv:
 *   get:
 *     summary: Generate and download customer report (CSV)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get('/customers/csv', auth, requirePermission(PERMISSIONS.EXPORT_DATA), async (req, res) => {
    try {
        const result = await reportingService.generateCustomerReportCSV(req.tenant.id);

        if (result.success) {
            res.download(result.filepath, result.filename, (err) => {
                if (err) {
                    console.error('Download Error:', err);
                }
            });
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Generate Customer Report Error:', error);
        res.status(500).json({ error: 'Failed to generate customer report' });
    }
});

module.exports = router;
