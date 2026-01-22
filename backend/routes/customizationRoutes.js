const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");
const {
    uploadLogo,
    uploadBackground,
    getLogoUrl,
    getBackgroundUrl,
    deleteStoreFile,
    getFilePathFromUrl
} = require("../services/uploadService");

const {
    getCustomization,
    updateCustomization,
    updateLogo,
    removeLogo,
    updateBackground,
    removeBackground,
    getCurrentLogo,
    getCurrentBackground
} = require("../services/customizationService");

/**
 * @swagger
 * /api/customization:
 *   get:
 *     summary: Get store customization settings
 *     tags: [Customization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customization settings
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth, async (req, res) => {
    try {
        const customization = await getCustomization(req.tenant.id);
        res.json({ customization });
    } catch (err) {
        console.error("GET CUSTOMIZATION ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @swagger
 * /api/customization:
 *   put:
 *     summary: Update store customization settings
 *     tags: [Customization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               background_color: { type: string, example: "#f9fafb" }
 *               primary_color: { type: string, example: "#667eea" }
 *               secondary_color: { type: string, example: "#764ba2" }
 *               accent_color: { type: string, example: "#10b981" }
 *               text_color: { type: string, example: "#111827" }
 *               animations_enabled: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Validation error
 */
router.put("/", auth, validate(schemas.updateCustomization), async (req, res) => {
    try {
        const customization = await updateCustomization(req.tenant.id, req.body);
        res.json({
            message: "Customization updated successfully",
            customization
        });
    } catch (err) {
        console.error("UPDATE CUSTOMIZATION ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @swagger
 * /api/customization/logo:
 *   post:
 *     summary: Upload store logo
 *     tags: [Customization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Logo uploaded successfully
 */
router.post("/logo", auth, uploadLogo.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No logo file provided' });
        }

        // Delete old logo if exists
        const oldLogo = await getCurrentLogo(req.tenant.id);
        if (oldLogo) {
            const oldPath = getFilePathFromUrl(oldLogo);
            deleteStoreFile(oldPath);
        }

        const logoUrl = getLogoUrl(req.file.filename);
        await updateLogo(req.tenant.id, logoUrl);

        res.json({
            message: "Logo uploaded successfully",
            logo_url: logoUrl
        });
    } catch (error) {
        console.error('Logo Upload Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/customization/logo:
 *   delete:
 *     summary: Remove store logo
 *     tags: [Customization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logo removed successfully
 */
router.delete("/logo", auth, async (req, res) => {
    try {
        const currentLogo = await getCurrentLogo(req.tenant.id);
        if (currentLogo) {
            const filepath = getFilePathFromUrl(currentLogo);
            deleteStoreFile(filepath);
        }

        await removeLogo(req.tenant.id);
        res.json({ message: "Logo removed successfully" });
    } catch (error) {
        console.error('Logo Delete Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/customization/background:
 *   post:
 *     summary: Upload store background image
 *     tags: [Customization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               background:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Background uploaded successfully
 */
router.post("/background", auth, uploadBackground.single('background'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No background file provided' });
        }

        // Delete old background if exists
        const oldBg = await getCurrentBackground(req.tenant.id);
        if (oldBg) {
            const oldPath = getFilePathFromUrl(oldBg);
            deleteStoreFile(oldPath);
        }

        const backgroundUrl = getBackgroundUrl(req.file.filename);
        await updateBackground(req.tenant.id, backgroundUrl);

        res.json({
            message: "Background uploaded successfully",
            background_image_url: backgroundUrl
        });
    } catch (error) {
        console.error('Background Upload Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/customization/background:
 *   delete:
 *     summary: Remove store background image
 *     tags: [Customization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Background removed successfully
 */
router.delete("/background", auth, async (req, res) => {
    try {
        const currentBg = await getCurrentBackground(req.tenant.id);
        if (currentBg) {
            const filepath = getFilePathFromUrl(currentBg);
            deleteStoreFile(filepath);
        }

        await removeBackground(req.tenant.id);
        res.json({ message: "Background removed successfully" });
    } catch (error) {
        console.error('Background Delete Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
