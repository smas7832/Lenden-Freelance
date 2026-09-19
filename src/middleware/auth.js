const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || !req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

module.exports = { authRequired, adminRequired };
