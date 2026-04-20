const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { Resume, ResumeAnalysis } = require('../models/index');
const { analyzeResume } = require('../services/openRouterService');
const { trackUserActivity } = require('../services/dashboardService');

const extractTextFromFile = async (filePath) => {
  try {
    const fs = require('fs');
    if (!filePath || !fs.existsSync(filePath)) return '';
    if (filePath.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const buf = fs.readFileSync(filePath);
      const data = await pdfParse(buf);
      return data.text || '';
    }
  } catch (_) {}
  return '';
};

// POST /api/resumes  (create resume entry + analyze + store full data)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const resume = await Resume.create({ ...req.body, user: user._id });

    let text = resume.skills || '';
    if (resume.filePath) {
      const extracted = await extractTextFromFile(resume.filePath);
      if (extracted) text = extracted;
    }

    const aiResult = await analyzeResume(text);

    // Store analysis with full extracted data
    const analysis = await ResumeAnalysis.create({
      user: user._id,
      resume: resume._id,
      overallScore: aiResult.score || 50,
      strengths: aiResult.strengths || '',
      improvements: aiResult.improvements || '',
      feedback: aiResult.feedback || '',
      careerPath: aiResult.careerPath || '',
      analysisData: JSON.stringify(aiResult),
      analyzedAt: new Date(),
    });

    // Update resume with analysis reference
    resume.analysisIds = [...(resume.analysisIds || []), analysis._id.toString()];
    await resume.save();

    await trackUserActivity(user._id.toString(), 'resume_upload', JSON.stringify({
      resumeId: resume._id,
      analysisId: analysis._id,
      score: aiResult.score,
      careerPath: aiResult.careerPath,
    }));

    res.json(analysis);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/resumes/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user._id }).sort({ uploadedAt: -1 });
    res.json(resumes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/resumes/:id/analysis
router.get('/:id/analysis', authenticate, async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    if (resume.user.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Unauthorized' });
    const analysis = await ResumeAnalysis.findOne({ resume: req.params.id }).sort({ analyzedAt: -1 });
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    res.json(analysis);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/resumes/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    if (resume.user.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Unauthorized' });
    await ResumeAnalysis.deleteMany({ resume: req.params.id });
    await Resume.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
