// ============================================
// AUDIT LOG MODEL
// MongoDB Schema for System Activity Logging
// LAB MARK: Comprehensive Audit Trail
// ============================================

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Event type
  eventType: {
    type: String,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'OTP_SENT',
      'OTP_SUCCESS',
      'OTP_FAILED',
      'LOGOUT',
      'REGISTER',
      'PRESCRIPTION_CREATED',
      'PRESCRIPTION_VERIFIED',
      'PRESCRIPTION_DISPENSED',
      'PRESCRIPTION_CANCELLED',
      'ACCESS_DENIED',
      'FAILED_ACCESS_ATTEMPT',
      'PASSWORD_CHANGED',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      'ADMIN_ACTION'
    ],
    required: true,
    index: true
  },

  // User who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // User role
  userRole: {
    type: String,
    enum: ['doctor', 'pharmacy', 'patient', 'admin'],
    required: true,
    index: true
  },

  // User email for easy reference
  userEmail: {
    type: String,
    required: true,
    index: true
  },

  // Related resource (Prescription ID, etc.)
  resourceId: {
    type: String,
    default: null,
    index: true
  },

  // Resource type
  resourceType: {
    type: String,
    enum: ['Prescription', 'User', 'System'],
    default: null
  },

  // Action description
  action: {
    type: String,
    required: true
  },

  // Status of the action
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'ATTEMPT'],
    default: 'SUCCESS',
    index: true
  },

  // Detailed reason (for failures)
  reason: {
    type: String,
    default: null
  },

  // IP Address
  ipAddress: {
    type: String,
    default: null,
    index: true
  },

  // User Agent / Device info
  userAgent: {
    type: String,
    default: null
  },

  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 2592000 // Auto-delete after 30 days (optional)
  },

  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
});

// Compound index for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ userEmail: 1, timestamp: -1 });
auditLogSchema.index({ userRole: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
