const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Use Cloudinary if configured, otherwise fall back to local disk
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// ── Local disk storage (fallback) ─────────────────────────────────────────────
const baseUploadDir = path.join(__dirname, '../../../backend/uploads');

const makeLocalStorage = (subDir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(baseUploadDir, subDir);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});

const buildLocalUrl = (req, subDir, fileName) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  return `${proto}://${host}/uploads/${subDir}/${fileName}`;
};

// ── Cloudinary upload ─────────────────────────────────────────────────────────
const handleUpload = (subDir, limits = {}) => {
  if (useCloudinary) {
    // Use memory storage so we can pipe buffer to Cloudinary
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, ...limits } });
    return async (req, res) => {
      upload.single('file')(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        try {
          const { uploadToCloudinary } = require('../services/cloudinaryService');
          const { url, publicId } = await uploadToCloudinary(req.file.buffer, subDir, req.file.originalname);
          res.json({
            url,
            publicId,
            fileName: path.basename(url),
            originalFileName: req.file.originalname,
            size: String(req.file.size),
          });
        } catch (e) {
          console.error('[Cloudinary] Upload error:', e.message);
          res.status(500).json({ error: 'File upload failed: ' + e.message });
        }
      });
    };
  }

  // Local disk fallback
  const upload = multer({ storage: makeLocalStorage(subDir), limits: { fileSize: 100 * 1024 * 1024, ...limits } });
  return (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const url = buildLocalUrl(req, subDir, req.file.filename);
      res.json({
        url,
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        size: String(req.file.size),
        path: req.file.path,
      });
    });
  };
};

router.post('/image',  handleUpload('images'));
router.post('/chat',   handleUpload('chats'));
router.post('/video',  handleUpload('videos'));
router.post('/resume', handleUpload('resumes'));

module.exports = router;
