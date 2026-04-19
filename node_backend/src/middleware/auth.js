const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // JWT sub is the user's email (set by jwtService.js)
    const email = decoded.sub;
    const userId = decoded.userId;

    let user = null;

    // Try by email first (primary lookup)
    if (email && email.includes('@')) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    // Fallback: try by userId from token claims
    if (!user && userId) {
      user = await User.findById(userId).catch(() => null);
    }

    // Last resort: try sub as ObjectId
    if (!user && email && !email.includes('@') && email.length === 24) {
      user = await User.findById(email).catch(() => null);
    }

    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
