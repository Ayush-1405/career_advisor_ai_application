const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { SystemSettings } = require('../models/index');
const { getChatResponse } = require('../services/openRouterService');

// POST /api/assistant/chat
router.post('/chat', authenticate, async (req, res) => {
  const settings = await SystemSettings.findOne();
  if (settings && settings.aiAssistantEnabled === false) {
    return res.status(400).json({ error: 'AI Assistant is currently disabled by administrator.' });
  }
  const message = (req.body.message || '').trim();
  if (!message) return res.json({ reply: `Hi ${req.user.name}, ask me anything about your career.` });
  const reply = await getChatResponse(message);
  res.json({ reply });
});

module.exports = router;
