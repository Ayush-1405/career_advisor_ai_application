require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const isProd = process.env.NODE_ENV === 'production';
const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow image serving
  contentSecurityPolicy: false, // disabled — mobile API, not a web app
}));

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Request logging ───────────────────────────────────────────────────────────
app.use(morgan(isProd ? 'combined' : 'dev'));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true);
    if (!isProd) return cb(null, true); // dev: allow all
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: () => !isProd,       // only enforce in production
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 200,                  // 200 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProd,
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../../backend/uploads')));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'UP',
  timestamp: new Date(),
  env: process.env.NODE_ENV || 'development',
}));

// ── Password reset redirect page ──────────────────────────────────────────────
app.get('/reset-password-redirect', (req, res) => {
  const { token = '', email = '' } = req.query;
  const appLink = `careerapp://reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
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
    .btn{display:block;padding:15px 28px;background:linear-gradient(135deg,#667eea,#764ba2);
      color:#fff;border-radius:12px;text-decoration:none;font-size:16px;font-weight:700;
      margin-bottom:16px;border:none;cursor:pointer;width:100%}
    .divider{color:#cbd5e1;font-size:12px;margin:4px 0 16px}
    #fallback-form{display:none;margin-top:8px;text-align:left}
    label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:5px}
    input[type=password]{width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;
      border-radius:10px;font-size:15px;color:#0f172a;outline:none;margin-bottom:12px}
    input[type=password]:focus{border-color:#667eea}
    .hint{font-size:11px;color:#94a3b8;margin-top:-8px;margin-bottom:12px}
    .submit-btn{width:100%;padding:13px;background:linear-gradient(135deg,#667eea,#764ba2);
      color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer}
    .submit-btn:disabled{opacity:.6;cursor:not-allowed}
    .msg{padding:10px 14px;border-radius:8px;font-size:13px;font-weight:500;margin-bottom:12px;display:none}
    .msg.error{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
    .msg.success{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
    .toggle{font-size:13px;color:#667eea;cursor:pointer;text-decoration:underline;background:none;border:none;padding:0;margin-top:4px}
  </style>
</head>
<body>
<div class="card">
  <div class="icon">🔐</div>
  <h1>Reset Your Password</h1>
  <p>Tap the button below to open the Career Advisor app and set a new password.</p>
  <a class="btn" id="open-btn" href="${appLink}">Open Career Advisor App</a>
  <p class="divider">— or —</p>
  <button class="toggle" id="toggle-form">Reset password in browser instead</button>
  <div id="fallback-form">
    <br/>
    <div id="msg" class="msg"></div>
    <label>New Password</label>
    <input type="password" id="pw" placeholder="At least 8 characters" autocomplete="new-password"/>
    <p class="hint">Min 8 chars · uppercase · lowercase · number · special char</p>
    <label>Confirm Password</label>
    <input type="password" id="pw2" placeholder="Repeat new password" autocomplete="new-password"/>
    <button class="submit-btn" id="submit-btn" onclick="doReset()">Reset Password</button>
  </div>
</div>
<script>
  const TOKEN=${JSON.stringify(token)},EMAIL=${JSON.stringify(email)},API=window.location.origin;
  const isAndroid=/android/i.test(navigator.userAgent);
  if(isAndroid)document.getElementById('open-btn').href=${JSON.stringify(intentUrl)};
  setTimeout(()=>{window.location.href=isAndroid?${JSON.stringify(intentUrl)}:${JSON.stringify(appLink)};},800);
  document.getElementById('toggle-form').addEventListener('click',()=>{
    document.getElementById('fallback-form').style.display='block';
    document.getElementById('toggle-form').style.display='none';
  });
  function showMsg(t,type){const el=document.getElementById('msg');el.textContent=t;el.className='msg '+type;el.style.display='block';}
  async function doReset(){
    const pw=document.getElementById('pw').value,pw2=document.getElementById('pw2').value,btn=document.getElementById('submit-btn');
    if(pw.length<8)return showMsg('Password must be at least 8 characters.','error');
    if(!/[A-Z]/.test(pw))return showMsg('Must contain an uppercase letter.','error');
    if(!/[a-z]/.test(pw))return showMsg('Must contain a lowercase letter.','error');
    if(!/[0-9]/.test(pw))return showMsg('Must contain a number.','error');
    if(!/[!@#$%^&*(),.?":{}|<>]/.test(pw))return showMsg('Must contain a special character.','error');
    if(pw!==pw2)return showMsg('Passwords do not match.','error');
    btn.disabled=true;btn.textContent='Resetting…';
    try{
      const res=await fetch(API+'/api/auth/reset-password?token='+encodeURIComponent(TOKEN)+'&email='+encodeURIComponent(EMAIL)+'&newPassword='+encodeURIComponent(pw),{method:'POST'});
      const data=await res.json();
      if(!res.ok)throw new Error(typeof data==='string'?data:(data.error||'Reset failed'));
      showMsg('✅ Password reset! You can now log in to the app.','success');
      document.getElementById('fallback-form').querySelectorAll('input,button').forEach(el=>el.disabled=true);
    }catch(err){showMsg(err.message||'Something went wrong.','error');btn.disabled=false;btn.textContent='Reset Password';}
  }
</script>
</body>
</html>`);
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/user',         require('./routes/userProfile'));
app.use('/api/users/me',     require('./routes/dashboard'));
app.use('/api/career-paths', require('./routes/careerPaths'));
app.use('/api/resumes',      require('./routes/resumes'));
app.use('/api/resume',       require('./routes/resumeProfile'));
app.use('/api/uploads',      require('./routes/uploads'));
app.use('/api/feed',         require('./routes/feed'));
app.use('/api/connections',  require('./routes/connections'));
app.use('/api/chats',        require('./routes/chats'));
app.use('/api/notifications',require('./routes/notifications'));
app.use('/api/assistant',    require('./routes/assistant'));
app.use('/api/report',       require('./routes/report'));
app.use('/api/admin',        require('./routes/admin'));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (isProd) {
    // Don't leak stack traces in production
    if (err.code === 11000) return res.status(400).json({ message: 'Email already registered' });
    if (err.name === 'ValidationError') {
      const errors = {};
      Object.keys(err.errors).forEach(k => { errors[k] = err.errors[k].message; });
      return res.status(400).json(errors);
    }
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
  // Dev: include stack trace
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message, stack: err.stack });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log(`[DB] Connected to MongoDB`);
    try {
      await mongoose.connection.db.command({ ping: 1 });
    } catch (_) {}

    // ── Migrate legacy email-based connection IDs to ObjectIds ────────────────
    try {
      const User = require('./models/User');
      const { Connection } = require('./models/index');
      const emailConns = await Connection.find({
        $or: [{ followerId: { $regex: '@' } }, { followedId: { $regex: '@' } }],
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
        if (fixed > 0) console.log(`[Migration] Fixed ${fixed} connections.`);
      }
    } catch (migErr) {
      console.error('[Migration] Failed:', migErr.message);
    }

    const server = app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${PORT} is already in use. Run: npx kill-port ${PORT}`);
        process.exit(1);
      } else throw err;
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`[Server] ${signal} received, shutting down gracefully...`);
      server.close(() => {
        mongoose.connection.close(false, () => {
          console.log('[Server] Closed.');
          process.exit(0);
        });
      });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  })
  .catch(err => {
    console.error('[DB] Connection error:', err.message);
    process.exit(1);
  });
