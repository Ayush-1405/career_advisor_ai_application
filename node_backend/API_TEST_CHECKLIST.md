# API Test Checklist

## Critical Fixes Applied

### 1. ID Field Transformation
- ✅ All Mongoose models now have `toJSON` transform that converts `_id` to `id`
- ✅ All responses will return `id` instead of `_id` to match Flutter app expectations
- ✅ Internally, code still uses `_id` (Mongoose native) for queries and operations

### 2. Models Updated
- ✅ User model
- ✅ Resume, ResumeAnalysis, ResumeProfile
- ✅ CareerPath, UserCareerPath, UserSavedCareerPath
- ✅ Post, Connection, ChatRoom, Message, Notification
- ✅ EmailOtp, PasswordResetToken, UserActivity, UserProfileCompletion, SystemSettings

### 3. Routes Fixed
- ✅ Auth routes - removed manual `id` creation, now returns `userId` field for compatibility
- ✅ UserProfile routes - removed toDto function, relies on toJSON
- ✅ Admin routes - removed toDto function, relies on toJSON
- ✅ Feed routes - fixed enrichPost to use `.toString()` on ObjectIds
- ✅ Connections routes - fixed enrichUser to use `.toString()` on ObjectIds
- ✅ Chats routes - fixed to use `.toString()` on ObjectIds

## API Endpoints to Test

### Authentication APIs
- [ ] POST /api/auth/register
- [ ] POST /api/auth/login
- [ ] POST /api/auth/verify-login?email=&code=
- [ ] POST /api/auth/verify/email/send?email=
- [ ] POST /api/auth/verify/email/confirm?email=&code=
- [ ] POST /api/auth/forgot-password?email=&redirectBaseUrl=
- [ ] GET /api/auth/reset-password/validate?token=&email=
- [ ] POST /api/auth/reset-password?token=&email=&newPassword=

### User Profile APIs
- [ ] GET /api/user/profile (should return `id` not `_id`)
- [ ] PUT /api/user/profile
- [ ] GET /api/user/profile/:userId
- [ ] DELETE /api/user/profile
- [ ] POST /api/user/ping
- [ ] GET /api/user/status/:userId

### Career Paths APIs
- [ ] GET /api/career-paths (should return array with `id` field)
- [ ] GET /api/career-paths/recommendations
- [ ] GET /api/career-paths/my-applications
- [ ] GET /api/career-paths/my-saved
- [ ] GET /api/career-paths/:id
- [ ] POST /api/career-paths/:id/apply
- [ ] POST /api/career-paths/:id/save
- [ ] DELETE /api/career-paths/:id/save

### Resume APIs
- [ ] POST /api/resumes (should return analysis with `id`)
- [ ] GET /api/resumes/me
- [ ] GET /api/resumes/:id/analysis
- [ ] DELETE /api/resumes/:id

### Resume Profile APIs
- [ ] POST /api/resume/upload
- [ ] GET /api/resume/:userId
- [ ] PUT /api/resume/update
- [ ] POST /api/resume/generate-pdf

### Feed APIs
- [ ] GET /api/feed (should return posts with `id` field)
- [ ] GET /api/feed/my-posts
- [ ] GET /api/feed/user/:userId
- [ ] POST /api/feed
- [ ] PUT /api/feed/:postId
- [ ] DELETE /api/feed/:postId
- [ ] POST /api/feed/:postId/like
- [ ] POST /api/feed/:postId/comment

### Connections APIs
- [ ] GET /api/connections/network (should return users with `id`)
- [ ] GET /api/connections/suggestions
- [ ] POST /api/connections/follow/:userId
- [ ] GET /api/connections/invitations
- [ ] GET /api/connections/sent
- [ ] POST /api/connections/accept/:userId
- [ ] POST /api/connections/reject/:userId
- [ ] GET /api/connections/stats
- [ ] GET /api/connections/stats/:userId

### Chat APIs
- [ ] GET /api/chats (should return chatRoomId as string)
- [ ] GET /api/chats/room/:otherUserId
- [ ] GET /api/chats/:roomId
- [ ] POST /api/chats/send/:receiverId
- [ ] PUT /api/chats/:roomId/read
- [ ] DELETE /api/chats/all
- [ ] DELETE /api/chats/:roomId/messages
- [ ] DELETE /api/chats/:roomId

### Notification APIs
- [ ] GET /api/notifications (should return notifications with `id`)
- [ ] PUT /api/notifications/:id/read
- [ ] PUT /api/notifications/read-all

### Dashboard APIs
- [ ] GET /api/users/me/stats
- [ ] POST /api/users/me/activity?activityType=&activityData=

### Assistant APIs
- [ ] POST /api/assistant/chat

### Upload APIs
- [ ] POST /api/uploads/image
- [ ] POST /api/uploads/chat
- [ ] POST /api/uploads/video
- [ ] POST /api/uploads/resume

### Report APIs
- [ ] POST /api/report/generate
- [ ] POST /api/report/pdf

### Admin APIs (require ADMIN role)
- [ ] GET /api/admin/users
- [ ] GET /api/admin/users/search?query=
- [ ] GET /api/admin/users/:userId
- [ ] PUT /api/admin/users/:userId
- [ ] PUT /api/admin/users/:userId/role-status
- [ ] DELETE /api/admin/users/:userId
- [ ] GET /api/admin/dashboard/stats
- [ ] GET /api/admin/analytics
- [ ] GET /api/admin/resumes
- [ ] GET /api/admin/reports/overview
- [ ] GET /api/admin/reports/export?format=csv
- [ ] GET /api/admin/settings
- [ ] PUT /api/admin/settings
- [ ] GET /api/admin/applications
- [ ] POST /api/admin/applications/seed
- [ ] PUT /api/admin/applications/:id/status
- [ ] GET /api/admin/social/posts
- [ ] DELETE /api/admin/social/posts/:postId
- [ ] GET /api/admin/social/stats

## Testing Notes

1. **ID Field**: All responses should contain `id` field (not `_id`)
2. **Authentication**: Most endpoints require Bearer token in Authorization header
3. **MongoDB ObjectIds**: Internally still use `_id`, but JSON responses show `id`
4. **Populated References**: When using `.populate()`, nested objects also get `id` transformation
5. **String IDs**: Some fields like `userId`, `careerPathId` are stored as strings and remain unchanged

## Quick Test Commands

```bash
# Test user registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test get career paths (no auth required)
curl http://localhost:3000/api/career-paths

# Test get profile (requires auth)
curl http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Expected Response Format

All model responses should have `id` instead of `_id`:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

NOT:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe"
}
```
