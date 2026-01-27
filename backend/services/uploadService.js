const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isS3Configured, uploadToS3, deleteFromS3, getKeyFromUrl } = require('../config/s3');

// Create uploads directories if they don't exist (for local fallback)
const uploadDir = path.join(__dirname, '../uploads/products');
const logosDir = path.join(__dirname, '../uploads/stores/logos');
const backgroundsDir = path.join(__dirname, '../uploads/stores/backgrounds');

[uploadDir, logosDir, backgroundsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
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

// Use memory storage for S3, disk storage for local
const getStorage = (destinationDir) => {
    if (isS3Configured) {
        // Memory storage - files are buffered for S3 upload
        return multer.memoryStorage();
    } else {
        // Disk storage for local files
        return multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, destinationDir);
            },
            filename: function (req, file, cb) {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const tenantId = req.tenant ? req.tenant.id : 'unknown';
                cb(null, `${tenantId}-${uniqueSuffix}${path.extname(file.originalname)}`);
            }
        });
    }
};

// Configure multer for products
const upload = multer({
    storage: getStorage(uploadDir),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// Logo upload middleware
const uploadLogo = multer({
    storage: getStorage(logosDir),
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit for logos
    },
    fileFilter: fileFilter
});

// Background upload middleware
const uploadBackground = multer({
    storage: getStorage(backgroundsDir),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for backgrounds
    },
    fileFilter: fileFilter
});

/**
 * Process uploaded file - saves to S3 or returns local path
 * Call this after multer middleware processes the upload
 * @param {Object} file - The multer file object
 * @param {string} type - 'product', 'logo', or 'background'
 * @param {number|string} tenantId - The tenant ID
 * @returns {Promise<{success: boolean, url?: string, filename?: string, error?: string}>}
 */
async function processUpload(file, type, tenantId) {
    if (!file) {
        return { success: false, error: 'No file provided' };
    }

    if (isS3Configured) {
        // Upload to S3
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const key = `${type}s/${tenantId}/${uniqueSuffix}${ext}`;

        const result = await uploadToS3(file.buffer, key, file.mimetype);
        if (result.success) {
            return {
                success: true,
                url: result.url,
                key: result.key,
                isS3: true
            };
        }
        return result;
    } else {
        // Local storage - file already saved by multer
        const filename = file.filename;
        const urlPath = type === 'product'
            ? `/uploads/products/${filename}`
            : type === 'logo'
                ? `/uploads/stores/logos/${filename}`
                : `/uploads/stores/backgrounds/${filename}`;

        return {
            success: true,
            url: urlPath,
            filename: filename,
            isS3: false
        };
    }
}

/**
 * Delete an uploaded file (S3 or local)
 * @param {string} urlOrFilename - The file URL or filename
 * @param {string} type - 'product', 'logo', or 'background'
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteUpload(urlOrFilename, type = 'product') {
    if (!urlOrFilename) {
        return { success: false, error: 'No file specified' };
    }

    // Check if it's an S3 URL
    if (urlOrFilename.includes('amazonaws.com')) {
        const key = getKeyFromUrl(urlOrFilename);
        if (key) {
            return await deleteFromS3(key);
        }
        return { success: false, error: 'Could not extract S3 key' };
    }

    // Local file deletion
    const filename = path.basename(urlOrFilename);

    // Prevent path traversal attacks
    const sanitizedFilename = path.basename(filename);
    if (sanitizedFilename !== filename || filename.includes('..')) {
        return { success: false, error: 'Invalid filename' };
    }

    let targetDir;
    if (type === 'logo') {
        targetDir = logosDir;
    } else if (type === 'background') {
        targetDir = backgroundsDir;
    } else {
        targetDir = uploadDir;
    }

    const filepath = path.join(targetDir, sanitizedFilename);

    // Verify the resolved path is within target directory
    const resolvedPath = path.resolve(filepath);
    if (!resolvedPath.startsWith(path.resolve(targetDir))) {
        return { success: false, error: 'Invalid file path' };
    }

    if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return { success: true };
    }
    return { success: false, error: 'File not found' };
}

/**
 * Delete file by path (legacy support)
 */
function deleteFile(filename) {
    return deleteUpload(filename, 'product');
}

/**
 * Get file URL
 */
function getFileUrl(filename) {
    if (!filename) return null;
    // S3 URLs are already full URLs
    if (filename.includes('amazonaws.com')) return filename;
    return `/uploads/products/${filename}`;
}

/**
 * Get logo URL
 */
function getLogoUrl(filename) {
    if (!filename) return null;
    if (filename.includes('amazonaws.com')) return filename;
    return `/uploads/stores/logos/${filename}`;
}

/**
 * Get background URL
 */
function getBackgroundUrl(filename) {
    if (!filename) return null;
    if (filename.includes('amazonaws.com')) return filename;
    return `/uploads/stores/backgrounds/${filename}`;
}

/**
 * Delete a store file (logo or background) - legacy support
 */
function deleteStoreFile(filepath) {
    if (!filepath) return { success: false, error: 'File not found' };

    // Check for S3 URL
    if (filepath.includes('amazonaws.com')) {
        return deleteUpload(filepath, 'logo');
    }

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

    // S3 URLs don't have local paths
    if (url.includes('amazonaws.com')) return null;

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
    backgroundsDir,
    // New exports for S3 support
    processUpload,
    deleteUpload,
    isS3Configured
};
