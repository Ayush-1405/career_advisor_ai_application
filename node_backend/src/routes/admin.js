const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const {
  Resume, ResumeAnalysis, CareerPath, UserCareerPath, Post, Connection,
  ChatRoom, Message, SystemSettings, UserActivity, UserProfileCompletion, Notification,
} = require('../models/index');

router.use(authenticate, requireAdmin);

// ─── USERS ────────────────────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '0');
    const size = parseInt(req.query.size || '10');
    const total = await User.countDocuments();
    const users = await User.find().sort({ createdAt: -1 }).skip(page * size).limit(size);
    res.json({ content: users, totalElements: total, totalPages: Math.ceil(total / size), number: page, size });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users/search', async (req, res) => {
  try {
    const { query = '', page = 0, size = 10 } = req.query;
    const filter = query ? { $or: [{ name: new RegExp(query, 'i') }, { email: new RegExp(query, 'i') }] } : {};
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).sort({ createdAt: -1 }).skip(parseInt(page) * parseInt(size)).limit(parseInt(size));
    res.json({ content: users, totalElements: total, totalPages: Math.ceil(total / parseInt(size)), number: parseInt(page), size: parseInt(size) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users/role/:role', async (req, res) => {
  try {
    const users = await User.find({ role: req.params.role.toUpperCase() });
    res.json(users);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (e) { res.status(404).json({ error: 'Not found' }); }
});

router.put('/users/:userId', async (req, res) => {
  try {
    const allowed = ['name', 'email', 'phoneNumber', 'profilePictureUrl', 'bio', 'location', 'linkedinUrl', 'githubUrl', 'websiteUrl'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    update.updatedAt = new Date();
    const user = await User.findByIdAndUpdate(req.params.userId, update, { new: true });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/users/:userId/role-status', async (req, res) => {
  try {
    const { role, isActive, emailVerified } = req.body;
    const update = { updatedAt: new Date() };
    if (role) update.role = role;
    if (isActive !== undefined) update.isActive = isActive;
    if (emailVerified !== undefined) update.emailVerified = emailVerified;
    const user = await User.findByIdAndUpdate(req.params.userId, update, { new: true });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });
    await Resume.deleteMany({ user: req.params.userId });
    await ResumeAnalysis.deleteMany({ user: req.params.userId });
    await UserActivity.deleteMany({ user: req.params.userId });
    await User.findByIdAndDelete(req.params.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

router.get('/dashboard/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    const resumesParsed = await Resume.countDocuments();
    const oneDayAgo = new Date(Date.now() - 86400000);
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: oneDayAgo } });
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: startOfDay } });
    const successfulLogins = await UserActivity.countDocuments({ activityType: 'login', createdAt: { $gte: startOfDay } });
    const completions = await UserProfileCompletion.find();
    const avgCompletion = completions.length
      ? completions.reduce((s, c) => s + (c.completionPercentage || 0), 0) / completions.length
      : 0;
    const recentActivities = await UserActivity.find({ createdAt: { $gte: oneDayAgo } })
      .sort({ createdAt: -1 }).limit(20).populate('user');

    res.json({
      totalUsers, verifiedUsers, resumesParsed, activeUsers, newUsersToday, successfulLogins,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100) : 0,
      completionRate: avgCompletion,
      systemUptime: 99.9,
      recentActivities: recentActivities.map(a => ({
        type: a.activityType,
        message: getAdminActivityMessage(a.activityType, a.user),
        timestamp: a.createdAt,
        icon: getAdminActivityIcon(a.activityType),
        color: getAdminActivityColor(a.activityType),
        userName: a.user?.name || 'Unknown',
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

router.get('/analytics', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalConnections = await Connection.countDocuments();
    const totalResumes = await Resume.countDocuments();
    const totalMessages = await Message.countDocuments();

    // User registrations by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const users = await User.find({ createdAt: { $gte: sixMonthsAgo } }, 'createdAt');
    const byMonth = {};
    users.forEach(u => {
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });

    // Role distribution
    const adminCount = await User.countDocuments({ role: 'ADMIN' });
    const userCount = await User.countDocuments({ role: 'USER' });

    res.json({
      totalUsers, totalPosts, totalConnections, totalResumes, totalMessages,
      userRegistrationsByMonth: byMonth,
      roleDistribution: { ADMIN: adminCount, USER: userCount },
      timestamp: new Date(),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── RESUMES ──────────────────────────────────────────────────────────────────

router.get('/resumes', async (req, res) => {
  try {
    const { page = 0, size = 20 } = req.query;
    const total = await Resume.countDocuments();
    const resumes = await Resume.find()
      .populate('user', 'name email profilePictureUrl')
      .sort({ uploadedAt: -1 })
      .skip(parseInt(page) * parseInt(size))
      .limit(parseInt(size));
    res.json({ content: resumes, totalElements: total, totalPages: Math.ceil(total / parseInt(size)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/analyses', async (req, res) => {
  try {
    const { page = 0, size = 20 } = req.query;
    const total = await ResumeAnalysis.countDocuments();
    const analyses = await ResumeAnalysis.find()
      .populate('user', 'name email profilePictureUrl')
      .populate('resume', 'fileName originalFileName filePath fileUrl')
      .sort({ analyzedAt: -1 })
      .skip(parseInt(page) * parseInt(size))
      .limit(parseInt(size));

    const data = analyses.map(a => ({
      id: a._id.toString(),
      userId: a.user?._id?.toString(),
      userName: a.user?.name || 'Unknown',
      userEmail: a.user?.email || '',
      userAvatar: a.user?.profilePictureUrl || null,
      resumeId: a.resume?._id?.toString(),
      fileName: a.resume?.originalFileName || a.resume?.fileName || 'Unknown',
      fileUrl: a.resume?.fileUrl || a.resume?.filePath || null,
      overallScore: a.overallScore,
      strengths: a.strengths,
      improvements: a.improvements,
      feedback: a.feedback,
      careerPath: a.careerPath,
      analyzedAt: a.analyzedAt,
    }));

    res.json({ content: data, totalElements: total, totalPages: Math.ceil(total / parseInt(size)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── REPORTS ──────────────────────────────────────────────────────────────────

router.get('/reports/overview', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });
    const totalResumes = await Resume.countDocuments();
    const totalAnalyses = await ResumeAnalysis.countDocuments();
    const analyses = await ResumeAnalysis.find({}, 'overallScore');
    const avgScore = analyses.length
      ? analyses.reduce((s, a) => s + (a.overallScore || 0), 0) / analyses.length
      : null;
    const adminCount = await User.countDocuments({ role: 'ADMIN' });
    const userCount = await User.countDocuments({ role: 'USER' });

    // Recent activities
    const activities = await UserActivity.find().sort({ createdAt: -1 }).limit(50).populate('user');
    const userActivityReports = activities.map(a => ({
      userId: a.user?._id?.toString() || 'Unknown',
      userName: a.user?.name || 'Unknown',
      userEmail: a.user?.email || 'Unknown',
      activityType: a.activityType,
      activityData: a.activityData,
      timestamp: a.createdAt,
    }));

    // Resume analyses report
    const analysesReport = await ResumeAnalysis.find().sort({ analyzedAt: -1 }).limit(50).populate('user').populate('resume');
    const resumeAnalysisReports = analysesReport.map(a => ({
      id: a._id.toString(),
      userId: a.user?._id?.toString() || 'Unknown',
      userName: a.user?.name || 'Unknown',
      fileName: a.resume?.fileName || 'Unknown',
      score: a.overallScore || 0,
      strengths: a.strengths,
      weaknesses: a.improvements,
      analyzedAt: a.analyzedAt,
    }));

    // Registrations by month
    const allUsers = await User.find({}, 'createdAt role');
    const userRegistrationsByMonth = {};
    allUsers.forEach(u => {
      if (u.createdAt) {
        const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`;
        userRegistrationsByMonth[key] = (userRegistrationsByMonth[key] || 0) + 1;
      }
    });

    res.json({
      totalUsers, activeUsers, newUsersThisMonth, totalResumes, totalAnalyses,
      averageResumeScore: avgScore,
      roleDistribution: { ADMIN: adminCount, USER: userCount },
      userActivityReports,
      resumeAnalysisReports,
      userRegistrationsByMonth,
      systemUptime: 99.9,
      generatedAt: new Date(),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/reports/export', async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    if (format !== 'csv') return res.status(400).json({ error: 'Only CSV supported' });
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalResumes = await Resume.countDocuments();
    const totalAnalyses = await ResumeAnalysis.countDocuments();
    const adminCount = await User.countDocuments({ role: 'ADMIN' });
    const userCount = await User.countDocuments({ role: 'USER' });

    const csv = [
      'Metric,Value',
      `Total Users,${totalUsers}`,
      `Active Users,${activeUsers}`,
      `Total Resumes,${totalResumes}`,
      `Total Analyses,${totalAnalyses}`,
      '',
      'Role,Count',
      `ADMIN,${adminCount}`,
      `USER,${userCount}`,
    ].join('\n');

    const filename = `admin-report-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
    res.send(Buffer.from(csv, 'utf-8'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

router.get('/settings', async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) settings = await SystemSettings.create({});
    res.json(settings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/settings', async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) settings = new SystemSettings();
    Object.assign(settings, req.body);
    await settings.save();
    res.json(settings);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── CAREER PATH APPLICATIONS ─────────────────────────────────────────────────

router.get('/applications', async (req, res) => {
  try {
    const apps = await UserCareerPath.find().populate('user').populate('careerPath').sort({ appliedAt: -1 });
    res.json(apps);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/applications/seed', async (req, res) => {
  try {
    const existing = await UserCareerPath.countDocuments();
    if (existing > 0) return res.json({ message: 'Applications already exist', count: existing });
    const paths = await CareerPath.find();
    if (!paths.length) return res.status(400).json({ error: 'No career paths available' });
    const users = await User.find();
    let created = 0;
    for (const u of users) {
      const exists = await UserCareerPath.findOne({ user: u._id, careerPath: paths[0]._id });
      if (!exists) {
        await UserCareerPath.create({ user: u._id, careerPath: paths[0]._id, status: 'APPLIED', appliedAt: new Date(), updatedAt: new Date() });
        created++;
      }
    }
    res.json({ created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/applications/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    const app = await UserCareerPath.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('user').populate('careerPath');
    if (!app) return res.status(404).json({ error: 'Not found' });
    res.json(app);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── CAREER PATHS MANAGEMENT ──────────────────────────────────────────────────

router.get('/career-paths', async (req, res) => {
  try {
    const paths = await CareerPath.find();
    res.json(paths);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/career-paths', async (req, res) => {
  try {
    const { _id, id, ...body } = req.body;
    const path = await CareerPath.create(body);
    res.json(path);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/career-paths/:id', async (req, res) => {
  try {
    const path = await CareerPath.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!path) return res.status(404).json({ error: 'Not found' });
    res.json(path);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/career-paths/:id', async (req, res) => {
  try {
    await CareerPath.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SOCIAL: POSTS ────────────────────────────────────────────────────────────

router.get('/social/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    // Enrich with user info
    const { findUserByIdOrEmail } = require('../utils/userHelper');
    const data = await Promise.all(posts.map(async post => {
      const user = await findUserByIdOrEmail(post.userId);
      return {
        id: post._id.toString(),
        content: post.content,
        isAchievement: post.isAchievement,
        createdAt: post.createdAt,
        likesCount: (post.likes || []).length,
        commentsCount: (post.comments || []).length,
        mediaUrls: post.mediaUrls || [],
        mediaType: post.mediaType,
        userId: user?._id?.toString() || post.userId,
        userName: user?.name || 'Unknown User',
        userAvatar: user?.profilePictureUrl || null,
      };
    }));
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/social/posts/:postId', async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.postId);
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SOCIAL: CONNECTIONS ──────────────────────────────────────────────────────

router.get('/social/connections', async (req, res) => {
  try {
    const connections = await Connection.find().sort({ createdAt: -1 });
    const { findUserByIdOrEmail } = require('../utils/userHelper');
    const data = await Promise.all(connections.map(async conn => {
      const follower = await findUserByIdOrEmail(conn.followerId);
      const followed = await findUserByIdOrEmail(conn.followedId);
      return {
        id: conn._id.toString(),
        followerId: conn.followerId,
        followerName: follower?.name || 'Unknown',
        followerAvatar: follower?.profilePictureUrl || null,
        followedId: conn.followedId,
        followedName: followed?.name || 'Unknown',
        followedAvatar: followed?.profilePictureUrl || null,
        status: conn.status,
        createdAt: conn.createdAt,
      };
    }));
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/social/connections/:connectionId', async (req, res) => {
  try {
    await Connection.findByIdAndDelete(req.params.connectionId);
    res.json({ success: true, message: 'Connection deleted successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SOCIAL: CHATS ────────────────────────────────────────────────────────────

router.get('/social/chats', async (req, res) => {
  try {
    const rooms = await ChatRoom.find().sort({ lastUpdate: -1 });
    const { findUserByIdOrEmail } = require('../utils/userHelper');
    const data = await Promise.all(rooms.map(async room => {
      const participants = await Promise.all(room.participantIds.map(id => findUserByIdOrEmail(id)));
      const msgCount = await Message.countDocuments({ chatRoomId: room._id.toString() });
      return {
        id: room._id.toString(),
        participants: participants.filter(Boolean).map(u => ({ id: u._id.toString(), name: u.name, avatar: u.profilePictureUrl })),
        lastMessage: room.lastMessage,
        lastUpdate: room.lastUpdate,
        messageCount: msgCount,
      };
    }));
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/social/chats/:roomId', async (req, res) => {
  try {
    await Message.deleteMany({ chatRoomId: req.params.roomId });
    await ChatRoom.findByIdAndDelete(req.params.roomId);
    res.json({ success: true, message: 'Chat deleted successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SOCIAL: STATS ────────────────────────────────────────────────────────────

router.get('/social/stats', async (req, res) => {
  try {
    const totalPosts = await Post.countDocuments();
    const totalConnections = await Connection.countDocuments();
    const activeChatRooms = await ChatRoom.countDocuments();
    const totalMessages = await Message.countDocuments();
    const pendingConnections = await Connection.countDocuments({ status: 'PENDING' });
    const acceptedConnections = await Connection.countDocuments({ status: 'ACCEPTED' });
    res.json({ success: true, data: { totalPosts, totalConnections, activeChatRooms, totalMessages, pendingConnections, acceptedConnections } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: notifications });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/notifications/:id', async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────

router.get('/activities', async (req, res) => {
  try {
    const { page = 0, size = 20, type } = req.query;
    const filter = type ? { activityType: type } : {};
    const total = await UserActivity.countDocuments(filter);
    const activities = await UserActivity.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(page) * parseInt(size))
      .limit(parseInt(size))
      .populate('user');
    res.json({
      content: activities.map(a => ({
        id: a._id.toString(),
        userId: a.user?._id?.toString(),
        userName: a.user?.name || 'Unknown',
        userEmail: a.user?.email || 'Unknown',
        activityType: a.activityType,
        activityData: a.activityData,
        createdAt: a.createdAt,
      })),
      totalElements: total,
      totalPages: Math.ceil(total / parseInt(size)),
      number: parseInt(page),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

function getAdminActivityMessage(type, user) {
  const name = user?.name || 'Unknown User';
  const map = {
    user_registration: `New user registration: ${name}`,
    resume_upload: `Resume uploaded by ${name}`,
    skills_assessment: `Skills assessment completed by ${name}`,
    login: `User login: ${name}`,
    profile_update: `Profile updated by ${name}`,
  };
  return map[type] || `Activity: ${type} by ${name}`;
}

function getAdminActivityIcon(type) {
  const map = {
    user_registration: 'ri-user-add-line',
    resume_upload: 'ri-file-upload-line',
    skills_assessment: 'ri-brain-line',
    login: 'ri-login-box-line',
    profile_update: 'ri-user-settings-line',
  };
  return map[type] || 'ri-activity-line';
}

function getAdminActivityColor(type) {
  const map = {
    user_registration: 'text-green-600',
    resume_upload: 'text-blue-600',
    skills_assessment: 'text-purple-600',
    login: 'text-indigo-600',
    profile_update: 'text-orange-600',
  };
  return map[type] || 'text-gray-600';
}

module.exports = router;
