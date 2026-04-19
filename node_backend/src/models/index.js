const mongoose = require('mongoose');

// Global toJSON transform to convert _id to id and remove __v
const toJSONOptions = {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    return ret;
  }
};

// EmailOtp
const emailOtpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { toJSON: toJSONOptions });
const EmailOtp = mongoose.model('EmailOtp', emailOtpSchema, 'email_otp');

// PasswordResetToken
const passwordResetTokenSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { toJSON: toJSONOptions });
const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema, 'password_reset_tokens');

// Resume
const resumeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  education: String,
  skills: String,
  experience: String,
  fileName: String,
  filePath: String,
  fileSize: Number,
  fileType: String,
  uploadedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'PROCESSED' },
  analysisIds: [String],
}, { toJSON: toJSONOptions });
const Resume = mongoose.model('Resume', resumeSchema, 'resume');

// ResumeAnalysis
const resumeAnalysisSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
  overallScore: Number,
  strengths: String,
  improvements: String,
  feedback: String,
  careerPath: String,
  analysisData: String,
  analyzedAt: { type: Date, default: Date.now },
}, { toJSON: toJSONOptions });
const ResumeAnalysis = mongoose.model('ResumeAnalysis', resumeAnalysisSchema, 'resume_analysis');

// ResumeProfile
const educationEntrySchema = new mongoose.Schema({
  degree: String,
  institute: String,
  startYear: String,
  endYear: String,
  score: String,
  details: String,
});
const experienceEntrySchema = new mongoose.Schema({
  title: String,
  company: String,
  startDate: String,
  endDate: String,
  location: String,
  highlights: [String],
});
const projectEntrySchema = new mongoose.Schema({
  title: String,
  link: String,
  description: String,
  technologies: [String],
});
const resumeProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalFileName: String,
  storedFileName: String,
  fileType: String,
  fileSize: Number,
  filePath: String,
  fileUrl: String,
  name: String,
  email: String,
  phone: String,
  skills: [String],
  summary: String,
  education: [educationEntrySchema],
  experience: [experienceEntrySchema],
  projects: [projectEntrySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { toJSON: toJSONOptions });
const ResumeProfile = mongoose.model('ResumeProfile', resumeProfileSchema, 'resume_profile');

// CareerPath
const careerPathSchema = new mongoose.Schema({
  title: String,
  description: String,
  level: String,
  category: String,
  image: String,
  averageSalary: String,
  growth: String,
  popularity: { type: Number, default: 0 },
  requiredSkills: [String],
  careerProgression: [mongoose.Schema.Types.Mixed],
}, { toJSON: toJSONOptions });
const CareerPath = mongoose.model('CareerPath', careerPathSchema, 'career_paths');

// UserCareerPath
const userCareerPathSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  careerPath: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerPath' },
  status: { type: String, default: 'APPLIED' },
  appliedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { toJSON: toJSONOptions });
const UserCareerPath = mongoose.model('UserCareerPath', userCareerPathSchema, 'user_career_paths');

// UserSavedCareerPath
const userSavedCareerPathSchema = new mongoose.Schema({
  userId: String,
  careerPathId: String,
  savedAt: { type: Date, default: Date.now },
}, { toJSON: toJSONOptions });
const UserSavedCareerPath = mongoose.model('UserSavedCareerPath', userSavedCareerPathSchema, 'user_saved_career_paths');

// Post
const commentSchema = new mongoose.Schema({
  userId: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});
const postSchema = new mongoose.Schema({
  userId: String,
  content: String,
  isAchievement: { type: Boolean, default: false },
  mediaUrls: [String],
  mediaType: String,
  likes: [String],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now },
}, { toJSON: toJSONOptions });
const Post = mongoose.model('Post', postSchema, 'posts');

// Connection
const connectionSchema = new mongoose.Schema({
  followerId: String,
  followedId: String,
  status: { type: String, default: 'ACCEPTED' },
  createdAt: { type: Date, default: Date.now },
}, { toJSON: toJSONOptions });
const Connection = mongoose.model('Connection', connectionSchema, 'connections');

// ChatRoom
const chatRoomSchema = new mongoose.Schema({
  participantIds: [String],
  lastMessage: String,
  lastUpdate: { type: Date, default: Date.now },
}, { toJSON: toJSONOptions });
const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema, 'chat_rooms');

// Message
const messageSchema = new mongoose.Schema({
  chatRoomId: String,
  senderId: String,
  content: String,
  isRead: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
}, { toJSON: toJSONOptions });
const Message = mongoose.model('Message', messageSchema, 'messages');

// Notification
const notificationSchema = new mongoose.Schema({
  recipientId: String,
  senderId: String,
  senderName: String,
  senderAvatarUrl: String,
  type: String,
  message: String,
  relatedEntityId: String,
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { toJSON: toJSONOptions });
const Notification = mongoose.model('Notification', notificationSchema, 'notifications');

// UserActivity
const userActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  activityType: String,
  activityData: String,
  createdAt: { type: Date, default: Date.now },
}, { toJSON: toJSONOptions });
const UserActivity = mongoose.model('UserActivity', userActivitySchema, 'user_activities');

// UserProfileCompletion
const userProfileCompletionSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  hasResume: { type: Boolean, default: false },
  hasSkillsAssessment: { type: Boolean, default: false },
  hasCareerPreferences: { type: Boolean, default: false },
  hasEducationInfo: { type: Boolean, default: false },
  completionPercentage: { type: Number, default: 0 },
}, { timestamps: true, toJSON: toJSONOptions });
const UserProfileCompletion = mongoose.model('UserProfileCompletion', userProfileCompletionSchema, 'user_profile_completions');

// SystemSettings
const systemSettingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'Career Advisor' },
  allowRegistrations: { type: Boolean, default: true },
  requireEmailVerification: { type: Boolean, default: false },
  resumeMaxSizeMb: { type: Number, default: 5 },
  supportedFormats: [String],
  aiAssistantEnabled: { type: Boolean, default: true },
}, { toJSON: toJSONOptions });
const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema, 'system_settings');

module.exports = {
  EmailOtp, PasswordResetToken, Resume, ResumeAnalysis, ResumeProfile,
  CareerPath, UserCareerPath, UserSavedCareerPath, Post, Connection,
  ChatRoom, Message, Notification, UserActivity, UserProfileCompletion, SystemSettings,
};

