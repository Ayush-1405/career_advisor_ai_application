const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  phoneNumber: String,
  profilePictureUrl: String,
  bio: String,
  location: String,
  linkedinUrl: String,
  githubUrl: String,
  websiteUrl: String,
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  isPrivate: { type: Boolean, default: false },
  lastLogin: Date,
  lastActive: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  resumeIds: [String],
  activityIds: [String],
  analysisIds: [String],
}, { 
  timestamps: false, // Managed manually to match Java's custom logic if needed, or set to true if compatible
  toJSON: { 
    virtuals: true, 
    versionKey: false, 
    transform: (doc, ret) => { 
      ret.id = ret._id.toString(); 
      delete ret._id; 
      return ret; 
    } 
  }
});

// Middleware to update updatedAt and normalize email
userSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  this.updatedAt = new Date();
  next();
});


module.exports = mongoose.model('User', userSchema, 'users');

