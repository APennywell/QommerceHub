const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories if they don't exist
const uploadDir = path.join(__dirname, '../uploads/products');
const logosDir = path.join(__dirname, '../uploads/stores/logos');
const backgroundsDir = path.join(__dirname, '../uploads/stores/backgrounds');

[uploadDir, logosDir, backgroundsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

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
    // Prevent path traversal attacks
    const sanitizedFilename = path.basename(filename);
    if (sanitizedFilename !== filename || filename.includes('..')) {
        return { success: false, error: 'Invalid filename' };
    }

    const filepath = path.join(uploadDir, sanitizedFilename);

    // Verify the resolved path is within uploadDir
    const resolvedPath = path.resolve(filepath);
    if (!resolvedPath.startsWith(path.resolve(uploadDir))) {
        return { success: false, error: 'Invalid file path' };
    }

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

// Configure storage for store logos
const logoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, logosDir);
    },
    filename: function (req, file, cb) {
        const tenantId = req.tenant ? req.tenant.id : 'unknown';
        cb(null, `${tenantId}-logo${path.extname(file.originalname)}`);
    }
});

// Configure storage for store backgrounds
const backgroundStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, backgroundsDir);
    },
    filename: function (req, file, cb) {
        const tenantId = req.tenant ? req.tenant.id : 'unknown';
        cb(null, `${tenantId}-bg${path.extname(file.originalname)}`);
    }
});

// Logo upload middleware (smaller size limit)
const uploadLogo = multer({
    storage: logoStorage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit for logos
    },
    fileFilter: fileFilter
});

// Background upload middleware (larger size limit)
const uploadBackground = multer({
    storage: backgroundStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for backgrounds
    },
    fileFilter: fileFilter
});

/**
 * Get logo URL
 */
function getLogoUrl(filename) {
    if (!filename) return null;
    return `/uploads/stores/logos/${filename}`;
}

/**
 * Get background URL
 */
function getBackgroundUrl(filename) {
    if (!filename) return null;
    return `/uploads/stores/backgrounds/${filename}`;
}

/**
 * Delete a store file (logo or background)
 */
function deleteStoreFile(filepath) {
    if (!filepath) return { success: false, error: 'File not found' };

    // Verify the path is within allowed directories
    const resolvedPath = path.resolve(filepath);
    const allowedDirs = [path.resolve(logosDir), path.resolve(backgroundsDir)];
    const isAllowed = allowedDirs.some(dir => resolvedPath.startsWith(dir));

    if (!isAllowed) {
        return { success: false, error: 'Invalid file path' };
    }

    if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return { success: true };
    }
    return { success: false, error: 'File not found' };
}

/**
 * Get full file path from URL
 */
function getFilePathFromUrl(url) {
    if (!url) return null;

    // Validate URL format - only allow specific paths
    const allowedPaths = ['/uploads/stores/logos/', '/uploads/stores/backgrounds/', '/uploads/products/'];
    if (!allowedPaths.some(p => url.startsWith(p))) {
        return null;
    }

    // Extract and validate filename
    const filename = path.basename(url);
    if (filename.includes('..') || filename !== path.basename(filename)) {
        return null;
    }

    // URL format: /uploads/stores/logos/filename or /uploads/stores/backgrounds/filename
    const relativePath = url.replace(/^\//, '');
    const fullPath = path.join(__dirname, '..', relativePath);

    // Verify resolved path is within allowed directories
    const resolvedPath = path.resolve(fullPath);
    const baseDir = path.resolve(__dirname, '..');
    if (!resolvedPath.startsWith(baseDir)) {
        return null;
    }

    return fullPath;
}

module.exports = {
    upload,
    deleteFile,
    getFileUrl,
    uploadDir,
    uploadLogo,
    uploadBackground,
    getLogoUrl,
    getBackgroundUrl,
    deleteStoreFile,
    getFilePathFromUrl,
    logosDir,
    backgroundsDir
};
