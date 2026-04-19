const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const { findUserByIdOrEmail } = require('../utils/userHelper');
const { trackUserActivity } = require('../services/dashboardService');

// GET /api/user/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    res.json(req.user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/user/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const allowed = ['name', 'email', 'phoneNumber', 'profilePictureUrl', 'bio', 'location', 'linkedinUrl', 'githubUrl', 'websiteUrl', 'bannerUrl', 'isPrivate'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    // Check email uniqueness if changing
    if (update.email && update.email !== req.user.email) {
      const exists = await User.findOne({ email: update.email.toLowerCase() });
      if (exists) return res.status(400).json({ error: 'Email already exists' });
      update.email = update.email.toLowerCase().trim();
    }

    update.updatedAt = new Date();
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    await trackUserActivity(req.user._id.toString(), 'profile_update', null);
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/user/profile/:userId  — respects privacy
router.get('/profile/:userId', authenticate, async (req, res) => {
  try {
    const user = await findUserByIdOrEmail(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If the account is private, check if the requester is connected
    if (user.isPrivate) {
      const requesterId = req.user._id.toString();
      const requesterEmail = req.user.email;
      if (requesterId !== user._id.toString()) {
        const { Connection } = require('../models/index');
        const isConnected = await Connection.findOne({
          $or: [
            { followerId: { $in: [requesterId, requesterEmail] }, followedId: user._id.toString(), status: 'ACCEPTED' },
            { followerId: user._id.toString(), followedId: { $in: [requesterId, requesterEmail] }, status: 'ACCEPTED' },
          ],
        });
        if (!isConnected) {
          // Return limited public info only
          return res.json({
            id: user._id.toString(),
            name: user.name,
            profilePictureUrl: user.profilePictureUrl,
            bio: user.bio,
            location: user.location,
            role: user.role,
            isPrivate: true,
            isConnected: false,
          });
        }
      }
    }

    res.json(user);
  } catch (e) {
    res.status(404).json({ error: 'User not found' });
  }
});

// DELETE /api/user/profile
router.delete('/profile', authenticate, async (req, res) => {
  try {
    const { Resume, ResumeAnalysis, UserActivity } = require('../models/index');
    const userId = req.user._id.toString();
    // Clean up related data
    await Resume.deleteMany({ user: req.user._id });
    await ResumeAnalysis.deleteMany({ user: req.user._id });
    await UserActivity.deleteMany({ user: req.user._id });
    await User.findByIdAndDelete(req.user._id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/user/ping
router.post('/ping', authenticate, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { lastActive: new Date() });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/user/status/:userId
router.get('/status/:userId', authenticate, async (req, res) => {
  try {
    const user = await findUserByIdOrEmail(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const isOnline = user.lastActive && (new Date() - new Date(user.lastActive)) < 2 * 60 * 1000;
    res.json({ success: true, isOnline: !!isOnline, lastActive: user.lastActive || '' });
  } catch (e) {
    res.status(404).json({ error: 'Not found' });
  }
});

module.exports = router;
