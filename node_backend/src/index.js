require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to use IPv4 DNS
dns.setDefaultResultOrder('ipv4first');

const app = express();

// CORS
app.use(cors({
  origin: '*', // Allow all for cross-device mobile testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
}));

// Health check route - must be before other routes and JSON parsing
app.get('/health', (req, res) => res.json({ status: 'UP', timestamp: new Date() }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../../backend/uploads')));

// ── Password reset redirect ──────────────────────────────────────────────────
// The reset email links here. Opens the app via custom scheme careerapp://
// Falls back to an in-browser form if the app is not installed.
app.get('/reset-password-redirect', (req, res) => {
  const { token = '', email = '' } = req.query;
  const appLink = `careerapp://reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  // Android Intent URL — more reliable than bare custom scheme in some browsers
  const intentUrl = `intent://reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}#Intent;scheme=careerapp;package=com.example.career_advisor_flutter;end`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Career Advisor – Reset Password</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;
      display:flex;align-items:center;justify-content:center;padding:16px}
    .card{background:#fff;border-radius:20px;padding:40px 32px;width:100%;
      max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.15);text-align:center}
    .icon{font-size:52px;margin-bottom:16px}
    h1{font-size:22px;font-weight:800;color:#0f172a;margin-bottom:8px}
    p{color:#64748b;font-size:14px;line-height:1.6;margin-bottom:20px}
    .btn{display:block;padding:15px 28px;
      background:linear-gradient(135deg,#667eea,#764ba2);
      color:#fff;border-radius:12px;text-decoration:none;
      font-size:16px;font-weight:700;margin-bottom:16px;
      border:none;cursor:pointer;width:100%}
    .btn:active{opacity:.85}
    .divider{color:#cbd5e1;font-size:12px;margin:4px 0 16px}
    #fallback-form{display:none;margin-top:8px;text-align:left}
    label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:5px}
    input[type=password]{width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;
      border-radius:10px;font-size:15px;color:#0f172a;outline:none;margin-bottom:12px}
    input[type=password]:focus{border-color:#667eea}
    .hint{font-size:11px;color:#94a3b8;margin-top:-8px;margin-bottom:12px}
    .submit-btn{width:100%;padding:13px;background:linear-gradient(135deg,#667eea,#764ba2);
      color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px}
    .submit-btn:disabled{opacity:.6;cursor:not-allowed}
    .msg{padding:10px 14px;border-radius:8px;font-size:13px;font-weight:500;
      margin-bottom:12px;display:none}
    .msg.error{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
    .msg.success{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
    .toggle{font-size:13px;color:#667eea;cursor:pointer;text-decoration:underline;
      background:none;border:none;padding:0;margin-top:4px}
  </style>
</head>
<body>
<div class="card">
  <div class="icon">🔐</div>
  <h1>Reset Your Password</h1>
  <p>Tap the button below to open the Career Advisor app and set a new password.</p>

  <!-- Primary: open app -->
  <a class="btn" id="open-btn" href="${appLink}">Open Career Advisor App</a>

  <p class="divider">— or —</p>
  <button class="toggle" id="toggle-form">Reset password in browser instead</button>

  <!-- Fallback: in-browser form -->
  <div id="fallback-form">
    <br/>
    <div id="msg" class="msg"></div>
    <label>New Password</label>
    <input type="password" id="pw" placeholder="At least 8 characters" autocomplete="new-password"/>
    <p class="hint">Min 8 chars · uppercase · lowercase · number · special char (!@#$…)</p>
    <label>Confirm Password</label>
    <input type="password" id="pw2" placeholder="Repeat new password" autocomplete="new-password"/>
    <button class="submit-btn" id="submit-btn" onclick="doReset()">Reset Password</button>
  </div>
</div>

<script>
  const TOKEN = ${JSON.stringify(token)};
  const EMAIL = ${JSON.stringify(email)};
  const API   = window.location.origin;
  const APP_LINK    = ${JSON.stringify(appLink)};
  const INTENT_URL  = ${JSON.stringify(intentUrl)};

  // On Android Chrome, Intent URL is more reliable than bare custom scheme
  const isAndroid = /android/i.test(navigator.userAgent);
  if (isAndroid) {
    document.getElementById('open-btn').href = INTENT_URL;
  }

  // Auto-attempt to open the app after a short delay
  // (delay lets the page render first so user sees the button)
  setTimeout(() => {
    window.location.href = isAndroid ? INTENT_URL : APP_LINK;
  }, 800);

  document.getElementById('toggle-form').addEventListener('click', () => {
    document.getElementById('fallback-form').style.display = 'block';
    document.getElementById('toggle-form').style.display = 'none';
  });

  function showMsg(text, type) {
    const el = document.getElementById('msg');
    el.textContent = text;
    el.className = 'msg ' + type;
    el.style.display = 'block';
  }

  async function doReset() {
    const pw  = document.getElementById('pw').value;
    const pw2 = document.getElementById('pw2').value;
    const btn = document.getElementById('submit-btn');

    if (pw.length < 8)                          return showMsg('Password must be at least 8 characters.', 'error');
    if (!/[A-Z]/.test(pw))                      return showMsg('Must contain an uppercase letter.', 'error');
    if (!/[a-z]/.test(pw))                      return showMsg('Must contain a lowercase letter.', 'error');
    if (!/[0-9]/.test(pw))                      return showMsg('Must contain a number.', 'error');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw))    return showMsg('Must contain a special character.', 'error');
    if (pw !== pw2)                             return showMsg('Passwords do not match.', 'error');

    btn.disabled = true;
    btn.textContent = 'Resetting…';
    try {
      const res = await fetch(
        API + '/api/auth/reset-password' +
        '?token='       + encodeURIComponent(TOKEN) +
        '&email='       + encodeURIComponent(EMAIL) +
        '&newPassword=' + encodeURIComponent(pw),
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data === 'string' ? data : (data.error || 'Reset failed'));
      showMsg('✅ Password reset successfully! You can now log in to the app.', 'success');
      document.getElementById('fallback-form').querySelectorAll('input,button').forEach(el => el.disabled = true);
    } catch (err) {
      showMsg(err.message || 'Something went wrong. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Reset Password';
    }
  }
</script>
</body>
</html>`);
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/userProfile'));
app.use('/api/users/me', require('./routes/dashboard'));
app.use('/api/career-paths', require('./routes/careerPaths'));
app.use('/api/resumes', require('./routes/resumes'));
app.use('/api/resume', require('./routes/resumeProfile'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/report', require('./routes/report'));
app.use('/api/admin', require('./routes/admin'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 11000) return res.status(400).json({ message: 'Email already registered' });
  if (err.name === 'ValidationError') {
    const errors = {};
    Object.keys(err.errors).forEach(k => { errors[k] = err.errors[k].message; });
    return res.status(400).json(errors);
  }
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    try {
      await mongoose.connection.db.command({ ping: 1 });
      console.log('MongoDB connection warmed up');
    } catch (_) {}

    // ── Migrate legacy email-based connection IDs to ObjectIds ──────────────
    // Java backend stored emails as followerId/followedId. Normalize them once.
    try {
      const User = require('./src/models/User');
      const { Connection } = require('./src/models/index');
      const emailConns = await Connection.find({
        $or: [
          { followerId: { $regex: '@' } },
          { followedId: { $regex: '@' } },
        ],
      });
      if (emailConns.length > 0) {
        console.log(`[Migration] Normalizing ${emailConns.length} email-based connection IDs...`);
        let fixed = 0;
        for (const conn of emailConns) {
          let changed = false;
          if (conn.followerId.includes('@')) {
            const u = await User.findOne({ email: conn.followerId.toLowerCase() }, '_id').lean();
            if (u) { conn.followerId = u._id.toString(); changed = true; }
          }
          if (conn.followedId.includes('@')) {
            const u = await User.findOne({ email: conn.followedId.toLowerCase() }, '_id').lean();
            if (u) { conn.followedId = u._id.toString(); changed = true; }
          }
          if (changed) { await conn.save(); fixed++; }
        }
        console.log(`[Migration] Fixed ${fixed} connections.`);
      }
    } catch (migErr) {
      console.error('[Migration] Connection ID migration failed:', migErr.message);
    }
    // ────────────────────────────────────────────────────────────────────────

    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`   Run this to free it:  npx kill-port ${PORT}`);
        console.error(`   Or on Windows:        netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F\n`);
        process.exit(1);
      } else {
        throw err;
      }
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
