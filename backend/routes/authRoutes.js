// ============================================
// AUTHENTICATION ROUTES
// Public routes for login, register, OTP
// ============================================

const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  verifyOTP, 
  getProfile,
  resendOTP,
  logout 
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Protected routes
router.get('/me', authenticateToken, getProfile);
router.post('/logout', authenticateToken, logout);

module.exports = router;
