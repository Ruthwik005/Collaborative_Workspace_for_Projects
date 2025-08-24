import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { generateToken } from '../middleware/auth.js'

const router = express.Router()

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long'
      })
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already exists' : 'Username already exists'
      })
    }

    // Create new user
    const user = new User({
      username,
      email,
      password
    })

    await user.save()

    res.status(201).json({
      message: 'Account created successfully! Please log in.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({
      message: 'Server error during signup'
    })
  }
})

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      })
    }

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      })
    }

    // Check password
    const isValidPassword = await user.comparePassword(password)
    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Invalid credentials'
      })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Account is deactivated'
      })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        githubRepoUrl: user.githubRepoUrl
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      message: 'Server error during login'
    })
  }
})

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: 'Access token required' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router