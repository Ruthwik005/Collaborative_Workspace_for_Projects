import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: null
  },
  // GitHub integration (Phase 2)
  githubId: {
    type: String,
    default: null
  },
  githubAccessToken: {
    type: String,
    default: null
  },
  githubRepoUrl: {
    type: String,
    default: null
  },
  githubRepoOwner: {
    type: String,
    default: null
  },
  githubRepoName: {
    type: String,
    default: null
  },
  // Google integration (Phase 2)
  googleId: {
    type: String,
    default: null
  },
  googleAccessToken: {
    type: String,
    default: null
  },
  googleRefreshToken: {
    type: String,
    default: null
  },
  googleEmail: {
    type: String,
    default: null
  },
  googleName: {
    type: String,
    default: null
  },
  googlePicture: {
    type: String,
    default: null
  },
  // User preferences
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  // Notification preferences (Phase 3)
  notificationPreferences: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    weeklyReports: { type: Boolean, default: true },
    dailyReminders: { type: Boolean, default: true },
    meetingReminders: { type: Boolean, default: true },
    taskUpdates: { type: Boolean, default: true }
  }
}, {
  timestamps: true
})

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject()
  delete userObject.password
  delete userObject.githubAccessToken
  delete userObject.googleAccessToken
  delete userObject.googleRefreshToken
  return userObject
}

// Virtual for integration status
userSchema.virtual('integrations').get(function() {
  return {
    github: {
      connected: !!this.githubAccessToken,
      repo: this.githubRepoUrl ? `${this.githubRepoOwner}/${this.githubRepoName}` : null
    },
    google: {
      connected: !!this.googleAccessToken,
      email: this.googleEmail,
      name: this.googleName
    }
  }
})

// Method to check if user has any integrations
userSchema.methods.hasIntegrations = function() {
  return !!(this.githubAccessToken || this.googleAccessToken)
}

const User = mongoose.model('User', userSchema)

export default User