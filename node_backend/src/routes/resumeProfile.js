const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { ResumeProfile } = require('../models/index');
const { analyzeResume } = require('../services/openRouterService');
const { trackUserActivity } = require('../services/dashboardService');

const uploadDir = path.join(__dirname, '../../../backend/uploads/resumes');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, require('uuid').v4() + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const extractText = async (filePath) => {
  try {
    if (filePath.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const buf = fs.readFileSync(filePath);
      const data = await pdfParse(buf);
      return data.text || '';
    }
  } catch (_) {}
  return '';
};

const parseResumeFields = (text) => {
  // Simple heuristic extraction
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return {
    summary: lines.slice(0, 3).join(' '),
    skills: text.match(/skills?[:\s]+([^\n]+)/i)?.[1] || '',
    education: text.match(/education[:\s]+([^\n]+)/i)?.[1] || '',
    experience: text.match(/experience[:\s]+([^\n]+)/i)?.[1] || '',
  };
};

// POST /api/resume/upload
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const text = await extractText(file.path);
    const parsed = parseResumeFields(text);

    // Upload to Cloudinary if configured, otherwise use local path
    let fileUrl = null;
    const useCloudinary = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    if (useCloudinary) {
      try {
        const { uploadToCloudinary } = require('../services/cloudinaryService');
        const buf = fs.readFileSync(file.path);
        const result = await uploadToCloudinary(buf, 'resumes', file.originalname);
        fileUrl = result.url;
        // Clean up local temp file
        fs.unlink(file.path, () => {});
      } catch (e) {
        console.error('[Cloudinary] Resume upload error:', e.message);
      }
    }

    let profile = await ResumeProfile.findOne({ user: req.user._id });
    if (!profile) profile = new ResumeProfile({ user: req.user._id });

    Object.assign(profile, {
      ...parsed,
      name: parsed.fullName || profile.name,
      originalFileName: file.originalname,
      storedFileName: file.filename,
      fileType: path.extname(file.originalname).replace('.', ''),
      fileSize: file.size,
      filePath: fileUrl || file.path,
      fileUrl: fileUrl,
      uploadedAt: new Date(),
    });
    await profile.save();

    await trackUserActivity(req.user._id.toString(), 'resume_upload', JSON.stringify({ fileName: file.originalname }));

    res.json({
      success: true,
      storedFile: { originalFileName: file.originalname, path: fileUrl || file.path, size: file.size, url: fileUrl },
      resume: profile,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/resume/:userId
router.get('/:userId', authenticate, async (req, res) => {
  if (req.user._id.toString() !== req.params.userId) return res.status(403).json({ error: 'Forbidden' });
  const profile = await ResumeProfile.findOne({ user: req.params.userId });
  if (!profile) return res.status(404).json({ error: 'Not found' });
  res.json(profile);
});

// PUT /api/resume/update
router.put('/update', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    let profile = await ResumeProfile.findOne({ user: userId });
    if (!profile) profile = new ResumeProfile({ user: userId });
    const fields = ['name', 'email', 'phone', 'location', 'summary', 'education', 'experience', 'skills', 'certifications', 'languages', 'projects'];
    fields.forEach(f => { if (req.body[f] !== undefined) profile[f] = req.body[f]; });
    profile.updatedAt = new Date();
    await profile.save();
    await trackUserActivity(userId.toString(), 'resume_update', null);
    res.json(profile);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/resume/generate-pdf
router.post('/generate-pdf', authenticate, async (req, res) => {
  try {
    const userId = req.body.userId || req.user._id.toString();
    if (req.user._id.toString() !== userId) return res.status(403).json({ error: 'Forbidden' });

    const profile = await ResumeProfile.findOne({ user: userId });
    if (!profile) return res.status(404).json({ error: 'Resume not found' });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
      res.setHeader('Content-Type', 'application/pdf');
      res.send(pdf);
    });

    doc.fontSize(22).font('Helvetica-Bold').text(profile.name || 'Resume', { align: 'center' });
    doc.fontSize(11).font('Helvetica').text([profile.email, profile.phone, profile.location].filter(Boolean).join(' | '), { align: 'center' });
    doc.moveDown();

    const section = (title, content) => {
      if (!content || (Array.isArray(content) && content.length === 0)) return;
      doc.fontSize(13).font('Helvetica-Bold').text(title);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      
      if (Array.isArray(content)) {
        content.forEach(c => {
          if (typeof c === 'string') doc.fontSize(10).font('Helvetica').text(c);
          else {
             // Handle objects for education/experience/projects
             const text = c.degree || c.title || c.company || '';
             doc.fontSize(10).font('Helvetica').text(text);
          }
        });
      } else {
        doc.fontSize(10).font('Helvetica').text(content);
      }
      doc.moveDown(0.5);
    };

    section('Summary', profile.summary);
    section('Skills', profile.skills);
    section('Experience', profile.experience);
    section('Education', profile.education);
    section('Projects', profile.projects);
    doc.end();
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});


module.exports = router;
