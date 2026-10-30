const crypto = require('crypto');
const { run, queryOne } = require('../database/db');

/**
 * Generate a new CAPTCHA challenge
 * Supports both math arithmetic and text puzzles
 */
function generateCaptcha() {
  const operations = ['+', '-', '*'];
  const op = operations[Math.floor(Math.random() * operations.length)];
  let num1, num2, answer;

  if (op === '+') {
    num1 = Math.floor(Math.random() * 20) + 1;
    num2 = Math.floor(Math.random() * 20) + 1;
    answer = (num1 + num2).toString();
  } else if (op === '-') {
    num1 = Math.floor(Math.random() * 30) + 15;
    num2 = Math.floor(Math.random() * 15) + 1;
    answer = (num1 - num2).toString();
  } else {
    num1 = Math.floor(Math.random() * 9) + 2;
    num2 = Math.floor(Math.random() * 9) + 2;
    answer = (num1 * num2).toString();
  }

  const question = `${num1} ${op === '*' ? '×' : op} ${num2} = ?`;
  const challengeId = crypto.randomUUID();

  // Expire after 5 minutes
  run(
    `INSERT INTO captcha_challenges (id, question, answer, expires_at, used)
     VALUES (?, ?, ?, datetime('now', '+5 minutes'), 0)`,
    [challengeId, question, answer]
  );

  return {
    captchaId: challengeId,
    question
  };
}

/**
 * Validate and consume a CAPTCHA challenge
 */
function validateCaptcha(captchaId, userAnswer) {
  if (!captchaId || userAnswer === undefined || userAnswer === null || String(userAnswer).trim() === '') {
    return { valid: false, message: 'CAPTCHA answer is required.' };
  }

  const challenge = queryOne(
    `SELECT * FROM captcha_challenges WHERE id = ?`,
    [captchaId]
  );

  if (!challenge) {
    return { valid: false, message: 'Invalid or expired CAPTCHA challenge. Please refresh.' };
  }

  if (challenge.used === 1) {
    return { valid: false, message: 'This CAPTCHA challenge has already been used. Please refresh.' };
  }

  const now = new Date();
  const expiresAt = new Date(challenge.expires_at.replace(' ', 'T') + 'Z');
  if (now > expiresAt) {
    return { valid: false, message: 'CAPTCHA expired. Please refresh for a new one.' };
  }

  // Mark as used immediately to prevent replay attacks
  run(`UPDATE captcha_challenges SET used = 1 WHERE id = ?`, [captchaId]);

  if (challenge.answer.trim().toLowerCase() !== String(userAnswer).trim().toLowerCase()) {
    return { valid: false, message: 'Incorrect CAPTCHA answer. Please try again.' };
  }

  return { valid: true };
}

module.exports = {
  generateCaptcha,
  validateCaptcha
};
