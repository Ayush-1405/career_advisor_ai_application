const jwt = require('jsonwebtoken');

const generateToken = (subject, extra = {}) => {
  return jwt.sign(
    { sub: subject, ...extra },
    process.env.JWT_SECRET,
    { expiresIn: Math.floor((parseInt(process.env.JWT_EXPIRATION || '86400000')) / 1000) + 's' }
  );
};


const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
