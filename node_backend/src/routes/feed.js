const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { Post, Notification } = require('../models/index');
const { findUserByIdOrEmail } = require('../utils/userHelper');

const enrichPost = async (post, currentUserId = null) => {
  const user = await findUserByIdOrEmail(post.userId);
  const enrichedComments = await Promise.all((post.comments || []).map(async c => {
    const cu = await findUserByIdOrEmail(c.userId);
    return {
      id: c._id?.toString(),
      text: c.text,
      createdAt: c.createdAt,
      userId: cu?._id?.toString() || c.userId,
      userName: cu?.name || 'Unknown User',
      userAvatar: cu?.profilePictureUrl || null,
    };
  }));
  return {
    id: post._id.toString(),
    content: post.content,
    isAchievement: post.isAchievement || false,
    createdAt: post.createdAt,
    likesCount: (post.likes || []).length,
    commentsCount: (post.comments || []).length,
    userId: user?._id?.toString() || post.userId,
    userName: user?.name || 'Unknown User',
    userAvatar: user?.profilePictureUrl || null,
    userBio: user?.bio || null,
    likes: post.likes || [],
    isLiked: currentUserId ? (post.likes || []).includes(currentUserId) : false,
    comments: enrichedComments,
    mediaUrls: post.mediaUrls || [],
    mediaType: post.mediaType || null,
  };
};

// GET /api/feed
router.get('/', authenticate, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    const data = await Promise.all(posts.map(p => enrichPost(p, req.user._id.toString())));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/feed/my-posts
router.get('/my-posts', authenticate, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user._id.toString() }).sort({ createdAt: -1 });
    const data = await Promise.all(posts.map(p => enrichPost(p, req.user._id.toString())));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/feed/user/:userId
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    const data = await Promise.all(posts.map(p => enrichPost(p, req.user._id.toString())));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/feed
router.post('/', authenticate, async (req, res) => {
  try {
    const { content, isAchievement = false, mediaUrls, mediaType } = req.body;
    const post = await Post.create({
      userId: req.user._id.toString(),
      content,
      isAchievement,
      mediaUrls: mediaUrls || [],
      mediaType: mediaType || null,
    });
    res.json({ success: true, data: await enrichPost(post, req.user._id.toString()) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/feed/:postId
router.put('/:postId', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    if (post.userId !== req.user._id.toString()) return res.status(403).json({ success: false, error: 'Unauthorized' });
    post.content = req.body.content;
    await post.save();
    res.json({ success: true, data: await enrichPost(post, req.user._id.toString()) });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// DELETE /api/feed/:postId
router.delete('/:postId', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    if (post.userId !== req.user._id.toString()) return res.status(403).json({ success: false, error: 'Unauthorized' });
    await Post.findByIdAndDelete(req.params.postId);
    res.json({ success: true, message: 'Post deleted' });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// POST /api/feed/:postId/like
router.post('/:postId/like', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    const userId = req.user._id.toString();
    const idx = post.likes.indexOf(userId);
    if (idx > -1) {
      post.likes.splice(idx, 1);
    } else {
      post.likes.push(userId);
      if (post.userId !== userId) {
        await Notification.create({
          recipientId: post.userId,
          senderId: userId,
          senderName: req.user.name,
          senderAvatarUrl: req.user.profilePictureUrl,
          type: 'LIKE',
          message: `${req.user.name} liked your post`,
          relatedEntityId: post._id.toString(),
        });
      }
    }
    await post.save();
    res.json({ success: true, data: await enrichPost(post, userId) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/feed/:postId/comment
router.post('/:postId/comment', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    const { text } = req.body;
    post.comments.push({ userId: req.user._id.toString(), text });
    await post.save();
    if (post.userId !== req.user._id.toString()) {
      const preview = text.length > 20 ? text.substring(0, 20) + '...' : text;
      await Notification.create({
        recipientId: post.userId,
        senderId: req.user._id.toString(),
        senderName: req.user.name,
        senderAvatarUrl: req.user.profilePictureUrl,
        type: 'COMMENT',
        message: `${req.user.name} commented: ${preview}`,
        relatedEntityId: post._id.toString(),
      });
    }
    res.json({ success: true, data: await enrichPost(post, req.user._id.toString()) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
