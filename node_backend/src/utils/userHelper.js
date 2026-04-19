const User = require('../models/User');

/**
 * Robustly find a user by ID or Email.
 * Handles cases where the identifier might be a MongoDB ObjectId or an Email string.
 */
const findUserByIdOrEmail = async (identifier) => {
  if (!identifier) return null;

  try {
    // If it looks like an email, search by email
    if (identifier.includes('@')) {
      return await User.findOne({ email: identifier.toLowerCase().trim() });
    }

    // Try finding by _id first (Mongoose handles casting string to ObjectId if valid)
    const userById = await User.findById(identifier).catch(() => null);
    if (userById) return userById;

    // Fallback: If it wasn't a valid ObjectId, it might still be a string-based ID or custom email-like field
    return await User.findOne({ email: identifier });
  } catch (e) {
    console.error(`Error in findUserByIdOrEmail for identifier ${identifier}:`, e.message);
    return null;
  }
};

module.exports = { findUserByIdOrEmail };
