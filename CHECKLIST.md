# Admin App Fix - Checklist ✅

## Before You Start

- [ ] Node.js backend is stopped (if running)
- [ ] Admin app is closed

---

## Step 1: Verify Backend Configuration

- [ ] Open `node_backend/.env`
- [ ] Verify MongoDB URI contains `/career_advisor`:
  ```
  mongodb://...@host:27017/career_advisor?ssl=true&...
  ```
- [ ] Verify PORT is set to `3000`

---

## Step 2: Test Database Connection

```bash
cd node_backend
node test-db-connection.js
```

Expected results:
- [ ] ✓ Connected to MongoDB
- [ ] ✓ Database: career_advisor
- [ ] ✓ 18 collections listed
- [ ] ✓ Total users: 5
- [ ] ✓ Admin users found: 1

---

## Step 3: Set Admin Password

```bash
cd node_backend
node set-admin-password.js
```

Expected results:
- [ ] ✓ Admin user found: Ayush
- [ ] ✓ Password updated successfully
- [ ] ✓ Password verification: SUCCESS
- [ ] ✓ Admin credentials shown:
  - Email: ayushmistry0054@gmail.com
  - Password: admin123

---

## Step 4: Start Backend

```bash
cd node_backend
npm start
```

Expected output:
- [ ] Connected to MongoDB
- [ ] Server running on port 3000

Keep this terminal open!

---

## Step 5: Clear Admin App Data

**Method 1: Android Settings (Recommended)**
- [ ] Open Android Settings
- [ ] Go to Apps → Career Advisor Admin
- [ ] Tap Storage
- [ ] Tap "Clear Data" or "Clear Storage"
- [ ] Confirm

**Method 2: In-App**
- [ ] Open admin app
- [ ] Tap "Change Server URL"
- [ ] Enter: `http://172.20.10.1:3000`
- [ ] Save
- [ ] Restart app

---

## Step 6: Login to Admin App

- [ ] Open Career Advisor Admin app
- [ ] Enter email: `ayushmistry0054@gmail.com`
- [ ] Enter password: `admin123`
- [ ] Tap "Sign In"
- [ ] Check email for OTP code
- [ ] Enter OTP code
- [ ] Should redirect to admin dashboard

---

## Step 7: Verify Admin Features

- [ ] Dashboard shows statistics
- [ ] Users tab shows 5 users
- [ ] Posts tab shows posts
- [ ] Connections tab shows connections
- [ ] Can navigate to all sections
- [ ] Data matches Java backend

---

## Troubleshooting Checklist

If login fails:

- [ ] Backend is running on port 3000
- [ ] Phone and computer on same WiFi
- [ ] Can access `http://172.20.10.1:3000` from phone browser
- [ ] App data was cleared
- [ ] Using correct credentials (admin123)
- [ ] Email received OTP code

If still not working:

- [ ] Run `node test-admin-login.js` to verify password
- [ ] Check backend terminal for error messages
- [ ] Check Android logcat for app errors
- [ ] Try different IP address (run `ipconfig` to find actual IP)

---

## Success Criteria

✅ All checkboxes above are checked
✅ Admin can login successfully
✅ Dashboard shows real data
✅ All admin features are accessible
✅ Data matches Java backend

---

## Files Modified

Backend:
- [x] `node_backend/.env` - Added database name
- [x] `node_backend/src/routes/admin.js` - Added connections endpoints

Admin App:
- [x] `career_advisor_admin/lib/utils/config.dart` - Updated URL
- [x] `career_advisor_admin/lib/screens/admin/admin_login_screen.dart` - Updated URL

Utility Scripts Created:
- [x] `node_backend/test-db-connection.js`
- [x] `node_backend/test-admin-login.js`
- [x] `node_backend/set-admin-password.js`

Documentation Created:
- [x] `ADMIN_LOGIN_FIX.md`
- [x] `FIXES_SUMMARY.md`
- [x] `QUICK_START.md`
- [x] `ADMIN_APP_COMPLETE_FIX.md`
- [x] `CHECKLIST.md` (this file)

---

**Ready to go! Follow the steps above and you'll be logged in! 🚀**
