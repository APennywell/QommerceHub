const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

const {
    createCustomer,
    getCustomers,
    updateCustomer,
    deleteCustomer
} = require("../services/customerService");

// Customer validation schema
const Joi = require("joi");
const customerSchema = Joi.object({
    name: Joi.string().min(2).max(200).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().max(50).optional().allow(''),
    address: Joi.string().max(500).optional().allow('')
});

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get paginated customers
 *     tags: [Customers]
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
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of customers
 */
router.get("/", auth, async (req, res) => {
    try {
        const { page, limit, search } = req.query;
        const result = await getCustomers(req.tenant.id, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            search: search || ''
        });
        res.json(result);
    } catch (err) {
        console.error("GET CUSTOMERS ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string, example: John Doe }
 *               email: { type: string, format: email, example: john@example.com }
 *               phone: { type: string, example: 555-1234 }
 *               address: { type: string, example: 123 Main St }
 *     responses:
 *       201:
 *         description: Customer created
 */
router.post("/", auth, async (req, res) => {
    try {
        const { error } = customerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: "Validation failed",
                details: error.details.map(d => ({ field: d.path[0], message: d.message }))
            });
        }

        const customer = await createCustomer({
            tenantId: req.tenant.id,
            ...req.body
        });
        res.status(201).json(customer);
    } catch (err) {
        console.error("CREATE CUSTOMER ERROR:", err);
        if (err.code === '23505') {
            return res.status(400).json({ error: "Customer with this email already exists" });
        }
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update a customer
 *     tags: [Customers]
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
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               address: { type: string }
 *     responses:
 *       200:
 *         description: Customer updated
 */
router.put("/:id", auth, async (req, res) => {
    try {
        const customer = await updateCustomer(
            Number(req.params.id),
            req.tenant.id,
            req.body
        );

        if (!customer) {
            return res.status(404).json({ error: "Customer not found" });
        }

        res.json(customer);
    } catch (err) {
        console.error("UPDATE CUSTOMER ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Delete a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Customer deleted
 */
router.delete("/:id", auth, async (req, res) => {
    try {
        const customer = await deleteCustomer(
            Number(req.params.id),
            req.tenant.id
        );

        if (!customer) {
            return res.status(404).json({ error: "Customer not found" });
        }

        res.json({ message: "Customer deleted" });
    } catch (err) {
        console.error("DELETE CUSTOMER ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
