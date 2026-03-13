// ============================================
// PRESCRIPTION ROUTES
// Protected routes for prescription management
// LAB MARK: RBAC enforced routes
// ============================================

const express = require('express');
const router = express.Router();
const {
  createPrescription,
  verifyPrescription,
  dispensePrescription,
  getMyPrescriptions,
  getPatients
} = require('../controllers/prescriptionController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Doctor routes
router.post('/create', authenticateToken, requireRole('doctor'), createPrescription);
router.get('/patients', authenticateToken, requireRole('doctor'), getPatients);

// Pharmacy routes
router.post('/dispense', authenticateToken, requireRole('pharmacy'), dispensePrescription);

// Verification (public for QR scanning)
router.post('/verify', verifyPrescription);

// Get user's prescriptions (all roles)
router.get('/my', authenticateToken, getMyPrescriptions);

module.exports = router;
