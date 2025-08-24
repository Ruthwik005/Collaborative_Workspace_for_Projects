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
  // GitHub integration
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
  // Google integration
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
  // User preferences
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
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

const User = mongoose.model('User', userSchema)

export default User