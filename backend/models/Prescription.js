// ============================================
// PRESCRIPTION MODEL
// MongoDB Schema for Encrypted Prescriptions
// LAB MARK: Encryption, Digital Signatures, QR
// ============================================

const mongoose = require('mongoose');

// Audit Log Sub-Schema
const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  performedByRole: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  details: String,
  ipAddress: String
});

const prescriptionSchema = new mongoose.Schema({
  // Unique prescription identifier
  prescriptionId: {
    type: String,
    required: true,
    unique: true
  },
  // Doctor who created the prescription
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Patient the prescription is for
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // LAB MARK: AES Encrypted prescription data
  encryptedData: {
    type: String,
    required: true
  },
  // LAB MARK: AES Initialization Vector
  iv: {
    type: String,
    required: true
  },
  // LAB MARK: RSA encrypted AES key (Key Exchange)
  aesKeyEncrypted: {
    type: String,
    required: true
  },
  // LAB MARK: SHA-256 Hash for Integrity
  hash: {
    type: String,
    required: true
  },
  // LAB MARK: Digital Signature (Non-Repudiation)
  digitalSignature: {
    type: String,
    required: true
  },
  // LAB MARK: QR Code for encoding
  qrCode: {
    type: String,
    default: null
  },
  // Prescription Status
  status: {
    type: String,
    enum: ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  // Controlled Substance Flag
  isControlledSubstance: {
    type: Boolean,
    default: false
  },
  // Drug details (stored encrypted, but we keep basic info for queries)
  drugName: String,
  dosage: String,
  // Expiry date
  expiryDate: {
    type: Date,
    required: true
  },
  // Dispensing information
  dispensedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  dispensedAt: {
    type: Date,
    default: null
  },
  // LAB MARK: Audit Trail
  auditLog: [auditLogSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
prescriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to add audit log entry
prescriptionSchema.methods.addAuditLog = function(action, userId, role, details, ipAddress) {
  this.auditLog.push({
    action,
    performedBy: userId,
    performedByRole: role,
    details,
    ipAddress,
    timestamp: Date.now()
  });
};

// Check if prescription is expired
prescriptionSchema.methods.isExpired = function() {
  return this.expiryDate < Date.now();
};

const Prescription = mongoose.model('Prescription', prescriptionSchema);

module.exports = Prescription;
