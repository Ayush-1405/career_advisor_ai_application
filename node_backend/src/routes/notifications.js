const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { Notification } = require('../models/index');

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id.toString() }).sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/notifications/read-all  (must be before /:id/read)
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ recipientId: req.user._id.toString(), isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id.toString() },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipientId: req.user._id.toString() });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
