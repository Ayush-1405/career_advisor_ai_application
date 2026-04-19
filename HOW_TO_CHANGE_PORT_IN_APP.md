# 📱 How to Change Port from 8080 to 3000 in the App

## Option 1: Change URL in Login Screen (Easiest - No Data Loss)

### Step-by-Step Instructions:

1. **Open the Career Advisor app** on your device

2. **Go to the Login Screen** (if you're logged in, logout first)

3. **Look for the "API Base URL" field** 
   - It's usually near the bottom of the login form
   - It might show: `http://172.20.10.2:8080`

4. **Tap on the API Base URL field**

5. **Change the URL**:
   - Clear the current text
   - Type: `http://172.20.10.2:3000`
   - Make sure there's NO trailing slash
   - Make sure it says `:3000` not `:8080`

6. **Tap outside the field** or press "Done" on keyboard
   - The app will save this URL automatically

7. **Try logging in**
   - The app will now connect to port 3000
   - You should see successful API calls in the logs

### Visual Guide:
```
┌─────────────────────────────────┐
│  Career Advisor Login           │
├─────────────────────────────────┤
│                                 │
│  Email: [____________]          │
│  Password: [____________]       │
│                                 │
│  API Base URL:                  │
│  [http://172.20.10.2:3000]  ← Change this!
│                                 │
│  [Login Button]                 │
└─────────────────────────────────┘
```

## Option 2: Clear App Data (Fastest - Resets Everything)

### Android:
1. Go to **Settings** on your device
2. Tap **Apps** or **Application Manager**
3. Find and tap **Career Advisor**
4. Tap **Storage** or **Storage & cache**
5. Tap **Clear Data** or **Clear Storage**
6. Confirm the action
7. Open the app - it will use port 3000 by default

### iOS:
1. Uninstall the app
2. Reinstall using:
   ```bash
   cd career_advisor_flutter
   flutter run
   ```

## Option 3: Use ADB (For Developers)

```bash
# Clear app data
adb shell pm clear com.example.career_advisor_flutter

# Or manually delete SharedPreferences
adb shell
run-as com.example.career_advisor_flutter
cd shared_prefs
rm *.xml
exit
exit
```

## Option 4: Reinstall the App

```bash
# Stop the app
# Uninstall from device
# Then:
cd career_advisor_flutter
flutter clean
flutter pub get
flutter run
```

## 🔍 How to Verify It Worked

After changing the URL, check the Flutter logs:

### ✅ Success (Port 3000):
```
I/flutter: --- API Request: GET http://172.20.10.2:3000/api/user/profile ---
I/flutter: --- API Response: 200 ---
```

### ❌ Still Wrong (Port 8080):
```
I/flutter: --- API Error: http://172.20.10.2:8080/api/user/profile ---
I/flutter: --- API Error Type: DioExceptionType.connectionTimeout ---
```

## 🚀 Before Testing

Make sure the Node.js backend is running:
```bash
cd node_backend
npm run dev
```

Expected output:
```
Connected to MongoDB
Server running on port 3000
```

## 📝 Where to Find the API URL Field

The API Base URL field appears on these screens:
- ✅ Login Screen
- ✅ Register Screen
- ✅ OTP Verification Screen
- ✅ Forgot Password Screen
- ✅ Reset Password Screen

You can change it on ANY of these screens!

## 💡 Tips

1. **No Trailing Slash**: Use `http://172.20.10.2:3000` NOT `http://172.20.10.2:3000/`

2. **Check Your IP**: If `172.20.10.2` doesn't work, find your computer's IP:
   - Windows: Open CMD and type `ipconfig`
   - Mac/Linux: Open Terminal and type `ifconfig`
   - Look for IPv4 Address

3. **Same Network**: Your device and computer must be on the same WiFi

4. **Firewall**: Make sure Windows Firewall allows port 3000

## 🆘 Troubleshooting

### "Still seeing port 8080 in logs"
- The URL wasn't saved properly
- Try Option 2 (Clear App Data) instead

### "Connection timeout even with port 3000"
- Backend might not be running
- Check: `curl http://localhost:3000/api/career-paths`
- Make sure you see: `Server running on port 3000`

### "Can't find API Base URL field"
- Scroll down on the login screen
- It's usually below the password field
- Look for a text field with a long URL

### "Changed URL but still errors"
- Restart the app completely (force close and reopen)
- Check the logs to confirm it's using port 3000
- If still port 8080, use Option 2 (Clear App Data)

## ✅ Success Checklist

After changing the URL, you should see:
- [ ] No more timeout errors
- [ ] API calls show port 3000 in logs
- [ ] Login works successfully
- [ ] Data loads on home screen
- [ ] Profile page loads
- [ ] Feed loads posts
- [ ] Chat loads conversations

## 🎯 Summary

**Quickest Method**: Change URL on login screen to `http://172.20.10.2:3000`

**Most Reliable Method**: Clear app data (Settings → Apps → Career Advisor → Storage → Clear Data)

**After Fix**: All API calls will use port 3000 and work perfectly! 🎉
