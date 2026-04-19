const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const baseUploadDir = path.join(__dirname, '../../../backend/uploads');

const makeStorage = (subDir) => multer.diskStorage({
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

const buildUrl = (req, subDir, fileName) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  return `${proto}://${host}/uploads/${subDir}/${fileName}`;
};

const handleUpload = (subDir, limits = {}) => {
  const upload = multer({ storage: makeStorage(subDir), limits: { fileSize: 100 * 1024 * 1024, ...limits } });
  return (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const url = buildUrl(req, subDir, req.file.filename);
      res.json({ url, fileName: req.file.filename, originalFileName: req.file.originalname, size: String(req.file.size), path: req.file.path });
    });
  };
};

router.post('/image', handleUpload('images'));
router.post('/chat', handleUpload('chats'));
router.post('/video', handleUpload('videos'));
router.post('/resume', handleUpload('resumes'));

module.exports = router;
