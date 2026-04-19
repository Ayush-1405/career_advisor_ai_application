# 🔧 Complete Fix for Admin Login Issue

## Problem
Admin app cannot login because:
1. Using HTTPS instead of HTTP
2. Release mode was ignoring local URLs
3. Cached HTTPS URL in SharedPreferences

## ✅ Fixes Applied

### 1. Updated `main.dart`
**File**: `career_advisor_admin/lib/main.dart`

**Changes:**
- Added automatic HTTPS URL clearing on startup
- Removed release mode restriction for local IPs
- Added debug logging to see which URL is being used

### 2. Updated `config.dart`
**File**: `career_advisor_admin/lib/utils/config.dart`

**Changes:**
- Added automatic HTTPS to HTTP conversion
- Better documentation
- Force HTTP for local development

### 3. Created Test Script
**File**: `test-admin-login.js`

**Purpose:**
- Test admin login endpoint
- Verify backend is working
- Create admin user if needed

---

## 🚀 How to Fix Admin Login

### Step 1: Ensure Backend is Running
```bash
cd node_backend
npm run dev
```

Should show:
```
Connected to MongoDB
Server running on port 3000
```

### Step 2: Create Admin User

#### Option A: Using Test Script
```bash
# In project root
node test-admin-login.js
```

#### Option B: Using MongoDB Compass
1. Connect to your MongoDB
2. Find the `users` collection
3. Find user with email `admin@example.com`
4. Change `role` field from `"USER"` to `"ADMIN"`

#### Option C: Using MongoDB Shell
```javascript
db.users.updateOne(
  {email: "admin@example.com"}, 
  {$set: {role: "ADMIN"}}
)
```

#### Option D: Using curl
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@example.com","password":"admin123"}'

# Then manually change role in MongoDB to ADMIN
```

### Step 3: Rebuild Admin App
```bash
cd career_advisor_admin
flutter clean
flutter pub get
flutter run --release
```

### Step 4: Test Login
1. Open admin app
2. Login with:
   - Email: `admin@example.com`
   - Password: `admin123`
3. Enter OTP from email
4. Should redirect to dashboard

---

## 🔍 Verify It's Working

### Check Logs:
You should see:
```
I/flutter: Using default URL from config
I/flutter: --- API Request: POST http://172.20.10.2:3000/api/auth/login ---
I/flutter: --- API Response: 200 http://172.20.10.2:3000/api/auth/login ---
```

**NOT:**
```
❌ https://172.20.10.1:3000  (Wrong - HTTPS)
```

### Expected Flow:
1. Enter email/password
2. Backend sends OTP to email
3. Enter OTP code
4. Login successful
5. Redirect to dashboard

---

## 🐛 Troubleshooting

### Issue: Still seeing HTTPS
**Solution:**
```bash
# Uninstall app completely
adb uninstall com.example.career_advisor_admin

# Rebuild and install
cd career_advisor_admin
flutter clean
flutter run --release
```

### Issue: "Invalid credentials"
**Solution:**
1. Verify user exists in database
2. Check password is correct
3. Try registering a new user

### Issue: "Access denied. Admin privileges required"
**Solution:**
User role is not ADMIN. Update in MongoDB:
```javascript
db.users.updateOne(
  {email: "admin@example.com"}, 
  {$set: {role: "ADMIN"}}
)
```

### Issue: "Connection timeout"
**Solution:**
1. Check backend is running: `npm run dev`
2. Verify IP address is correct
3. Check firewall allows port 3000
4. Ensure same WiFi network

### Issue: "No response from server"
**Solution:**
1. Backend not running - start it: `npm run dev`
2. Wrong IP address - check with `ipconfig` or `ifconfig`
3. Firewall blocking - allow port 3000

---

## 📊 Test Backend Directly

### Test Login Endpoint:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

**Expected Response:**
```json
{
  "email": "admin@example.com",
  "name": "Admin User",
  "role": "ADMIN",
  "status": "REQUIRES_OTP",
  "message": "Verification code sent to your email"
}
```

### Test Admin Endpoint (after login):
```bash
# Get token from login
TOKEN="your_token_here"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/dashboard/stats
```

---

## ✅ Verification Checklist

- [ ] Backend running on port 3000
- [ ] Admin user exists in database
- [ ] User role is set to "ADMIN"
- [ ] Admin app rebuilt with `flutter clean`
- [ ] App using HTTP (not HTTPS)
- [ ] Login returns REQUIRES_OTP
- [ ] OTP email received
- [ ] OTP verification works
- [ ] Dashboard loads after login

---

## 🎯 Quick Test Commands

### 1. Check Backend:
```bash
curl http://localhost:3000/api/career-paths
```

### 2. Test Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### 3. Check User Role:
```bash
# In MongoDB shell or Compass
db.users.findOne({email: "admin@example.com"})
```

Should show: `"role": "ADMIN"`

---

## 📝 Summary of Changes

### Files Modified:
1. ✅ `career_advisor_admin/lib/main.dart`
   - Auto-clear HTTPS URLs
   - Remove release mode restrictions
   - Add debug logging

2. ✅ `career_advisor_admin/lib/utils/config.dart`
   - Force HTTP for local IPs
   - Better documentation

3. ✅ `test-admin-login.js` (NEW)
   - Test script for admin login
   - Verify backend connection

### What Was Fixed:
- ✅ HTTPS to HTTP conversion
- ✅ Release mode URL handling
- ✅ SharedPreferences clearing
- ✅ Better error messages
- ✅ Debug logging

---

## 🎉 After Fix

You should be able to:
1. ✅ Open admin app
2. ✅ See HTTP URL (not HTTPS)
3. ✅ Login with admin credentials
4. ✅ Receive OTP email
5. ✅ Verify OTP
6. ✅ Access admin dashboard
7. ✅ Manage users, posts, etc.

---

## 💡 Pro Tips

1. **Always use HTTP** for local development (not HTTPS)
2. **Check MongoDB** to ensure user has ADMIN role
3. **Rebuild app** after clearing cache: `flutter clean`
4. **Test backend** directly with curl before testing app
5. **Check logs** to see which URL is being used

---

## 🆘 Still Not Working?

### Last Resort:
```bash
# 1. Stop backend
# 2. Uninstall admin app completely
adb uninstall com.example.career_advisor_admin

# 3. Clear all data
cd career_advisor_admin
flutter clean
rm -rf build/

# 4. Start backend
cd ../node_backend
npm run dev

# 5. Rebuild and run admin app
cd ../career_advisor_admin
flutter pub get
flutter run --release

# 6. Try login again
```

---

## ✨ Expected Result

After following this guide:
- ✅ Admin app connects to HTTP (not HTTPS)
- ✅ Login works correctly
- ✅ OTP verification works
- ✅ Dashboard loads
- ✅ All admin features accessible

**Your admin app should now work perfectly!** 🎉
