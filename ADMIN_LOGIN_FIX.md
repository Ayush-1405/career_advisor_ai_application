# Admin Login & Database Connection Fix

## Issues Fixed

### 1. MongoDB Database Name Missing
**Problem**: The MongoDB connection string didn't specify the database name, so it was connecting to the default `test` database instead of `career_advisor`.

**Fix**: Updated `.env` file to include `/career_advisor` in the connection string:
```
mongodb://...@host:27017/career_advisor?ssl=true&...
```

### 2. Admin Password Unknown
**Problem**: The admin user existed in the database but the password was unknown (from Java backend).

**Fix**: Created a script to set a known password for the admin user.

**Admin Credentials**:
- Email: `ayushmistry0054@gmail.com`
- Password: `admin123`
- Role: `ADMIN`

### 3. Admin App URL Configuration
**Problem**: Admin app was using wrong IP address (172.20.10.2 instead of 172.20.10.1) and potentially cached HTTPS URLs.

**Fix**: 
- Updated `config.dart` to use `http://172.20.10.1:3000`
- Updated admin login screen default URL
- Main.dart already clears HTTPS URLs on startup

## Database Verification

✅ Connected to MongoDB successfully
✅ Database: `career_advisor` (same as Java backend)
✅ Found 18 collections including:
  - users
  - posts
  - connections
  - chat_rooms
  - messages
  - notifications
  - career_paths
  - resume
  - resume_analysis
  - resume_profile
  - user_career_paths
  - etc.

✅ Found 5 users total
✅ Found 1 admin user: Ayush (ayushmistry0054@gmail.com)

## Testing Steps

### 1. Restart Node.js Backend
```bash
cd node_backend
npm start
```

The backend should now connect to the `career_advisor` database and show:
```
Connected to MongoDB
Server running on port 3000
```

### 2. Clear Admin App Data
Since the admin app may have cached the wrong URL (HTTPS or wrong IP), you need to:

**Option A: Clear app data (Recommended)**
1. Go to Android Settings → Apps → Career Advisor Admin
2. Tap "Storage"
3. Tap "Clear Data" or "Clear Storage"
4. Restart the app

**Option B: Use the "Change Server URL" button**
1. Open admin app
2. On login screen, tap "Change Server URL"
3. Enter: `http://172.20.10.1:3000`
4. Save and restart app

### 3. Login with Admin Credentials
- Email: `ayushmistry0054@gmail.com`
- Password: `admin123`

### 4. Verify OTP Email
After entering credentials, you'll receive an OTP code via email. Check your inbox and enter the code.

## Network Configuration

Make sure your devices are on the same network:

- **User App**: `http://172.20.10.2:3000`
- **Admin App**: `http://172.20.10.1:3000`
- **Backend**: Port `3000`

If these IPs don't work, find your computer's actual IP address:
```bash
# Windows
ipconfig

# Look for "IPv4 Address" under your active network adapter
```

Then update both:
1. `career_advisor_admin/lib/utils/config.dart`
2. `career_advisor_flutter/lib/utils/config.dart`

## Utility Scripts Created

### Test Database Connection
```bash
cd node_backend
node test-db-connection.js
```
Shows all collections, user count, and admin users.

### Test Admin Login
```bash
cd node_backend
node test-admin-login.js
```
Tests if admin password matches.

### Set Admin Password
```bash
cd node_backend
node set-admin-password.js
```
Sets admin password to `admin123`.

## Data Verification

The Node.js backend is now using the SAME database as the Java backend:
- ✅ Same MongoDB cluster
- ✅ Same database name: `career_advisor`
- ✅ Same collections
- ✅ Same data (5 users, posts, connections, etc.)

All data from the Java backend is accessible in the Node.js backend.

## Troubleshooting

### If admin login still fails:

1. **Check backend is running**:
   ```bash
   cd node_backend
   npm start
   ```

2. **Verify database connection**:
   ```bash
   cd node_backend
   node test-db-connection.js
   ```

3. **Check admin password**:
   ```bash
   cd node_backend
   node test-admin-login.js
   ```

4. **Reset admin password if needed**:
   ```bash
   cd node_backend
   node set-admin-password.js
   ```

5. **Clear admin app data** (most important):
   - Android Settings → Apps → Career Advisor Admin → Storage → Clear Data

6. **Check network connectivity**:
   - Make sure phone and computer are on same WiFi
   - Try pinging the IP from your phone's browser: `http://172.20.10.1:3000`

### If you see "Connection error":
- Backend is not running or wrong IP address
- Check firewall settings on your computer
- Try using your computer's actual IP address instead of 172.20.10.1

### If you see "Invalid credentials":
- Email or password is wrong
- Run `node set-admin-password.js` to reset password to `admin123`

### If you see "Access denied. Admin privileges required":
- User exists but role is not ADMIN
- Check database: `node test-db-connection.js`

## Summary

✅ Database connection fixed - now using `career_advisor` database
✅ Admin password set to known value: `admin123`
✅ Admin app URL corrected to `http://172.20.10.1:3000`
✅ All data from Java backend is accessible
✅ Ready to test admin login

**Next Steps**:
1. Restart Node.js backend
2. Clear admin app data
3. Login with: `ayushmistry0054@gmail.com` / `admin123`
4. Enter OTP from email
