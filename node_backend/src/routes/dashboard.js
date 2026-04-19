const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getUserDashboardStats, trackUserActivity } = require('../services/dashboardService');

// GET /api/users/me/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await getUserDashboardStats(req.user._id.toString());
    res.json(stats);
  } catch (e) {
    console.error('Dashboard stats error:', e.message);
    res.json({
      hasResume: false,
      suggestionsCount: 0,
      hasSkillsAssessment: false,
      completionRate: 0,
      totalActivities: 0,
      recentCount: 0,
      resumeCount: 0,
      appliedCount: 0,
      recentActivities: [],
    });
  }
});

// POST /api/users/me/activity
router.post('/activity', authenticate, async (req, res) => {
  try {
    const activityType = req.query.activityType || req.body.activityType;
    const activityData = req.query.activityData || req.body.activityData;
    if (!activityType) return res.status(400).json({ error: 'activityType is required' });
    await trackUserActivity(req.user._id.toString(), activityType, activityData);
    res.json('Activity tracked successfully');
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
