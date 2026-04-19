const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { CareerPath, UserCareerPath, UserSavedCareerPath, ResumeAnalysis } = require('../models/index');
const { trackUserActivity } = require('../services/dashboardService');

// Seed default career paths on startup
const seedDefaultPaths = async () => {
  if (await CareerPath.countDocuments() === 0) {
    await CareerPath.insertMany([
      {
        title: 'Frontend Developer',
        description: 'Build rich, accessible UIs with modern frameworks like React.',
        level: 'Mid-Level', category: 'Technology',
        image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400',
        averageSalary: '$70,000 - $110,000', growth: '18%', popularity: 87,
        requiredSkills: ['JavaScript', 'React', 'HTML', 'CSS', 'Accessibility'],
        careerProgression: [{ level: 'Junior', salary: '$60k-$80k' }, { level: 'Mid', salary: '$80k-$110k' }, { level: 'Senior', salary: '$110k-$150k' }],
      },
      {
        title: 'Data Scientist',
        description: 'Analyze data and build ML models to drive decisions.',
        level: 'Mid-Level', category: 'Analytics',
        image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400',
        averageSalary: '$90,000 - $140,000', growth: '22%', popularity: 81,
        requiredSkills: ['Python', 'Statistics', 'Machine Learning', 'SQL'],
        careerProgression: [{ level: 'Junior', salary: '$80k-$100k' }, { level: 'Mid', salary: '$100k-$130k' }, { level: 'Senior', salary: '$130k-$170k' }],
      },
      {
        title: 'Backend Developer',
        description: 'Design and build scalable server-side applications and APIs.',
        level: 'Mid-Level', category: 'Technology',
        image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400',
        averageSalary: '$75,000 - $120,000', growth: '20%', popularity: 85,
        requiredSkills: ['Java', 'Node.js', 'SQL', 'REST APIs', 'Docker'],
        careerProgression: [{ level: 'Junior', salary: '$65k-$85k' }, { level: 'Mid', salary: '$85k-$115k' }, { level: 'Senior', salary: '$115k-$155k' }],
      },
      {
        title: 'DevOps Engineer',
        description: 'Bridge development and operations with CI/CD, cloud, and automation.',
        level: 'Senior', category: 'Technology',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
        averageSalary: '$95,000 - $150,000', growth: '25%', popularity: 78,
        requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'],
        careerProgression: [{ level: 'Junior', salary: '$75k-$95k' }, { level: 'Mid', salary: '$95k-$130k' }, { level: 'Senior', salary: '$130k-$170k' }],
      },
      {
        title: 'UX/UI Designer',
        description: 'Create intuitive and beautiful user experiences for digital products.',
        level: 'Mid-Level', category: 'Design',
        image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400',
        averageSalary: '$65,000 - $105,000', growth: '15%', popularity: 72,
        requiredSkills: ['Figma', 'User Research', 'Prototyping', 'CSS', 'Accessibility'],
        careerProgression: [{ level: 'Junior', salary: '$55k-$75k' }, { level: 'Mid', salary: '$75k-$100k' }, { level: 'Senior', salary: '$100k-$135k' }],
      },
    ]);
    console.log('[CareerPaths] Seeded default career paths');
  }
};
seedDefaultPaths().catch(console.error);

// GET /api/career-paths
router.get('/', async (req, res) => {
  try {
    const paths = await CareerPath.find();
    res.json(paths);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/career-paths/recommendations
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    // Find latest resume analysis to match skills
    const analysis = await ResumeAnalysis.findOne({ user: userId }).sort({ analyzedAt: -1 });
    if (analysis && analysis.strengths) {
      const userSkills = analysis.strengths.split(',').map(s => s.trim().toLowerCase());
      const allPaths = await CareerPath.find();
      const scored = allPaths.map(cp => {
        const matchCount = (cp.requiredSkills || []).filter(s => userSkills.includes(s.toLowerCase())).length;
        return { path: cp, score: matchCount };
      }).sort((a, b) => b.score - a.score).slice(0, 5).map(x => x.path);
      return res.json(scored);
    }
    const paths = await CareerPath.find().limit(5);
    res.json(paths);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/career-paths/my-applications
router.get('/my-applications', authenticate, async (req, res) => {
  try {
    const apps = await UserCareerPath.find({ user: req.user._id }).populate('careerPath');

    // Normalize: if careerPath didn't populate (old string ID), fetch it manually
    const normalized = await Promise.all(apps.map(async (app) => {
      const obj = app.toJSON();
      // If careerPath is a string (failed populate), try to fetch it
      if (typeof obj.careerPath === 'string' || (obj.careerPath && !obj.careerPath.title)) {
        const cpId = typeof obj.careerPath === 'string' ? obj.careerPath : obj.careerPath?.id;
        if (cpId) {
          const { CareerPath } = require('../models/index');
          const cp = await CareerPath.findById(cpId).lean().catch(() => null);
          if (cp) obj.careerPath = { ...cp, id: cp._id?.toString() };
        }
      }
      return obj;
    }));

    res.json(normalized);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/career-paths/my-saved
router.get('/my-saved', authenticate, async (req, res) => {
  try {
    const saved = await UserSavedCareerPath.find({ userId: req.user._id.toString() });
    res.json(saved);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/career-paths/user/:userId/applications
router.get('/user/:userId/applications', authenticate, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) return res.status(403).json({ error: 'Forbidden' });
    const apps = await UserCareerPath.find({ user: req.params.userId }).populate('careerPath');
    res.json(apps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/career-paths/:id
router.get('/:id', async (req, res) => {
  try {
    const path = await CareerPath.findById(req.params.id);
    if (!path) return res.status(404).json({ error: 'Not found' });
    res.json(path);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/career-paths
router.post('/', authenticate, async (req, res) => {
  try {
    const { _id, id, ...body } = req.body;
    const path = await CareerPath.create(body);
    res.json(path);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/career-paths/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const path = await CareerPath.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!path) return res.status(404).json({ error: 'Not found' });
    res.json(path);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/career-paths/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await CareerPath.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/career-paths/:id/apply
router.post('/:id/apply', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const careerPath = await CareerPath.findById(req.params.id);
    if (!careerPath) return res.status(404).json({ error: 'Career path not found' });

    const existing = await UserCareerPath.findOne({ user: userId, careerPath: req.params.id });
    if (existing) return res.json(existing);

    const app = await UserCareerPath.create({
      user: userId,
      careerPath: req.params.id,
      status: 'APPLIED',
      appliedAt: new Date(),
      updatedAt: new Date(),
    });
    await trackUserActivity(userId.toString(), 'career_application', JSON.stringify({ title: careerPath.title, id: careerPath._id }));
    res.json(app);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/career-paths/:id/save
router.post('/:id/save', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const careerPath = await CareerPath.findById(req.params.id);
    if (!careerPath) return res.status(404).json({ error: 'Career path not found' });

    const existing = await UserSavedCareerPath.findOne({ userId, careerPathId: req.params.id });
    if (existing) return res.json(existing);

    const saved = await UserSavedCareerPath.create({ userId, careerPathId: req.params.id, savedAt: new Date() });
    await trackUserActivity(userId, 'career_saved', JSON.stringify({ title: careerPath.title, id: careerPath._id }));
    res.json(saved);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/career-paths/:id/save
router.delete('/:id/save', authenticate, async (req, res) => {
  try {
    await UserSavedCareerPath.deleteOne({ userId: req.user._id.toString(), careerPathId: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
