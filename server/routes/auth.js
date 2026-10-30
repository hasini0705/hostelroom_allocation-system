const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { queryOne, run, transaction } = require('../database/db');
const { validateCaptcha } = require('../utils/captcha');
const { sendOtp, verifyOtp } = require('../utils/otp');
const { generateToken, requireAuth } = require('../middleware/auth');

/**
 * POST /api/auth/otp/send
 * Request OTP for email verification
 */
router.post('/otp/send', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  // Check if email already registered
  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (existing) {
    return res.status(400).json({ success: false, message: 'This email is already registered. Please login.' });
  }

  const result = sendOtp(email);
  if (!result.success) {
    return res.status(429).json(result);
  }

  res.json(result);
});

/**
 * POST /api/auth/otp/verify
 * Verify OTP code
 */
router.post('/otp/verify', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
  }

  const result = verifyOtp(email, otp);
  if (!result.valid) {
    return res.status(400).json(result);
  }

  res.json(result);
});

/**
 * POST /api/auth/student/register
 * Student Registration
 */
router.post('/student/register', (req, res) => {
  try {
    const {
      fullName,
      studentIdCode,
      email,
      phone,
      password,
      confirmPassword,
      otp,
      captchaId,
      captchaAnswer
    } = req.body;

    // 1. Validation
    if (!fullName || !studentIdCode || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // 2. Validate CAPTCHA
    const captchaCheck = validateCaptcha(captchaId, captchaAnswer);
    if (!captchaCheck.valid) {
      return res.status(400).json(captchaCheck);
    }

    // 3. Verify OTP
    const otpRecord = queryOne(
      `SELECT * FROM otp_verifications 
       WHERE email = ? AND otp = ? AND (verified = 1 OR expires_at > datetime('now'))
       ORDER BY created_at DESC LIMIT 1`,
      [email.trim().toLowerCase(), String(otp || '').trim()]
    );

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Email verification failed. Please enter the valid OTP code received.'
      });
    }

    // 4. Duplicate checks
    const existingEmail = queryOne('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const existingStudentId = queryOne('SELECT id FROM students WHERE UPPER(student_id_code) = UPPER(?)', [studentIdCode.trim()]);
    if (existingStudentId) {
      return res.status(400).json({ success: false, message: 'This Student ID / Roll Number is already registered.' });
    }

    // 5. Hash password and insert
    const passwordHash = bcrypt.hashSync(password, 10);

    const user = transaction(() => {
      const uRes = run(
        `INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, 'student', 1)`,
        [email.trim().toLowerCase(), passwordHash]
      );
      const userId = uRes.lastInsertRowid;

      const sRes = run(
        `INSERT INTO students (user_id, student_id_code, full_name, phone) VALUES (?, ?, ?, ?)`,
        [userId, studentIdCode.trim().toUpperCase(), fullName.trim(), phone ? phone.trim() : null]
      );

      return {
        id: userId,
        studentId: sRes.lastInsertRowid,
        email: email.trim().toLowerCase(),
        role: 'student',
        fullName: fullName.trim(),
        studentCode: studentIdCode.trim().toUpperCase()
      };
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({
      success: true,
      message: 'Student account registered successfully!',
      token,
      user
    });
  } catch (err) {
    console.error('[Student Register Error]', err);
    res.status(500).json({ success: false, message: 'Registration failed due to server error.' });
  }
});

/**
 * POST /api/auth/student/login
 * Student Login (supports email or student_id_code)
 */
router.post('/student/login', (req, res) => {
  try {
    const { identifier, password, captchaId, captchaAnswer } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide Student ID / Email and password.' });
    }

    // Validate CAPTCHA
    const captchaCheck = validateCaptcha(captchaId, captchaAnswer);
    if (!captchaCheck.valid) {
      return res.status(400).json(captchaCheck);
    }

    // Look up user by email or student ID
    const user = queryOne(
      `SELECT u.id, u.email, u.password_hash, u.role, u.is_active,
              s.id as student_id, s.student_id_code, s.full_name, s.phone
       FROM users u
       LEFT JOIN students s ON u.id = s.user_id
       WHERE (u.email = ? OR UPPER(s.student_id_code) = UPPER(?)) AND u.role = 'student'`,
      [identifier.trim().toLowerCase(), identifier.trim()]
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Student not found.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact hostel warden.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please check your credentials.' });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: 'Student login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        studentId: user.student_id,
        studentCode: user.student_id_code,
        fullName: user.full_name,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('[Student Login Error]', err);
    res.status(500).json({ success: false, message: 'Login failed due to server error.' });
  }
});

/**
 * POST /api/auth/warden/login
 * Warden Administrator Login
 */
router.post('/warden/login', (req, res) => {
  try {
    const { email, password, captchaId, captchaAnswer } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter warden email and password.' });
    }

    // Validate CAPTCHA
    const captchaCheck = validateCaptcha(captchaId, captchaAnswer);
    if (!captchaCheck.valid) {
      return res.status(400).json(captchaCheck);
    }

    const user = queryOne(
      `SELECT u.id, u.email, u.password_hash, u.role, u.is_active,
              w.id as warden_id, w.full_name, w.phone
       FROM users u
       JOIN wardens w ON u.id = w.user_id
       WHERE u.email = ? AND u.role = 'warden'`,
      [email.trim().toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Warden account not found.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Warden account is inactive.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect warden password.' });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: 'Warden authenticated successfully!',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        wardenId: user.warden_id,
        fullName: user.full_name,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('[Warden Login Error]', err);
    res.status(500).json({ success: false, message: 'Warden login failed.' });
  }
});

/**
 * GET /api/auth/me
 * Fetch authenticated user details
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/auth/forgot-password
 * Reset password via verified OTP
 */
router.post('/forgot-password', (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const user = queryOne('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found with this email.' });
    }

    const otpCheck = verifyOtp(email, otp);
    if (!otpCheck.valid) {
      return res.status(400).json(otpCheck);
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    run(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [passwordHash, user.id]);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('[Forgot Password Error]', err);
    res.status(500).json({ success: false, message: 'Password reset failed.' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;
