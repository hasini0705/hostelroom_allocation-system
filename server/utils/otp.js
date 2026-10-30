const crypto = require('crypto');
const { run, queryOne } = require('../database/db');

const COOLDOWN_SECONDS = 60;
const EXPIRY_MINUTES = 5;

/**
 * Generate 6-digit OTP and store verification record
 */
function sendOtp(email) {
  const normalizedEmail = email.trim().toLowerCase();

  // Check cooldown: any request created in the last 60 seconds?
  const recentOtp = queryOne(
    `SELECT * FROM otp_verifications 
     WHERE email = ? AND datetime(created_at, '+${COOLDOWN_SECONDS} seconds') > datetime('now')
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail]
  );

  if (recentOtp) {
    return {
      success: false,
      cooldown: true,
      message: `Please wait ${COOLDOWN_SECONDS} seconds before requesting a new OTP.`
    };
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  run(
    `INSERT INTO otp_verifications (email, otp, expires_at, verified)
     VALUES (?, ?, datetime('now', '+${EXPIRY_MINUTES} minutes'), 0)`,
    [normalizedEmail, otp]
  );

  console.log(`[OTP Service] [DEMO MODE] Generated OTP for ${normalizedEmail}: ${otp}`);

  return {
    success: true,
    message: 'OTP generated successfully. (Demo Mode: Use the provided OTP code)',
    isDemoMode: true,
    demoOtp: otp, // Returned for local demo display as requested in requirements
    expiresInMinutes: EXPIRY_MINUTES,
    cooldownSeconds: COOLDOWN_SECONDS
  };
}

/**
 * Verify OTP code
 */
function verifyOtp(email, enteredOtp) {
  const normalizedEmail = email.trim().toLowerCase();
  const entered = String(enteredOtp).trim();

  const record = queryOne(
    `SELECT * FROM otp_verifications 
     WHERE email = ? AND otp = ? AND verified = 0 AND expires_at > datetime('now')
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail, entered]
  );

  if (!record) {
    return {
      valid: false,
      message: 'Invalid or expired OTP. Please verify the code or request a new one.'
    };
  }

  // Mark verified
  run(`UPDATE otp_verifications SET verified = 1 WHERE id = ?`, [record.id]);

  return {
    valid: true,
    message: 'Email successfully verified!'
  };
}

module.exports = {
  sendOtp,
  verifyOtp
};
