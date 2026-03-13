// ============================================
// AUTHENTICATION CONTROLLER
// Handles user registration, login, and MFA
// LAB MARK: Single Factor + Multi-Factor Auth
// ============================================

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { generateToken } = require('../middleware/auth');
const { generateOTP, getOTPExpiry, verifyOTP } = require('../middleware/otp');
const { sendOTPEmail } = require('../config/mail');
const { generateKeyPair } = require('../crypto/rsa');
const logger = require('../utils/logger');

/**
 * Helper function to create audit logs
 */
const createAuditLog = async (
  eventType,
  userId,
  userRole,
  userEmail,
  action,
  status = 'SUCCESS',
  ipAddress = null,
  userAgent = null,
  resourceId = null,
  resourceType = null,
  reason = null,
  metadata = null
) => {
  try {
    const auditLog = new AuditLog({
      eventType,
      userId,
      userRole,
      userEmail,
      action,
      status,
      ipAddress,
      userAgent,
      resourceId,
      resourceType,
      reason,
      metadata
    });
    await auditLog.save();
  } catch (error) {
    logger.error('Failed to create audit log:', error.message);
  }
};

/**
 * Register a new user
 * POST /auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Validate role
    const validRoles = ['doctor', 'pharmacy', 'patient', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    // LAB MARK: Generate RSA key pair for doctors (for digital signatures)
    let publicKey = null;
    let privateKey = null;
    if (role === 'doctor') {
      const keys = generateKeyPair();
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;
    }

    // Create user (password will be hashed by pre-save hook)
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role,
      publicKey,
      privateKey
    });

    await user.save();

    // Generate and send OTP for email verification
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = getOTPExpiry();
    await user.save();

    // Send OTP email (don't wait for it)
    sendOTPEmail(user.email, otp);

    logger.success(`User registered: ${user.email} (${role})`);

    // LAB MARK: Create audit log for registration
    await createAuditLog(
      'REGISTER',
      user._id,
      role,
      user.email,
      `New ${role} registration`,
      'SUCCESS',
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json({
      message: 'Registration successful. Please verify your email with the OTP sent.',
      userId: user._id,
      requiresOTP: true
    });
  } catch (error) {
    logger.error('Registration Error:', error.stack);
    res.status(500).json({ error: 'Registration failed.' });
  }
};

/**
 * Login user (Step 1 - Password verification)
 * POST /auth/login
 * LAB MARK: Single Factor Authentication
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // LAB MARK: Create audit log for failed login attempt
      await createAuditLog(
        'LOGIN_FAILED',
        null,
        'unknown',
        email.toLowerCase(),
        'Login attempt with non-existent account',
        'FAILURE',
        req.ip,
        req.get('user-agent'),
        null,
        null,
        'User not found'
      );
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // LAB MARK: Check if account is locked (brute force protection)
    if (user.isAccountLocked()) {
      const lockMinutes = Math.ceil((user.lockUntil - Date.now()) / 180000);
      
      // Log access attempt to locked account
      await createAuditLog(
        'FAILED_ACCESS_ATTEMPT',
        user._id,
        user.role,
        user.email,
        'Login attempt to locked account',
        'FAILURE',
        req.ip,
        req.get('user-agent'),
        null,
        null,
        `Account locked. Unlock in ${lockMinutes} minutes`
      );

      return res.status(403).json({ 
        error: `Account locked. Try again in ${lockMinutes} minutes.`,
        code: 'ACCOUNT_LOCKED'
      });
    }

    // LAB MARK: Verify password (bcrypt comparison)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed attempts
      await user.incrementFailedAttempts();
      const attemptsLeft = 3 - user.failedLoginAttempts;
      
      // LAB MARK: Create audit log for failed login attempt
      await createAuditLog(
        'LOGIN_FAILED',
        user._id,
        user.role,
        user.email,
        'Failed login attempt',
        'FAILURE',
        req.ip,
        req.get('user-agent'),
        null,
        null,
        'Invalid password',
        { attemptsLeft }
      );

      return res.status(401).json({ 
        error: `Invalid credentials. ${attemptsLeft > 0 ? `${attemptsLeft} attempts remaining.` : 'Account locked.'}`,
        attemptsLeft
      });
    }

    // Reset failed attempts on successful password
    await user.resetFailedAttempts();

    // LAB MARK: Generate OTP for MFA
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = getOTPExpiry();
    await user.save();

    // LAB MARK: Create audit log for OTP sent
    await createAuditLog(
      'OTP_SENT',
      user._id,
      user.role,
      user.email,
      'OTP sent for MFA verification',
      'SUCCESS',
      req.ip,
      req.get('user-agent')
    );

    // Send OTP email
    const emailSent = await sendOTPEmail(user.email, otp);

    logger.success(`User logged in: ${user.email}`);

    res.json({
      message: 'Password verified. Please enter the OTP sent to your email.',
      userId: user._id,
      requiresOTP: true,
      emailSent
    });
  } catch (error) {
    logger.error('Login Error:', error.stack);
    res.status(500).json({ error: 'Login failed.' });
  }
};

/**
 * Verify OTP (Step 2 - MFA)
 * POST /auth/verify-otp
 * LAB MARK: Multi-Factor Authentication
 */
const verifyOTPController = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and OTP are required.' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify OTP
    const verification = verifyOTP(user, otp);
    if (!verification.isValid) {
      // LAB MARK: Create audit log for failed OTP verification
      await createAuditLog(
        'OTP_FAILED',
        user._id,
        user.role,
        user.email,
        'Failed OTP verification',
        'FAILURE',
        req.ip,
        req.get('user-agent'),
        null,
        null,
        verification.message
      );
      return res.status(400).json({ error: verification.message });
    }

    // Clear OTP and mark as verified
    user.otp = null;
    user.otpExpiry = null;
    user.isVerified = true;
    await user.save();

    // LAB MARK: Create audit log for successful OTP verification and login
    await createAuditLog(
      'OTP_SUCCESS',
      user._id,
      user.role,
      user.email,
      'OTP verified successfully',
      'SUCCESS',
      req.ip,
      req.get('user-agent')
    );

    // Also log the actual LOGIN_SUCCESS
    await createAuditLog(
      'LOGIN_SUCCESS',
      user._id,
      user.role,
      user.email,
      `User login successful (${user.role})`,
      'SUCCESS',
      req.ip,
      req.get('user-agent')
    );

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    logger.success(`Audit log created: USER_LOGIN by user ${user._id}`);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('OTP Verification Error:', error.stack);
    res.status(500).json({ error: 'OTP verification failed.' });
  }
};

/**
 * Get current user profile
 * GET /auth/me
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -privateKey -otp -otpExpiry');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get Profile Error:', error.stack);
    res.status(500).json({ error: 'Failed to get profile.' });
  }
};

/**
 * Resend OTP
 * POST /auth/resend-otp
 */
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Generate new OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = getOTPExpiry();
    await user.save();

    // LAB MARK: Create audit log for OTP resend
    await createAuditLog(
      'OTP_SENT',
      user._id,
      user.role,
      user.email,
      'OTP resent (User requested)',
      'SUCCESS',
      req.ip,
      req.get('user-agent')
    );

    // Send OTP email
    await sendOTPEmail(user.email, otp);

    logger.info(`OTP resent to: ${user.email}`);

    res.json({ message: 'OTP sent successfully.' });
  } catch (error) {
    logger.error('Resend OTP Error:', error.stack);
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
};

/**
 * Logout user
 * POST /auth/logout
 */
const logout = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const user = await User.findById(userId);

    if (user) {
      // LAB MARK: Create audit log for logout
      await createAuditLog(
        'LOGOUT',
        user._id,
        user.role,
        user.email,
        'User logout',
        'SUCCESS',
        req.ip,
        req.get('user-agent')
      );

      logger.success(`User logged out: ${user.email}`);
    }

    res.json({ message: 'Logout successful.' });
  } catch (error) {
    logger.error('Logout Error:', error.stack);
    res.status(500).json({ error: 'Logout failed.' });
  }
};

module.exports = {
  register,
  login,
  verifyOTP: verifyOTPController,
  getProfile,
  resendOTP,
  logout,
  createAuditLog
};
