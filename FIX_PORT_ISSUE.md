# Fix Port 8080 → 3000 Issue

## Problem
Your Flutter app is trying to connect to port **8080** but the Node.js backend is running on port **3000**.

Error message:
```
http://172.20.10.2:8080/api/chats
DioException [connection timeout]
```

## Root Cause
The app stores the API URL in **SharedPreferences** (app cache), and it's still using the old port 8080.

## ✅ Solution (Choose ONE)

### Option 1: Clear App Data (Recommended - Fastest)
1. On your Android device, go to **Settings**
2. Go to **Apps** → **Career Advisor** (or your app name)
3. Tap **Storage**
4. Tap **Clear Data** or **Clear Storage**
5. Restart the app
6. The app will now use the default port 3000

### Option 2: Change URL in App Settings
1. Open the app
2. Go to the **Login Screen**
3. Look for the **API Base URL** field
4. Change from: `http://172.20.10.2:8080`
5. Change to: `http://172.20.10.2:3000`
6. Save and login

### Option 3: Reinstall the App
1. Uninstall the app from your device
2. Rebuild and install:
   ```bash
   cd career_advisor_flutter
   flutter clean
   flutter pub get
   flutter run
   ```

## ✅ Files Updated

I've already updated all the default URLs in the code:

### Flutter User App
- ✅ `lib/utils/config.dart` - Default: `http://172.20.10.2:3000`
- ✅ `lib/screens/auth/user_login_screen.dart` - Hint text updated
- ✅ `lib/screens/auth/user_register_screen.dart` - Hint text updated
- ✅ `lib/screens/auth/otp_verification_screen.dart` - Hint text updated
- ✅ `lib/screens/auth/forgot_password_screen.dart` - Hint text updated
- ✅ `lib/screens/auth/reset_password_screen.dart` - Hint text updated

### Flutter Admin App
- ✅ `lib/utils/config.dart` - Default: `http://172.20.10.1:3000`
- ✅ `lib/screens/admin/admin_login_screen.dart` - Default and hint text updated

## 🚀 Quick Fix Steps

1. **Stop the app** (if running)
2. **Clear app data** (Option 1 above)
3. **Ensure Node.js backend is running on port 3000**:
   ```bash
   cd node_backend
   npm run dev
   ```
   Should show: `Server running on port 3000`
4. **Restart the Flutter app**
5. **Login** - it will now connect to port 3000

## 🔍 Verify Backend is Running

Check that your Node.js backend is running:
```bash
# In node_backend directory
npm run dev
```

Expected output:
```
Connected to MongoDB
Server running on port 3000
```

Test the backend:
```bash
curl http://localhost:3000/api/career-paths
```

Should return JSON with career paths.

## 📱 For Physical Devices

If testing on a physical device (not emulator):
1. Make sure your device and computer are on the **same WiFi network**
2. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` (look for inet)
3. Use that IP in the app: `http://YOUR_IP:3000`

Example:
- If your computer IP is `192.168.1.100`
- Use: `http://192.168.1.100:3000`

## ⚠️ Important Notes

1. **Port 3000** is for Node.js backend
2. **Port 8080** was for Java Spring Boot backend (old)
3. The app caches the URL in SharedPreferences
4. Clearing app data resets to the new default (3000)

## ✅ After Fix

You should see successful API calls:
```
I/flutter: --- API Request: GET http://172.20.10.2:3000/api/chats ---
I/flutter: --- API Response: 200 ---
```

No more timeout errors!

## 🆘 Still Having Issues?

1. **Check backend is running**: `npm run dev` in `node_backend/`
2. **Check port**: Should show "Server running on port 3000"
3. **Check network**: Device and computer on same WiFi
4. **Check firewall**: Allow port 3000 in Windows Firewall
5. **Test backend**: `curl http://localhost:3000/api/career-paths`

## 🎯 Summary

- ✅ Backend runs on port **3000** (not 8080)
- ✅ All code files updated to use port 3000
- ✅ Clear app data to reset cached URL
- ✅ App will now connect successfully
