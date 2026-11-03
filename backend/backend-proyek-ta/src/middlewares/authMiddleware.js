const jwt = require('jsonwebtoken');

// Verifikasi header Authorization: Bearer <token>
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau kedaluwarsa' });
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau kedaluwarsa' });
  }
};

module.exports = authMiddleware;