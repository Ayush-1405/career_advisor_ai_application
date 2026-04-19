const { EmailOtp } = require('../models/index');
const { sendHtml } = require('./emailService');

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOtp = async (email) => {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await EmailOtp.deleteMany({ email });
  await EmailOtp.create({ email, code, expiresAt });

  // Send email non-blocking — don't let SMTP delay block the login response
  sendHtml(email, 'Your Verification Code – Career Advisor', `
    <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#4f46e5;margin-bottom:4px">Career Advisor</h2>
      <p style="color:#374151;margin-bottom:16px">Your one-time verification code is:</p>
      <div style="background:#f5f3ff;border-radius:8px;padding:20px;text-align:center;margin-bottom:16px">
        <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#4f46e5">${code}</span>
      </div>
      <p style="color:#6b7280;font-size:13px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
    </div>
  `).catch(err => console.error('[Email] OTP send failed for', email, ':', err.message));
};

const verifyOtp = async (email, code) => {
  const otp = await EmailOtp.findOne({ email, code, used: false });
  if (!otp || otp.expiresAt < new Date()) return false;
  otp.used = true;
  await otp.save();
  return true;
};

// For login OTP — same flow but separate verify function name for clarity
const verifyOtpForLogin = verifyOtp;

module.exports = { sendOtp, verifyOtp, verifyOtpForLogin };
