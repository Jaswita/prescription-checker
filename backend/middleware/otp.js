// ============================================
// OTP (ONE-TIME PASSWORD) MIDDLEWARE
// Multi-Factor Authentication Implementation
// LAB MARK: Multi-Factor Authentication (MFA)
// ============================================

const crypto = require('crypto');

/**
 * Generate a 6-digit OTP
 * LAB MARK: Secure random OTP generation
 * @returns {string} - 6-digit OTP
 */
const generateOTP = () => {
  // Generate cryptographically secure random number
  const buffer = crypto.randomBytes(3);
  const number = buffer.readUIntBE(0, 3) % 1000000;
  return number.toString().padStart(6, '0');
};

/**
 * Get OTP expiry time (10 minutes from now)
 * @returns {Date} - Expiry timestamp
 */
const getOTPExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
};

/**
 * Verify if OTP is valid and not expired
 * @param {object} user - User object with otp and otpExpiry
 * @param {string} inputOTP - OTP entered by user
 * @returns {object} - { isValid, message }
 */
const verifyOTP = (user, inputOTP) => {
  // Check if OTP exists
  if (!user.otp || !user.otpExpiry) {
    return { isValid: false, message: 'No OTP found. Please request a new one.' };
  }

  // Check if OTP is expired
  if (new Date() > user.otpExpiry) {
    return { isValid: false, message: 'OTP has expired. Please request a new one.' };
  }

  // Compare OTP (timing-safe comparison to prevent timing attacks)
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(user.otp),
    Buffer.from(inputOTP)
  );

  if (!isMatch) {
    return { isValid: false, message: 'Invalid OTP. Please try again.' };
  }

  return { isValid: true, message: 'OTP verified successfully.' };
};

/**
 * Middleware to require OTP verification
 * Used for sensitive operations
 */
const requireOTPVerification = async (req, res, next) => {
  try {
    const { otp } = req.body;
    
    if (!otp) {
      return res.status(400).json({ 
        error: 'OTP is required.',
        code: 'OTP_REQUIRED'
      });
    }

    const user = req.user;
    const verification = verifyOTP(user, otp);

    if (!verification.isValid) {
      return res.status(400).json({ 
        error: verification.message,
        code: 'OTP_INVALID'
      });
    }

    // Clear OTP after successful verification
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    next();
  } catch (error) {
    console.error('OTP Verification Error:', error);
    res.status(500).json({ error: 'OTP verification failed.' });
  }
};

module.exports = {
  generateOTP,
  getOTPExpiry,
  verifyOTP,
  requireOTPVerification
};
