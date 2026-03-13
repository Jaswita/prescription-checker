// ============================================
// ADMIN ROUTES
// Admin-only routes for user management
// LAB MARK: RBAC - Admin permissions
// ============================================

const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  toggleUserLock,
  updateUserRole,
  getSecurityLogs,
  getAnalytics,
  getAuditLogs,
  getAuditLogSummary,
  exportAuditLogs,
  getFailedLoginAttempts,
  getPrescriptionActivity
} = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// All routes require admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

// User management
router.get('/users', getUsers);
router.post('/users', createUser);
router.post('/lock-user', toggleUserLock);
router.post('/role', updateUserRole);

// Logs and analytics
router.get('/logs', getSecurityLogs);
router.get('/analytics', getAnalytics);

// LAB MARK: Audit Log Routes
router.get('/audit-logs/summary', getAuditLogSummary);
router.get('/audit-logs/export', exportAuditLogs);
router.get('/audit-logs', getAuditLogs);

// Security monitoring
router.get('/security/failed-logins', getFailedLoginAttempts);
router.get('/prescriptions/activity', getPrescriptionActivity);

module.exports = router;
