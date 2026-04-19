const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { ResumeAnalysis } = require('../models/index');

// POST /api/report/generate
router.post('/generate', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const analyses = await ResumeAnalysis.find({ user: user._id }).sort({ analyzedAt: -1 });
    const latest = analyses[0] || null;
    const name = req.body.name || user.name;
    const score = latest?.overallScore || 75;
    const strengths = latest?.strengths ? latest.strengths.split(',').map(s => s.trim()) : ['Problem Solving', 'Communication', 'Teamwork'];
    const improvements = latest?.improvements ? latest.improvements.split(',').map(s => s.trim()) : ['Leadership', 'Cloud', 'System design'];

    res.json({
      userInfo: {
        name,
        email: user.email,
        date: new Date().toISOString().split('T')[0],
        role: req.body.role || 'Career Report',
      },
      summary: { overallScore: score, strengths, improvements },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/report/pdf
router.post('/pdf', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const analyses = await ResumeAnalysis.find({ user: user._id }).sort({ analyzedAt: -1 });
    const latest = analyses[0] || null;
    const name = req.body.name || user.name;
    const role = req.body.role || 'Career Report';
    const score = latest?.overallScore || 75;
    const strengths = latest?.strengths ? latest.strengths.split(',').map(s => s.trim()) : ['Problem Solving', 'Communication', 'Teamwork'];
    const improvements = latest?.improvements ? latest.improvements.split(',').map(s => s.trim()) : ['Leadership', 'Cloud', 'System design'];

    const content = [
      'CAREER DEVELOPMENT REPORT',
      '',
      `Generated for: ${name}`,
      `Date: ${new Date().toISOString().split('T')[0]}`,
      `Target Role: ${role}`,
      '',
      'EXECUTIVE SUMMARY',
      `Overall Career Readiness Score: ${score}%`,
      '',
      'STRENGTHS',
      ...strengths.map(s => `  - ${s}`),
      '',
      'AREAS FOR IMPROVEMENT',
      ...improvements.map(s => `  - ${s}`),
    ].join('\n');

    res.setHeader('Content-Disposition', 'attachment; filename=Career_Report.txt');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.from(content, 'utf-8'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
