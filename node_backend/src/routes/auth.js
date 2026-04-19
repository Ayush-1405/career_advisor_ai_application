const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { PasswordResetToken, SystemSettings } = require('../models/index');
const { generateToken } = require('../services/jwtService');
const { sendOtp, verifyOtp, verifyOtpForLogin } = require('../services/otpService');
const { sendHtml } = require('../services/emailService');
const { trackUserActivity } = require('../services/dashboardService');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const settings = await SystemSettings.findOne() || { allowRegistrations: true };
    if (!settings.allowRegistrations) return res.status(400).json('Registrations are currently disabled by administrator.');

    const { name, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(400).json('Email already registered');

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role: 'USER' });
    await trackUserActivity(user._id.toString(), 'user_registration', JSON.stringify({ email, name }));
    res.json({ message: 'Registered', success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const { password } = req.body;
    
    console.log(`\n[Auth] Login attempt: ${email}`);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`[Auth] User not found: ${email}`);
      return res.status(401).json({ token: null, status: 'ERROR', message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[Auth] Password mismatch for: ${email}`);
      return res.status(401).json({ token: null, status: 'ERROR', message: 'Invalid credentials' });
    }

    console.log(`[Auth] Login successful (Requires OTP): ${email}`);
    // Fire OTP email in background — don't block the login response
    sendOtp(email).catch(err => console.error('[Auth] OTP send error:', err.message));

    res.json({ email: user.email, name: user.name, role: user.role, status: 'REQUIRES_OTP', message: 'Verification code sent to your email' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/verify-login?email=&code=
router.post('/verify-login', async (req, res) => {
  try {
    const { email, code } = req.query;
    const ok = await verifyOtpForLogin(email, code);
    if (!ok) return res.status(401).json({ status: 'ERROR', message: 'Invalid or expired code' });

    const user = await User.findOneAndUpdate({ email }, { lastLogin: new Date() }, { new: true });
    const token = generateToken(user.email, { role: 'ROLE_' + user.role, name: user.name, userId: user._id.toString() });
    await trackUserActivity(user._id.toString(), 'login', JSON.stringify({ email }));
    res.json({ token, role: user.role, email: user.email, name: user.name, userId: user._id.toString(), status: 'SUCCESS', message: 'Logged in successfully' });
  } catch (e) {
    res.status(500).json({ status: 'ERROR', message: e.message });
  }
});

// POST /api/auth/verify/email/send?email=
router.post('/verify/email/send', async (req, res) => {
  try {
    const { email } = req.query;
    // Respond immediately, send OTP in background
    res.json('OTP sent');
    sendOtp(email).catch(err => console.error('[Auth] OTP send error:', err.message));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/verify/email/confirm?email=&code=
router.post('/verify/email/confirm', async (req, res) => {
  try {
    const { email, code } = req.query;
    const ok = await verifyOtp(email, code);
    if (!ok) return res.status(400).json('Invalid or expired code');

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json('User not found');
    const token = generateToken(user.email, { role: 'ROLE_' + user.role, name: user.name, userId: user._id.toString() });
    await trackUserActivity(user._id.toString(), 'email_verified', JSON.stringify({ email }));
    res.json({ token, role: user.role, email: user.email, name: user.name, userId: user._id.toString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/forgot-password?email=&redirectBaseUrl=
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, redirectBaseUrl } = req.query;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json('Email not registered');

    const token = crypto.randomBytes(32).toString('hex');
    // Delete old tokens by email, store new one with email field
    await PasswordResetToken.deleteMany({ email });
    await PasswordResetToken.create({ email, token, expiresAt: new Date(Date.now() + 3600000) });

    const resetUrl = `${redirectBaseUrl}?token=${token}&email=${encodeURIComponent(email)}`;

    // Respond immediately — send email in background so client never times out
    res.json('Reset email sent');

    // Fire-and-forget email
    sendHtml(email, 'Reset Your Password – Career Advisor', `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#4f46e5;margin-bottom:8px">Career Advisor</h2>
        <h3 style="color:#0f172a;margin-bottom:16px">Password Reset Request</h3>
        <p style="color:#374151;margin-bottom:24px">
          We received a request to reset your password. Tap the button below to open the app and set a new password.
          This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color:#4f46e5;word-break:break-all">${resetUrl}</a>
        </p>
        <p style="color:#9ca3af;font-size:11px;margin-top:16px">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `).catch(err => console.error('[Email] forgot-password send failed:', err.message));

  } catch (e) {
    res.status(500).json({ error: 'Failed to process forgot password: ' + e.message });
  }
});

// GET /api/auth/reset-password/validate?token=&email=
router.get('/reset-password/validate', async (req, res) => {
  try {
    const { token, email } = req.query;
    const record = await PasswordResetToken.findOne({ token, email, used: false });
    if (!record || record.expiresAt < new Date()) return res.status(400).json('Invalid token');
    res.json({ valid: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/reset-password?token=&email=&newPassword=
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, newPassword } = req.query;
    const record = await PasswordResetToken.findOne({ token, email, used: false });
    if (!record || record.expiresAt < new Date()) return res.status(400).json('Invalid token or expired');
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ email }, { password: hashed });
    record.used = true;
    await record.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/test-email?email=
router.get('/test-email', async (req, res) => {
  try {
    const { email } = req.query;
    await sendHtml(email, 'Test Email', '<h2>Test email from Career Advisor Node.js backend</h2>');
    res.json(`Test email sent to ${email}`);
  } catch (e) {
    res.status(500).json({ error: 'Failed to send email: ' + e.message });
  }
});

module.exports = router;
