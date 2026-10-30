const express = require('express');
const router = express.Router();
const { generateCaptcha } = require('../utils/captcha');

/**
 * GET /api/captcha/new
 * Generate a new CAPTCHA challenge
 */
router.get('/new', (req, res) => {
  try {
    const captcha = generateCaptcha();
    res.json({
      success: true,
      captchaId: captcha.captchaId,
      question: captcha.question
    });
  } catch (err) {
    console.error('[Captcha Route Error]', err);
    res.status(500).json({ success: false, message: 'Failed to generate CAPTCHA.' });
  }
});

module.exports = router;
