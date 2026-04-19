# Node.js Backend - Complete API Reference
## Fully matches Java Spring Boot backend

---

## Auth  `/api/auth`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login (returns REQUIRES_OTP) |
| POST | `/verify-login?email=&code=` | Verify OTP and get JWT token |
| POST | `/verify/email/send?email=` | Send email OTP |
| POST | `/verify/email/confirm?email=&code=` | Confirm OTP, get token |
| POST | `/forgot-password?email=&redirectBaseUrl=` | Send password reset email |
| GET  | `/reset-password/validate?token=&email=` | Validate reset token |
| POST | `/reset-password?token=&email=&newPassword=` | Reset password |
| GET  | `/test-email?email=` | Test email sending |

---

## User Profile  `/api/user`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/profile` | Get current user profile |
| PUT | `/profile` | Update current user profile |
| GET | `/profile/:userId` | Get any user's profile |
| DELETE | `/profile` | Delete current user account |
| POST | `/ping` | Update lastActive timestamp |
| GET | `/status/:userId` | Get user online status |

---

## Dashboard  `/api/users/me`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Get user dashboard stats |
| POST | `/activity?activityType=&activityData=` | Track user activity |

---

## Feed / Posts  `/api/feed`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get all posts (enriched with user info) |
| GET | `/my-posts` | Get current user's posts |
| GET | `/user/:userId` | Get posts by user |
| POST | `/` | Create post |
| PUT | `/:postId` | Update post |
| DELETE | `/:postId` | Delete post |
| POST | `/:postId/like` | Like/unlike post |
| POST | `/:postId/comment` | Comment on post |

---

## Connections  `/api/connections`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/network` | Get my network (accepted connections) |
| GET | `/suggestions` | Get suggested friends |
| POST | `/follow/:userId` | Follow/unfollow/accept user |
| GET | `/invitations` | Get pending incoming requests |
| GET | `/sent` | Get pending outgoing requests |
| POST | `/accept/:userId` | Accept connection request |
| POST | `/reject/:userId` | Reject connection request |
| GET | `/stats` | Get my social stats |
| GET | `/stats/:userId` | Get user's social stats |

---

## Chats  `/api/chats`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get all my chat rooms |
| GET | `/room/:otherUserId` | Get or create chat room |
| GET | `/:roomId` | Get messages in room |
| POST | `/send/:receiverId` | Send message |
| PUT | `/:roomId/read` | Mark messages as read |
| DELETE | `/all` | Delete all my chats |
| DELETE | `/:roomId/messages` | Clear messages in room |
| DELETE | `/:roomId` | Delete chat room |

---

## Notifications  `/api/notifications`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get all notifications |
| PUT | `/read-all` | Mark all as read |
| PUT | `/:id/read` | Mark one as read |
| DELETE | `/:id` | Delete notification |

---

## Career Paths  `/api/career-paths`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all career paths |
| GET | `/recommendations` | Get AI-matched recommendations |
| GET | `/my-applications` | Get my applications |
| GET | `/my-saved` | Get my saved paths |
| GET | `/user/:userId/applications` | Get user's applications |
| GET | `/:id` | Get career path by ID |
| POST | `/` | Create career path |
| PUT | `/:id` | Update career path |
| DELETE | `/:id` | Delete career path |
| POST | `/:id/apply` | Apply for career path |
| POST | `/:id/save` | Save/bookmark career path |
| DELETE | `/:id/save` | Unsave career path |

---

## Resumes  `/api/resumes`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create resume + AI analysis |
| GET | `/me` | Get my resumes |
| GET | `/:id/analysis` | Get resume analysis |
| DELETE | `/:id` | Delete resume |

---

## Resume Profile  `/api/resume`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | Upload PDF/DOCX and parse |
| GET | `/:userId` | Get resume profile |
| PUT | `/update` | Update resume fields |
| POST | `/generate-pdf` | Generate PDF from resume data |

---

## File Uploads  `/api/uploads`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/image` | Upload image |
| POST | `/chat` | Upload chat file |
| POST | `/video` | Upload video |
| POST | `/resume` | Upload resume file |

---

## AI Assistant  `/api/assistant`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | Chat with AI career advisor |

---

## Reports  `/api/report`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/generate` | Generate career report (JSON) |
| POST | `/pdf` | Generate career report (file) |

---

## Admin  `/api/admin`  *(requires ADMIN role)*

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List all users (paginated) |
| GET | `/users/search?query=` | Search users |
| GET | `/users/role/:role` | Get users by role |
| GET | `/users/:userId` | Get user by ID |
| PUT | `/users/:userId` | Update user profile |
| PUT | `/users/:userId/role-status` | Update role/active/verified |
| DELETE | `/users/:userId` | Delete user + related data |

### Dashboard & Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/stats` | Admin dashboard statistics |
| GET | `/analytics` | Detailed analytics |
| GET | `/activities?page=&size=&type=` | User activity log |

### Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/reports/overview` | Full admin report |
| GET | `/reports/export?format=csv` | Export report as CSV |

### Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/settings` | Get system settings |
| PUT | `/settings` | Update system settings |

### Career Paths
| Method | Path | Description |
|--------|------|-------------|
| GET | `/career-paths` | List all career paths |
| POST | `/career-paths` | Create career path |
| PUT | `/career-paths/:id` | Update career path |
| DELETE | `/career-paths/:id` | Delete career path |
| GET | `/applications` | List all applications |
| POST | `/applications/seed` | Seed test applications |
| PUT | `/applications/:id/status` | Update application status |

### Resumes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/resumes` | List all resumes |
| GET | `/analyses` | List all resume analyses |

### Social
| Method | Path | Description |
|--------|------|-------------|
| GET | `/social/posts` | List all posts (enriched) |
| DELETE | `/social/posts/:postId` | Delete any post |
| GET | `/social/connections` | List all connections (enriched) |
| DELETE | `/social/connections/:connectionId` | Delete connection |
| GET | `/social/chats` | List all chat rooms |
| DELETE | `/social/chats/:roomId` | Delete chat room |
| GET | `/social/stats` | Social statistics |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | List all notifications |
| DELETE | `/notifications/:id` | Delete notification |

---

## Response Format

All endpoints return JSON. Most follow this pattern:
```json
{ "success": true, "data": [...] }
```

Auth errors return:
```json
{ "error": "Unauthorized" }  // 401
{ "error": "Admin access required" }  // 403
```

---

## Authentication

Include JWT token in every request header:
```
Authorization: Bearer <token>
```

Token is obtained from `/api/auth/verify-login` after OTP verification.
