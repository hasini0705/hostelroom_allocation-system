const jwt = require('jsonwebtoken');
const { queryOne } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'hostel-allocation-secret-key-2026';

function requireAuth(req, res, next) {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch user from DB to verify still exists and active
    const user = queryOne(`SELECT id, email, role, is_active FROM users WHERE id = ?`, [decoded.userId]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'User account has been deactivated. Contact warden.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    if (user.role === 'student') {
      const student = queryOne(`SELECT id, student_id_code, full_name, phone FROM students WHERE user_id = ?`, [user.id]);
      if (student) {
        req.user.studentId = student.id;
        req.user.studentCode = student.student_id_code;
        req.user.fullName = student.full_name;
        req.user.phone = student.phone;
      }
    } else if (user.role === 'warden') {
      const warden = queryOne(`SELECT id, full_name, phone FROM wardens WHERE user_id = ?`, [user.id]);
      if (warden) {
        req.user.wardenId = warden.id;
        req.user.fullName = warden.full_name;
        req.user.phone = warden.phone;
      }
    }

    next();
  } catch (err) {
    console.error('[Auth Middleware Error]', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }
}

function requireStudent(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Student account required.' });
    }
    next();
  });
}

function requireWarden(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'warden') {
      return res.status(403).json({ success: false, message: 'Access denied. Warden administrative privileges required.' });
    }
    next();
  });
}

function generateToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = {
  requireAuth,
  requireStudent,
  requireWarden,
  generateToken,
  JWT_SECRET
};
