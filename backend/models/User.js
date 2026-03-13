// ============================================
// USER MODEL
// MongoDB Schema for User Authentication
// LAB MARK: Single Factor Auth, MFA, RBAC
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  // LAB MARK: Password hashing with salt (bcrypt)
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  // LAB MARK: Role-Based Access Control (RBAC)
  role: {
    type: String,
    enum: ['doctor', 'pharmacy', 'patient', 'admin'],
    required: [true, 'Role is required']
  },
  // LAB MARK: RSA Key Pair for Digital Signatures
  publicKey: {
    type: String,
    default: null
  },
  privateKey: {
    type: String,
    default: null
  },
  // LAB MARK: Account Lockout after failed attempts
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockUntil: {
    type: Date,
    default: null
  },
  // LAB MARK: OTP for Multi-Factor Authentication
  otp: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// LAB MARK: Pre-save hook for password hashing with salt
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt (10 rounds - balance between security and speed)
    const salt = await bcrypt.genSalt(10);
    // Hash password with salt
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isAccountLocked = function() {
  if (this.isLocked && this.lockUntil && this.lockUntil > Date.now()) {
    return true;
  }
  return false;
};

// Method to increment failed login attempts
userSchema.methods.incrementFailedAttempts = async function() {
  this.failedLoginAttempts += 1;
  
  // Lock account after 3 failed attempts
  if (this.failedLoginAttempts >= 3) {
    this.isLocked = true;
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
  }
  
  await this.save();
};

// Method to reset failed attempts
userSchema.methods.resetFailedAttempts = async function() {
  this.failedLoginAttempts = 0;
  this.isLocked = false;
  this.lockUntil = null;
  await this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
