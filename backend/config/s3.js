/**
 * AWS S3 Configuration
 * Provides cloud storage for uploads that persist across deploys
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// S3 is optional - falls back to local storage if not configured
const isS3Configured = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET
);

let s3Client = null;

if (isS3Configured) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  console.log('S3 storage configured for bucket:', process.env.AWS_S3_BUCKET);
} else {
  console.log('S3 not configured - using local file storage');
}

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - The file content
 * @param {string} key - The S3 object key (path)
 * @param {string} contentType - MIME type
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
async function uploadToS3(fileBuffer, key, contentType) {
  if (!isS3Configured) {
    return { success: false, error: 'S3 not configured' };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      // Make publicly accessible for product images
      ACL: process.env.AWS_S3_PUBLIC === 'true' ? 'public-read' : 'private'
    });

    await s3Client.send(command);

    // Generate URL
    const url = process.env.AWS_S3_PUBLIC === 'true'
      ? `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
      : null;

    return { success: true, url, key };
  } catch (error) {
    console.error('S3 upload error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a file from S3
 * @param {string} key - The S3 object key
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteFromS3(key) {
  if (!isS3Configured) {
    return { success: false, error: 'S3 not configured' };
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    });

    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a signed URL for private file access
 * @param {string} key - The S3 object key
 * @param {number} expiresIn - URL expiry in seconds (default 1 hour)
 * @returns {Promise<string|null>}
 */
async function getSignedUrlForKey(key, expiresIn = 3600) {
  if (!isS3Configured) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('S3 signed URL error:', error);
    return null;
  }
}

/**
 * Extract S3 key from a full URL
 * @param {string} url - The S3 URL
 * @returns {string|null}
 */
function getKeyFromUrl(url) {
  if (!url || !isS3Configured) return null;

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || 'us-east-1';

  // Handle both URL formats
  const patterns = [
    new RegExp(`https://${bucket}.s3.${region}.amazonaws.com/(.+)`),
    new RegExp(`https://s3.${region}.amazonaws.com/${bucket}/(.+)`)
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

module.exports = {
  isS3Configured,
  uploadToS3,
  deleteFromS3,
  getSignedUrlForKey,
  getKeyFromUrl
};
