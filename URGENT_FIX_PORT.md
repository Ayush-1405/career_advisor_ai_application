# 🚨 URGENT: Fix Port 8080 → 3000

## The Problem
Your app has **port 8080 cached** in SharedPreferences. It won't use port 3000 until you clear this cache.

## ✅ FASTEST FIX (Do This Now!)

### Method 1: Clear App Data on Device (30 seconds)
1. On your Android device, open **Settings**
2. Go to **Apps** or **Application Manager**
3. Find **Career Advisor** (your app name)
4. Tap **Storage** or **Storage & cache**
5. Tap **Clear Data** or **Clear Storage**
6. Confirm
7. **Restart the app** - it will now use port 3000!

### Method 2: Uninstall and Reinstall (1 minute)
```bash
# Stop the app
# Uninstall from device
# Then run:
cd career_advisor_flutter
flutter clean
flutter run
```

### Method 3: Use ADB to Clear App Data (if you have ADB)
```bash
adb shell pm clear com.example.career_advisor_flutter
```
(Replace `com.example.career_advisor_flutter` with your actual package name)

## 🔍 How to Verify It's Fixed

After clearing data, check the logs. You should see:
```
✅ GOOD: http://172.20.10.2:3000/api/chats
❌ BAD:  http://172.20.10.2:8080/api/chats
```

## 🚀 Make Sure Backend is Running

Before testing the app:
```bash
cd node_backend
npm run dev
```

Should show:
```
Connected to MongoDB
Server running on port 3000
```

## 📱 Alternative: Change URL in App (If you can access login screen)

1. Open the app
2. On the **Login Screen**, look for "API Base URL" field
3. Tap on it and change:
   - FROM: `http://172.20.10.2:8080`
   - TO: `http://172.20.10.2:3000`
4. Tap outside to save
5. Try logging in

## ⚡ Why This Happens

The app saves the API URL in SharedPreferences (persistent storage) so users can change it. Once saved, it uses that URL every time the app starts, even if you update the code.

## 🎯 After Fix

Once you clear the data:
- ✅ App will use port 3000
- ✅ No more timeout errors
- ✅ All APIs will work
- ✅ Data will load properly

## 🆘 Still Not Working?

1. **Verify backend is running**: 
   ```bash
   curl http://localhost:3000/api/career-paths
   ```
   Should return JSON data

2. **Check your device IP**: 
   - Make sure `172.20.10.2` is your computer's actual IP
   - Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Update the IP in the app if needed

3. **Check firewall**:
   - Allow port 3000 in Windows Firewall
   - Or temporarily disable firewall for testing

4. **Check network**:
   - Device and computer must be on same WiFi
   - Some WiFi networks block device-to-device communication

## 💡 Quick Test

After clearing data, the app should immediately try to connect to port 3000. Watch the logs:
```
I/flutter: --- API Request: GET http://172.20.10.2:3000/api/user/profile ---
I/flutter: --- API Response: 200 ---
```

If you still see `:8080`, the cache wasn't cleared properly. Try Method 2 (reinstall).
