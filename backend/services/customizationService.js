const db = require("../db");

console.log("🎨 customizationService loaded");

/**
 * Get customization settings for a tenant
 */
async function getCustomization(tenantId) {
    const result = await db.query(
        `SELECT
            logo_url,
            background_color,
            background_image_url,
            primary_color,
            secondary_color,
            accent_color,
            text_color,
            animations_enabled
        FROM tenants
        WHERE id = $1`,
        [tenantId]
    );
    return result.rows[0] || null;
}

/**
 * Update customization settings for a tenant
 */
async function updateCustomization(tenantId, settings) {
    const {
        background_color,
        primary_color,
        secondary_color,
        accent_color,
        text_color,
        animations_enabled
    } = settings;

    const result = await db.query(
        `UPDATE tenants
        SET
            background_color = COALESCE($1, background_color),
            primary_color = COALESCE($2, primary_color),
            secondary_color = COALESCE($3, secondary_color),
            accent_color = COALESCE($4, accent_color),
            text_color = COALESCE($5, text_color),
            animations_enabled = COALESCE($6, animations_enabled),
            updated_at = NOW()
        WHERE id = $7
        RETURNING
            logo_url,
            background_color,
            background_image_url,
            primary_color,
            secondary_color,
            accent_color,
            text_color,
            animations_enabled`,
        [background_color, primary_color, secondary_color, accent_color, text_color, animations_enabled, tenantId]
    );
    return result.rows[0];
}

/**
 * Update logo URL for a tenant
 */
async function updateLogo(tenantId, logoUrl) {
    const result = await db.query(
        `UPDATE tenants
        SET logo_url = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING logo_url`,
        [logoUrl, tenantId]
    );
    return result.rows[0];
}

/**
 * Remove logo for a tenant
 */
async function removeLogo(tenantId) {
    const result = await db.query(
        `UPDATE tenants
        SET logo_url = NULL, updated_at = NOW()
        WHERE id = $1
        RETURNING logo_url`,
        [tenantId]
    );
    return result.rows[0];
}

/**
 * Update background image URL for a tenant
 */
async function updateBackground(tenantId, backgroundUrl) {
    const result = await db.query(
        `UPDATE tenants
        SET background_image_url = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING background_image_url`,
        [backgroundUrl, tenantId]
    );
    return result.rows[0];
}

/**
 * Remove background image for a tenant
 */
async function removeBackground(tenantId) {
    const result = await db.query(
        `UPDATE tenants
        SET background_image_url = NULL, updated_at = NOW()
        WHERE id = $1
        RETURNING background_image_url`,
        [tenantId]
    );
    return result.rows[0];
}

/**
 * Get current logo URL for a tenant (for deletion)
 */
async function getCurrentLogo(tenantId) {
    const result = await db.query(
        `SELECT logo_url FROM tenants WHERE id = $1`,
        [tenantId]
    );
    return result.rows[0]?.logo_url || null;
}

/**
 * Get current background URL for a tenant (for deletion)
 */
async function getCurrentBackground(tenantId) {
    const result = await db.query(
        `SELECT background_image_url FROM tenants WHERE id = $1`,
        [tenantId]
    );
    return result.rows[0]?.background_image_url || null;
}

module.exports = {
    getCustomization,
    updateCustomization,
    updateLogo,
    removeLogo,
    updateBackground,
    removeBackground,
    getCurrentLogo,
    getCurrentBackground
};
