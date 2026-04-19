const mongoose = require('mongoose');
const { UserActivity, UserProfileCompletion, Resume } = require('../models/index');

const activityMessages = {
  resume_upload:              { msg: 'Resume uploaded successfully',      icon: 'ri-file-text-line',     color: 'text-green-600' },
  skills_assessment:          { msg: 'Skills assessment completed',       icon: 'ri-brain-line',         color: 'text-purple-600' },
  skills_assessment_completed:{ msg: 'Skills assessment completed',       icon: 'ri-brain-line',         color: 'text-purple-600' },
  login:                      { msg: 'Logged in successfully',            icon: 'ri-login-box-line',     color: 'text-blue-600' },
  profile_update:             { msg: 'Profile updated',                   icon: 'ri-user-settings-line', color: 'text-orange-600' },
  career_application:         { msg: 'Applied for a career path',         icon: 'ri-send-plane-line',    color: 'text-indigo-600' },
  career_saved:               { msg: 'Saved a career path',               icon: 'ri-bookmark-line',      color: 'text-pink-600' },
  dashboard_visit:            { msg: 'Visited dashboard',                 icon: 'ri-dashboard-line',     color: 'text-cyan-600' },
  user_registration:          { msg: 'Account created',                   icon: 'ri-user-add-line',      color: 'text-green-600' },
  email_verified:             { msg: 'Email verified',                    icon: 'ri-mail-check-line',    color: 'text-teal-600' },
  career_preferences:         { msg: 'Career preferences updated',        icon: 'ri-settings-line',      color: 'text-yellow-600' },
  education_update:           { msg: 'Education info updated',            icon: 'ri-graduation-cap-line',color: 'text-blue-600' },
};

const trackUserActivity = async (userId, activityType, activityData = null) => {
  try {
    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId) : null;
    if (!userObjectId) return;
    // Run both in parallel — no need to wait for completion update before returning
    await Promise.all([
      UserActivity.create({ user: userObjectId, activityType, activityData }),
      updateProfileCompletion(userId, activityType),
    ]);
  } catch (e) {
    console.error('Activity tracking error:', e.message);
  }
};

const updateProfileCompletion = async (userId, activityType) => {
  try {
    let completion = await UserProfileCompletion.findOne({ userId });
    if (!completion) completion = new UserProfileCompletion({ userId });

    if (activityType === 'resume_upload') completion.hasResume = true;
    if (['skills_assessment', 'skills_assessment_completed'].includes(activityType)) completion.hasSkillsAssessment = true;
    if (activityType === 'career_preferences') completion.hasCareerPreferences = true;
    if (activityType === 'education_update') completion.hasEducationInfo = true;

    const flags = [completion.hasResume, completion.hasSkillsAssessment, completion.hasCareerPreferences, completion.hasEducationInfo];
    completion.completionPercentage = Math.round((flags.filter(Boolean).length / flags.length) * 100);
    await completion.save();
  } catch (e) {
    console.error('Profile completion update error:', e.message);
  }
};

const getUserDashboardStats = async (userId) => {
  try {
    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId) : null;
    if (!userObjectId) throw new Error('Invalid userId');

    // Run all DB queries in parallel — was sequential before (3x slower)
    const [completion, recentActivities, totalActivities, resumeCount, appliedCount] = await Promise.all([
      UserProfileCompletion.findOne({ userId }),
      UserActivity.find({ user: userObjectId }).sort({ createdAt: -1 }).limit(5).lean(),
      UserActivity.countDocuments({ user: userObjectId }),
      Resume.countDocuments({ user: userObjectId }),
      UserActivity.countDocuments({ user: userObjectId, activityType: 'career_application' }),
    ]);

    const mappedActivities = recentActivities.map(a => {
      const meta = activityMessages[a.activityType] || {
        msg: (a.activityType || '').replace(/_/g, ' '),
        icon: 'ri-check-line',
        color: 'text-gray-600',
      };
      return {
        activityType: a.activityType,
        type: a.activityType,          // Flutter uses both 'type' and 'activityType'
        message: meta.msg,
        description: meta.msg,
        timestamp: a.createdAt,
        icon: meta.icon,
        color: meta.color,
        status: 'completed',
      };
    });

    return {
      // Flutter-compatible field names (matches what the screen expects)
      resumeUploaded:      completion?.hasResume || false,
      skillsAssessed:      completion?.hasSkillsAssessment || false,
      completionRate:      completion?.completionPercentage || 0,
      resumeCount,
      appliedCount,
      totalActivities,
      suggestionsAvailable: 0,
      recentActivities:    mappedActivities,
      // Also include the raw names for backward compat
      hasResume:           completion?.hasResume || false,
      hasSkillsAssessment: completion?.hasSkillsAssessment || false,
    };
  } catch (e) {
    console.error('getDashboardStats error:', e.message);
    return {
      resumeUploaded: false, skillsAssessed: false, completionRate: 0,
      resumeCount: 0, appliedCount: 0, totalActivities: 0,
      suggestionsAvailable: 0, recentActivities: [],
      hasResume: false, hasSkillsAssessment: false,
    };
  }
};

module.exports = { trackUserActivity, getUserDashboardStats };
