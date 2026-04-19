# Quick Start Guide - Admin App Login

## 🚀 Quick Steps

### 1. Start Backend
```bash
cd node_backend
npm start
```

### 2. Clear Admin App Data
- Android Settings → Apps → Career Advisor Admin → Storage → Clear Data
- Or use "Change Server URL" button in app

### 3. Login
```
Email: ayushmistry0054@gmail.com
Password: admin123
```

### 4. Enter OTP
Check email for verification code

---

## 📱 URLs

- **User App**: `http://172.20.10.2:3000`
- **Admin App**: `http://172.20.10.1:3000`
- **Backend**: Port `3000`

---

## 🔧 Quick Fixes

### Reset Admin Password
```bash
cd node_backend
node set-admin-password.js
```

### Test Database
```bash
cd node_backend
node test-db-connection.js
```

### Test Login
```bash
cd node_backend
node test-admin-login.js
```

---

## ✅ What's Fixed

1. Database connection to `career_advisor`
2. Admin password set to `admin123`
3. Admin app URL corrected
4. Connections management endpoint added
5. All data from Java backend accessible

---

## 📞 If Something Doesn't Work

1. **Backend not starting**: Check MongoDB connection
2. **Can't login**: Run `node set-admin-password.js`
3. **Connection timeout**: Clear app data and check WiFi
4. **Wrong data**: Verify database name in connection string

---

## 🎯 Admin Features Available

- ✅ Dashboard with statistics
- ✅ User management (view, edit, delete)
- ✅ Posts management (view, delete)
- ✅ Connections management (view, delete)
- ✅ Career paths & applications
- ✅ Resume management
- ✅ System settings
- ✅ Analytics & reports
- ✅ Auto-refresh (30s for posts, 45s for connections)

---

**That's it! You're ready to go! 🎉**
