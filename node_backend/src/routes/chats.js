const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { ChatRoom, Message } = require('../models/index');
const { findUserByIdOrEmail } = require('../utils/userHelper');

const getOrCreateRoom = async (userId1, userId2) => {
  // Sort IDs so [A,B] and [B,A] always find the same room
  const [id1, id2] = [userId1, userId2].sort();

  // Find existing room with exactly these two participants
  const existing = await ChatRoom.findOne({
    participantIds: { $all: [userId1, userId2], $size: 2 },
  });
  if (existing) return existing;

  // Double-check with sorted order to avoid race-condition duplicates
  const existingSorted = await ChatRoom.findOne({
    participantIds: { $all: [id1, id2], $size: 2 },
  });
  if (existingSorted) return existingSorted;

  return ChatRoom.create({ participantIds: [userId1, userId2], lastUpdate: new Date() });
};

// GET /api/chats
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const rooms = await ChatRoom.find({ participantIds: userId }).sort({ lastUpdate: -1 });

    // Deduplicate: keep only the most recent room per other participant
    const seen = new Map();
    const uniqueRooms = [];
    for (const room of rooms) {
      const otherId = room.participantIds.find(id => id !== userId) || '';
      if (!seen.has(otherId)) {
        seen.set(otherId, true);
        uniqueRooms.push(room);
      } else {
        // Merge messages into the kept room and delete this duplicate
        const keptRoom = uniqueRooms.find(r => r.participantIds.find(id => id !== userId) === otherId);
        if (keptRoom) {
          await Message.updateMany({ chatRoomId: room._id.toString() }, { chatRoomId: keptRoom._id.toString() });
        }
        await ChatRoom.findByIdAndDelete(room._id);
      }
    }

    const data = await Promise.all(uniqueRooms.map(async room => {
      const otherId = room.participantIds.find(id => id !== userId);
      const other = otherId ? await findUserByIdOrEmail(otherId) : null;
      const unread = await Message.countDocuments({
        chatRoomId: room._id.toString(),
        senderId: { $ne: userId },
        isRead: false,
      });
      return {
        chatRoomId: room._id.toString(),
        lastMessage: room.lastMessage || '',
        lastUpdate: room.lastUpdate,
        otherUserId: other?._id?.toString() || otherId,
        otherUserName: other?.name || 'Unknown User',
        otherUserAvatar: other?.profilePictureUrl || null,
        unreadCount: unread,
      };
    }));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/chats/room/:otherUserId
router.get('/room/:otherUserId', authenticate, async (req, res) => {
  try {
    const room = await getOrCreateRoom(req.user._id.toString(), req.params.otherUserId);
    res.json({ success: true, chatRoomId: room._id.toString() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/chats/:roomId
router.get('/:roomId', authenticate, async (req, res) => {
  try {
    const messages = await Message.find({ chatRoomId: req.params.roomId }).sort({ timestamp: 1 });
    res.json({ success: true, data: messages });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/chats/send/:receiverId
router.post('/send/:receiverId', authenticate, async (req, res) => {
  try {
    const senderId = req.user._id.toString();
    const room = await getOrCreateRoom(senderId, req.params.receiverId);
    const message = await Message.create({
      chatRoomId: room._id.toString(),
      senderId,
      content: req.body.content,
      timestamp: new Date(),
    });
    room.lastMessage = req.body.content;
    room.lastUpdate = new Date();
    await room.save();
    res.json({ success: true, data: message });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/chats/:roomId/read
router.put('/:roomId/read', authenticate, async (req, res) => {
  try {
    await Message.updateMany(
      { chatRoomId: req.params.roomId, senderId: { $ne: req.user._id.toString() }, isRead: false },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/chats/all
router.delete('/all', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const rooms = await ChatRoom.find({ participantIds: userId });
    for (const room of rooms) {
      await Message.deleteMany({ chatRoomId: room._id.toString() });
      await ChatRoom.findByIdAndDelete(room._id);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/chats/:roomId/messages
router.delete('/:roomId/messages', authenticate, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (room && room.participantIds.includes(req.user._id.toString())) {
      await Message.deleteMany({ chatRoomId: req.params.roomId });
      room.lastMessage = '';
      await room.save();
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/chats/:roomId
router.delete('/:roomId', authenticate, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (room && room.participantIds.includes(req.user._id.toString())) {
      await Message.deleteMany({ chatRoomId: req.params.roomId });
      await ChatRoom.findByIdAndDelete(req.params.roomId);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
