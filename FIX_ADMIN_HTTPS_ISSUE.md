# 🔧 Fix Admin App HTTPS Issue

## Problem
The admin app is trying to connect to `https://172.20.10.1:3000` instead of `http://172.20.10.1:3000`.

Error:
```
I/flutter: --- API Request: POST https://172.20.10.1:3000/api/auth/login ---
I/flutter: --- API Error: null https://172.20.10.1:3000/api/auth/login ---
```

## Root Cause
The admin app has a cached URL with HTTPS protocol saved in SharedPreferences.

## ✅ Quick Fix (Choose ONE)

### Option 1: Change URL in Admin Login Screen (Recommended)
1. Open the admin app
2. On the login screen, look for **"Settings"** or **"API Base URL"** option
3. Tap on it
4. Change from: `https://172.20.10.1:3000`
5. Change to: `http://172.20.10.1:3000` (remove the 's' from https)
6. Save and try logging in again

### Option 2: Clear Admin App Data
**On Android Device:**
1. Go to **Settings** → **Apps**
2. Find **Career Advisor Admin** (or your admin app name)
3. Tap **Storage** → **Clear Data**
4. Open the app again
5. It will use the default URL: `http://172.20.10.2:3000`

### Option 3: Reinstall Admin App
```bash
cd career_advisor_admin
flutter clean
flutter run --release
```

### Option 4: Use ADB (If you have ADB)
```bash
# Replace with your actual package name
adb shell pm clear com.example.career_advisor_admin
```

## 🔍 How to Find Settings in Admin App

The admin login screen usually has:
- A settings icon (⚙️) in the app bar, OR
- A "Settings" button at the bottom, OR
- An "API Base URL" field in the login form

Look for any of these and change the URL from HTTPS to HTTP.

## ✅ Correct URLs

### Admin App:
```
http://172.20.10.1:3000  ✅ (HTTP, not HTTPS)
```

### User App:
```
http://172.20.10.2:3000  ✅ (Already working)
```

## 🎯 After Fix

You should see:
```
I/flutter: --- API Request: POST http://172.20.10.1:3000/api/auth/login ---
I/flutter: --- API Response: 200 http://172.20.10.1:3000/api/auth/login ---
```

Notice: **HTTP** (not HTTPS) and **200** response (not error).

## 💡 Why This Happens

The admin app allows changing the API URL for flexibility. If someone previously entered an HTTPS URL, it gets saved in SharedPreferences and persists even after code updates.

## 🚀 Quick Test

After fixing, try logging in with admin credentials:
- Email: admin@example.com
- Password: your_admin_password

If you see "REQUIRES_OTP", that's good! It means the connection is working.

## 🆘 Still Not Working?

### Check 1: Backend Running?
```bash
cd node_backend
npm run dev
# Should show: Server running on port 3000
```

### Check 2: Correct IP?
Make sure `172.20.10.1` is your computer's actual IP address:
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

### Check 3: Firewall?
Allow port 3000 in Windows Firewall.

### Check 4: Same Network?
Device and computer must be on the same WiFi network.

## 📝 Summary

**Problem**: Admin app using HTTPS instead of HTTP
**Solution**: Change URL to HTTP or clear app data
**Result**: Admin app will connect successfully

The user app is already working perfectly! Just need to fix the admin app URL. 🎉
