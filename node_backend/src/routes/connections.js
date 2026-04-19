const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { Connection, Notification } = require('../models/index');
const User = require('../models/User');
const { findUserByIdOrEmail } = require('../utils/userHelper');

const enrichUser = (user) => user ? {
  id: user._id.toString(),
  name: user.name || 'Unknown',
  profilePictureUrl: user.profilePictureUrl || null,
  bio: user.bio || null,
  role: user.role || 'USER',
  location: user.location || null,
} : null;

// Resolve a stored identifier (ObjectId string OR email) to a User document
const resolveUser = async (identifier) => {
  if (!identifier) return null;
  return findUserByIdOrEmail(identifier);
};

// Resolve identifier to a canonical userId string
const resolveUserId = async (identifier) => {
  if (!identifier) return null;
  if (identifier.includes('@')) {
    const u = await User.findOne({ email: identifier.toLowerCase() });
    return u?._id?.toString() || null;
  }
  return identifier;
};

// GET /api/connections/network
router.get('/network', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const userEmail = req.user.email;

    // Match by both ObjectId and email (Java backend stored emails as IDs)
    const following = await Connection.find({
      $or: [{ followerId: userId }, { followerId: userEmail }],
      status: 'ACCEPTED',
    });
    const followers = await Connection.find({
      $or: [{ followedId: userId }, { followedId: userEmail }],
      status: 'ACCEPTED',
    });

    // Collect all other-side identifiers
    const otherIds = new Set([
      ...following.map(c => c.followedId),
      ...followers.map(c => c.followerId),
    ]);
    otherIds.delete(userId);
    otherIds.delete(userEmail);

    // Resolve each identifier to a user (handles both ObjectId and email)
    const users = await Promise.all([...otherIds].map(resolveUser));
    const unique = users.filter(Boolean).reduce((acc, u) => {
      if (!acc.find(x => x._id.toString() === u._id.toString())) acc.push(u);
      return acc;
    }, []);

    res.json({ success: true, data: unique.map(enrichUser) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/connections/suggestions
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const userEmail = req.user.email;

    const conns = await Connection.find({
      $or: [
        { followerId: { $in: [userId, userEmail] } },
        { followedId: { $in: [userId, userEmail] } },
      ],
      status: { $in: ['ACCEPTED', 'PENDING'] },
    });

    // Collect all involved identifiers
    const excluded = new Set([userId, userEmail]);
    for (const c of conns) {
      excluded.add(c.followerId);
      excluded.add(c.followedId);
      // Also resolve emails to IDs so we don't suggest the same person twice
      if (c.followerId.includes('@')) {
        const u = await User.findOne({ email: c.followerId });
        if (u) excluded.add(u._id.toString());
      }
      if (c.followedId.includes('@')) {
        const u = await User.findOne({ email: c.followedId });
        if (u) excluded.add(u._id.toString());
      }
    }

    const users = await User.find({ _id: { $nin: [...excluded].filter(id => !id.includes('@')) } }).limit(20);
    res.json({ success: true, data: users.map(enrichUser) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/connections/follow/:userId
router.post('/follow/:userId', authenticate, async (req, res) => {
  try {
    const followerId = req.user._id.toString();
    const followerEmail = req.user.email;

    // Resolve the target to a canonical ObjectId
    const followedId = await resolveUserId(req.params.userId) || req.params.userId;
    if (!followedId || followerId === followedId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Also get the target user's email for legacy matching
    const targetUser = await User.findById(followedId).lean();
    const followedEmail = targetUser?.email || null;

    // Build all possible identifier combos for this pair
    const myIds = [followerId, followerEmail].filter(Boolean);
    const theirIds = [followedId, followedEmail].filter(Boolean);

    // Find ALL connections between these two users in either direction
    const allConns = await Connection.find({
      $or: [
        { followerId: { $in: myIds }, followedId: { $in: theirIds } },
        { followerId: { $in: theirIds }, followedId: { $in: myIds } },
      ],
    });

    const myConns = allConns.filter(c =>
      myIds.includes(c.followerId) && theirIds.includes(c.followedId)
    );
    const theirConns = allConns.filter(c =>
      theirIds.includes(c.followerId) && myIds.includes(c.followedId)
    );

    const isConnected = allConns.some(c => c.status === 'ACCEPTED');
    const iSentPending = myConns.some(c => c.status === 'PENDING');
    const theyPending = theirConns.some(c => c.status === 'PENDING');

    // DISCONNECT: already connected or I sent a pending request → remove all
    if (isConnected || iSentPending) {
      await Connection.deleteMany({ _id: { $in: allConns.map(c => c._id) } });
      return res.json({ success: true, message: 'Disconnected' });
    }

    // ACCEPT: they sent me a pending request → accept it
    if (theyPending) {
      const pendingConn = theirConns.find(c => c.status === 'PENDING');
      pendingConn.status = 'ACCEPTED';
      pendingConn.followerId = theirIds[0]; // keep as-is
      pendingConn.followedId = followerId;  // normalize my side to ObjectId
      await pendingConn.save();
      await Notification.create({
        recipientId: followedId,
        senderId: followerId,
        senderName: req.user.name,
        senderAvatarUrl: req.user.profilePictureUrl,
        type: 'FOLLOW_ACCEPT',
        message: `${req.user.name} accepted your connection request`,
      });
      return res.json({ success: true, message: 'Request accepted' });
    }

    // SEND REQUEST: no existing connection
    await Connection.create({ followerId, followedId, status: 'PENDING' });
    await Notification.create({
      recipientId: followedId,
      senderId: followerId,
      senderName: req.user.name,
      senderAvatarUrl: req.user.profilePictureUrl,
      type: 'FOLLOW_REQUEST',
      message: `${req.user.name} sent you a connection request`,
    });
    res.json({ success: true, message: 'Connection request sent' });
  } catch (e) {
    console.error('[follow]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/connections/invitations
router.get('/invitations', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const userEmail = req.user.email;
    const conns = await Connection.find({
      $or: [{ followedId: userId }, { followedId: userEmail }],
      status: 'PENDING',
    });
    const users = await Promise.all(conns.map(c => resolveUser(c.followerId)));
    res.json({ success: true, data: users.filter(Boolean).map(enrichUser) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/connections/sent
router.get('/sent', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const userEmail = req.user.email;
    const conns = await Connection.find({
      $or: [{ followerId: userId }, { followerId: userEmail }],
      status: 'PENDING',
    });
    const users = await Promise.all(conns.map(c => resolveUser(c.followedId)));
    res.json({ success: true, data: users.filter(Boolean).map(enrichUser) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/connections/accept/:userId
router.post('/accept/:userId', authenticate, async (req, res) => {
  try {
    const followerId = await resolveUserId(req.params.userId) || req.params.userId;
    const followedId = req.user._id.toString();
    const followedEmail = req.user.email;
    const conn = await Connection.findOne({
      followerId,
      $or: [{ followedId }, { followedId: followedEmail }],
    });
    if (conn) {
      conn.status = 'ACCEPTED';
      conn.followedId = followedId; // normalize to ObjectId
      await conn.save();
      await Notification.create({
        recipientId: followerId,
        senderId: followedId,
        senderName: req.user.name,
        senderAvatarUrl: req.user.profilePictureUrl,
        type: 'FOLLOW_ACCEPT',
        message: `${req.user.name} accepted your connection request`,
      });
    }
    res.json({ success: true, message: 'Request accepted' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/connections/reject/:userId
router.post('/reject/:userId', authenticate, async (req, res) => {
  try {
    const followerId = await resolveUserId(req.params.userId) || req.params.userId;
    const followedId = req.user._id.toString();
    const followedEmail = req.user.email;
    await Connection.deleteOne({
      followerId,
      $or: [{ followedId }, { followedId: followedEmail }],
    });
    res.json({ success: true, message: 'Request rejected' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/connections/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const userEmail = req.user.email;
    const myIds = [userId, userEmail];

    // Get all ACCEPTED connections involving this user
    const allAccepted = await Connection.find({
      $or: [
        { followerId: { $in: myIds }, status: 'ACCEPTED' },
        { followedId: { $in: myIds }, status: 'ACCEPTED' },
      ],
    }).lean();

    // Collect unique other-side identifiers, resolve to user IDs
    const otherIdentifiers = new Set();
    for (const c of allAccepted) {
      const other = myIds.includes(c.followerId) ? c.followedId : c.followerId;
      otherIdentifiers.add(other);
    }

    // Resolve emails to ObjectIds for deduplication
    const resolvedIds = new Set();
    for (const id of otherIdentifiers) {
      if (id.includes('@')) {
        const u = await User.findOne({ email: id }, '_id').lean();
        if (u) resolvedIds.add(u._id.toString());
      } else {
        resolvedIds.add(id);
      }
    }

    const connectionsCount = resolvedIds.size;

    // followingCount = connections where I initiated (followerId = me)
    const followingCount = await Connection.countDocuments({
      followerId: { $in: myIds },
      status: 'ACCEPTED',
    });
    // followersCount = connections where they initiated (followedId = me)
    const followersCount = await Connection.countDocuments({
      followedId: { $in: myIds },
      status: 'ACCEPTED',
    });

    res.json({
      success: true,
      data: { followersCount, followingCount, connectionsCount },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/connections/stats/:userId
router.get('/stats/:userId', authenticate, async (req, res) => {
  try {
    const userId = await resolveUserId(req.params.userId) || req.params.userId;
    const targetUser = await User.findById(userId, 'email').lean();
    const targetIds = [userId, targetUser?.email].filter(Boolean);

    const allAccepted = await Connection.find({
      $or: [
        { followerId: { $in: targetIds }, status: 'ACCEPTED' },
        { followedId: { $in: targetIds }, status: 'ACCEPTED' },
      ],
    }).lean();

    const otherIdentifiers = new Set();
    for (const c of allAccepted) {
      const other = targetIds.includes(c.followerId) ? c.followedId : c.followerId;
      otherIdentifiers.add(other);
    }
    const resolvedIds = new Set();
    for (const id of otherIdentifiers) {
      if (id.includes('@')) {
        const u = await User.findOne({ email: id }, '_id').lean();
        if (u) resolvedIds.add(u._id.toString());
      } else {
        resolvedIds.add(id);
      }
    }

    const followingCount = await Connection.countDocuments({ followerId: { $in: targetIds }, status: 'ACCEPTED' });
    const followersCount = await Connection.countDocuments({ followedId: { $in: targetIds }, status: 'ACCEPTED' });

    res.json({
      success: true,
      data: { followersCount, followingCount, connectionsCount: resolvedIds.size },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
