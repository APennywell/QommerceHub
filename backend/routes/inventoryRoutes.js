const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { createLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../middleware/validation");
const { upload, getFileUrl, deleteFile } = require("../services/uploadService");

const {
  createInventory,
  getInventory,
  updateInventory,
  deleteInventory,
  restoreInventory
} = require("../services/inventoryService");

// Health check
router.get("/health", (req, res) => {
  res.json({ message: "Inventory service healthy" });
});

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Get paginated inventory items
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search in name and SKU
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [name, sku, quantity, price, created_at], default: created_at }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [ASC, DESC], default: DESC }
 *     responses:
 *       200:
 *         description: List of inventory items with pagination
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth, async (req, res) => {
  try {
    const { page, limit, search, sortBy, sortOrder } = req.query;
    const result = await getInventory(req.tenant.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search: search || '',
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder || 'DESC'
    });
    res.json(result);
  } catch (err) {
    console.error("GET INVENTORY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/inventory:
 *   post:
 *     summary: Create a new inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, sku, quantity, price]
 *             properties:
 *               name: { type: string, example: Car Wrap - Matte Black }
 *               sku: { type: string, example: WRAP-MB-001 }
 *               quantity: { type: integer, minimum: 0, example: 25 }
 *               price: { type: number, minimum: 0, example: 499.99 }
 *     responses:
 *       201:
 *         description: Item created successfully
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limited
 */
router.post("/", auth, createLimiter, validate(schemas.createInventory), async (req, res) => {
  try {
    const item = await createInventory({
      tenantId: req.tenant.id,
      ...req.body
    });

    res.status(201).json(item);
  } catch (err) {
    console.error("CREATE INVENTORY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE inventory
router.put("/:id", auth, validate(schemas.idParam, "params"), validate(schemas.updateInventory), async (req, res) => {
  try {
    const item = await updateInventory(
      Number(req.params.id),
      req.tenant.id,
      req.body
    );

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (err) {
    console.error("UPDATE INVENTORY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE inventory (soft delete)
router.delete("/:id", auth, validate(schemas.idParam, "params"), async (req, res) => {
  try {
    const item = await deleteInventory(
      Number(req.params.id),
      req.tenant.id
    );

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("DELETE INVENTORY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// RESTORE inventory
router.put("/:id/restore", auth, validate(schemas.idParam, "params"), async (req, res) => {
  try {
    const item = await restoreInventory(
      Number(req.params.id),
      req.tenant.id
    );

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (err) {
    console.error("RESTORE INVENTORY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/inventory/{id}/upload-image:
 *   post:
 *     summary: Upload product image
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 */
router.post("/:id/upload-image", auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageUrl = getFileUrl(req.file.filename);

    // You could update the inventory record with the image URL here
    // For now, just return the URL
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Image Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
