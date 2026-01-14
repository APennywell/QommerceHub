const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Create unique filename: timestamp-tenantId-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const tenantId = req.tenant ? req.tenant.id : 'unknown';
        cb(null, `${tenantId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

/**
 * Delete an uploaded file
 */
function deleteFile(filename) {
    const filepath = path.join(uploadDir, filename);
    if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return { success: true };
    }
    return { success: false, error: 'File not found' };
}

/**
 * Get file URL
 */
function getFileUrl(filename) {
    if (!filename) return null;
    return `/uploads/products/${filename}`;
}

module.exports = {
    upload,
    deleteFile,
    getFileUrl,
    uploadDir
};
