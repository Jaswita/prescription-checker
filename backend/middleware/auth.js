// ============================================
// JWT AUTHENTICATION MIDDLEWARE
// Token verification for protected routes
// LAB MARK: JWT-based Authentication
// ============================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify JWT token
 * Protects routes that require authentication
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password -privateKey');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(403).json({ 
        error: 'Account is locked. Please try again later.',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    console.error('Auth Middleware Error:', error);
    res.status(500).json({ error: 'Authentication error.' });
  }
};

/**
 * Generate JWT Token
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {string} - JWT Token
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = { authenticateToken, generateToken };
