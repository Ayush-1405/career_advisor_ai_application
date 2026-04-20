const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer  - File data
 * @param {string} folder  - Cloudinary folder (images, chats, resumes, videos)
 * @param {string} originalName - Original filename for resource_type detection
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadToCloudinary = (buffer, folder, originalName = '') => {
  return new Promise((resolve, reject) => {
    const ext = originalName.split('.').pop().toLowerCase();
    const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
    const isPdf   = ext === 'pdf';
    const resourceType = isVideo ? 'video' : (isPdf ? 'raw' : 'image');

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `career_advisor/${folder}`,
        resource_type: resourceType,
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

module.exports = { uploadToCloudinary };
