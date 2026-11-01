// Guard wewenang peran, contoh: roleMiddleware(['admin', 'owner'])
const roleMiddleware = (allowedRoles = []) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Akses terlarang untuk peran Anda' });
  }
  next();
};

module.exports = roleMiddleware;

