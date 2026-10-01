const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { protect, JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Generate 1-day JWT Token
 */
const generateToken = (payload) => {
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// In-memory demo fallback user
const DEMO_USER = {
  id: 'demo-user-id-001',
  email: 'demo@demo.com',
  name: 'Demo Operator'
};

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'A user with this email already exists'
        });
      }

      const user = await User.create({
        email: email.toLowerCase().trim(),
        password,
        name: name || 'Energy Operator'
      });

      const token = generateToken({ id: user._id, email: user.email, name: user.name });

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      });
    } else {
      // Memory fallback if DB is still establishing connection
      const token = generateToken({ id: 'user-' + Date.now(), email, name: name || 'Operator' });
      return res.status(201).json({
        success: true,
        message: 'User registered successfully (Local session)',
        token,
        user: { id: 'user-' + Date.now(), email, name: name || 'Operator' }
      });
    }
  } catch (err) {
    console.error('Registration error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Fast path for demo user
    if (cleanEmail === 'demo@demo.com' && password === 'demo123') {
      const token = generateToken(DEMO_USER);
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: DEMO_USER
      });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const token = generateToken({ id: user._id, email: user.email, name: user.name });

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  try {
    if (req.user && req.user.email === 'demo@demo.com') {
      return res.json({ success: true, user: DEMO_USER });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        return res.json({ success: true, user: req.user });
      }
      return res.json({ success: true, user });
    }

    return res.json({ success: true, user: req.user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
