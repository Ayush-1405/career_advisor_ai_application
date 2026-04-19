# Quick Start Guide - Node.js Backend

## 🚀 Start the Backend

```bash
cd node_backend
npm run dev
```

Expected output:
```
[nodemon] starting `node src/index.js`
Connected to MongoDB
Server running on port 3000
```

---

## ✅ Verify Everything Works

Run the test script:
```bash
node test-api.js
```

Expected output:
```
🧪 Testing Node.js Backend APIs

1️⃣  Testing GET /api/career-paths...
   ✅ Status: 200
   ✅ ID transformation working!

2️⃣  Testing POST /api/auth/register...
   ✅ Registration successful

3️⃣  Testing POST /api/auth/login...
   ✅ OTP sent to email

✅ All basic tests passed!
```

---

## 🔧 Configuration

### Environment Variables (`.env`)
```env
PORT=3000
MONGODB_URI=mongodb://cluster0-shard-00-00.94w7mbi.mongodb.net:27017,...
JWT_SECRET=your-secret-key-here
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
OPENROUTER_API_KEY=your-openrouter-key
```

### Flutter App Configuration

Both Flutter apps are already configured to use port 3000:

**User App**: `career_advisor_flutter/lib/utils/config.dart`
```dart
static const String baseUrl = 'http://172.20.10.2:3000';
```

**Admin App**: `career_advisor_admin/lib/utils/config.dart`
```dart
static const String baseUrl = 'http://172.20.10.1:3000';
```

---

## 📱 Connect Flutter Apps

1. **Start the backend** (port 3000)
   ```bash
   cd node_backend
   npm run dev
   ```

2. **Run Flutter user app**
   ```bash
   cd career_advisor_flutter
   flutter run
   ```

3. **Run Flutter admin app**
   ```bash
   cd career_advisor_admin
   flutter run
   ```

---

## 🧪 Test Individual APIs

### Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

### Test Career Paths (No Auth)
```bash
curl http://localhost:3000/api/career-paths
```

### Test Profile (With Auth)
```bash
curl http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔍 Verify ID Transformation

All API responses should have `id` field (not `_id`):

✅ **Correct Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com"
}
```

❌ **Wrong Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe"
}
```

---

## 📊 Check Server Status

### MongoDB Connection
If you see "Connected to MongoDB", the database is working.

### Port Availability
- Port 3000: Node.js backend
- Port 8080: Java backend (if needed)

### Logs
Check `node_backend/` terminal for any errors or warnings.

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill the process if needed
taskkill /PID <PID> /F
```

### MongoDB connection error
- Check `.env` file has correct `MONGODB_URI`
- Verify MongoDB Atlas cluster is running
- Check network connectivity

### Flutter app can't connect
- Verify backend is running on port 3000
- Check Flutter app config files have correct IP
- Ensure devices are on same network (for mobile testing)

### OTP emails not sending
- Check `EMAIL_USER` and `EMAIL_PASS` in `.env`
- Verify Gmail app password is correct
- Check email service logs in terminal

---

## 📚 Documentation

- `FIXES_APPLIED.md` - Complete list of fixes applied
- `API_TEST_CHECKLIST.md` - All API endpoints to test
- `test-api.js` - Automated test script

---

## ✨ Key Features

✅ **ID Transformation**: All responses return `id` instead of `_id`
✅ **JWT Authentication**: Secure token-based auth
✅ **OTP Verification**: Email-based 2FA
✅ **File Uploads**: Resume, images, videos, chat files
✅ **AI Integration**: OpenRouter for resume analysis and chat
✅ **Social Features**: Posts, likes, comments, connections
✅ **Real-time Chat**: Message system with read status
✅ **Admin Panel**: User management, analytics, reports
✅ **Dashboard**: User activity tracking and stats

---

## 🎯 Next Steps

1. ✅ Start backend: `npm run dev`
2. ✅ Run tests: `node test-api.js`
3. ✅ Test with Flutter apps
4. ✅ Verify all features work
5. ✅ Deploy to production (optional)

---

## 💡 Tips

- Use `nodemon` for auto-restart during development
- Check terminal logs for debugging
- Use Postman or curl for API testing
- Monitor MongoDB Atlas for database issues
- Keep `.env` file secure (never commit to git)

---

## 🆘 Need Help?

1. Check terminal logs for errors
2. Review `FIXES_APPLIED.md` for implementation details
3. Run `node test-api.js` to verify basic functionality
4. Check `API_TEST_CHECKLIST.md` for endpoint documentation
