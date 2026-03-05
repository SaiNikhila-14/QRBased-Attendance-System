const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const teacherOnly = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Access denied. Teachers only.' });
  }
  next();
};

const studentOnly = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
  }
  next();
};

module.exports = { authMiddleware, teacherOnly, studentOnly };
