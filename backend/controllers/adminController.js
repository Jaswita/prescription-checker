// ============================================
// ADMIN CONTROLLER
// User management and security logs
// LAB MARK: Admin Functions, Audit Logging
// ============================================

const User = require('../models/User');
const Prescription = require('../models/Prescription');
const AuditLog = require('../models/AuditLog');
const { generateKeyPair } = require('../crypto/rsa');
const logger = require('../utils/logger');
const { createAuditLog } = require('./authController');

/**
 * Get all users
 * GET /admin/users
 */
const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password -privateKey -otp -otpExpiry')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ error: 'Failed to get users.' });
  }
};

/**
 * Create a new user (Admin)
 * POST /admin/users
 */
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Generate keys for doctors
    let publicKey = null;
    let privateKey = null;
    if (role === 'doctor') {
      const keys = generateKeyPair();
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;
    }

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role,
      publicKey,
      privateKey,
      isVerified: true // Admin-created users are pre-verified
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create User Error:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
};

/**
 * Lock/Unlock user account
 * POST /admin/lock-user
 */
const toggleUserLock = async (req, res) => {
  try {
    const { userId, lock } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (lock) {
      user.isLocked = true;
      user.lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // Lock for 24 hours
    } else {
      user.isLocked = false;
      user.lockUntil = null;
      user.failedLoginAttempts = 0;
    }

    await user.save();

    res.json({
      message: `User ${lock ? 'locked' : 'unlocked'} successfully.`,
      user: {
        id: user._id,
        name: user.name,
        isLocked: user.isLocked
      }
    });
  } catch (error) {
    console.error('Toggle Lock Error:', error);
    res.status(500).json({ error: 'Failed to update user lock status.' });
  }
};

/**
 * Update user role
 * POST /admin/role
 */
const updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ error: 'User ID and role are required.' });
    }

    const validRoles = ['doctor', 'pharmacy', 'patient', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Generate keys if changing to doctor
    if (role === 'doctor' && !user.publicKey) {
      const keys = generateKeyPair();
      user.publicKey = keys.publicKey;
      user.privateKey = keys.privateKey;
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'User role updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update Role Error:', error);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
};

/**
 * Get security logs
 * GET /admin/logs
 * LAB MARK: Audit Trail
 */
const getSecurityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    // Get prescriptions with audit logs
    const prescriptions = await Prescription.find({
      'auditLog.0': { $exists: true }
    })
      .select('prescriptionId auditLog isControlledSubstance')
      .sort({ 'auditLog.timestamp': -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Flatten audit logs
    const logs = [];
    prescriptions.forEach(p => {
      p.auditLog.forEach(log => {
        logs.push({
          prescriptionId: p.prescriptionId,
          isControlledSubstance: p.isControlledSubstance,
          action: log.action,
          performedBy: log.performedBy,
          performedByRole: log.performedByRole,
          timestamp: log.timestamp,
          details: log.details,
          ipAddress: log.ipAddress
        });
      });
    });

    // Sort by timestamp
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Get locked users (security concern)
    const lockedUsers = await User.find({ isLocked: true })
      .select('name email failedLoginAttempts lockUntil');

    res.json({
      logs: logs.slice(0, parseInt(limit)),
      lockedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get Logs Error:', error);
    res.status(500).json({ error: 'Failed to get security logs.' });
  }
};

/**
 * Get analytics dashboard data
 * GET /admin/analytics
 */
const getAnalytics = async (req, res) => {
  try {
    // User stats
    const userStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Prescription stats
    const prescriptionStats = await Prescription.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Controlled substance stats
    const controlledStats = await Prescription.aggregate([
      { $match: { isControlledSubstance: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Recent activity
    const recentPrescriptions = await Prescription.find()
      .select('prescriptionId status drugName createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      users: userStats,
      prescriptions: prescriptionStats,
      controlledSubstances: controlledStats,
      recentActivity: recentPrescriptions
    });
  } catch (error) {
    console.error('Get Analytics Error:', error);
    res.status(500).json({ error: 'Failed to get analytics.' });
  }
};

/**
 * Get audit logs (Admin only)
 * GET /admin/audit-logs
 * Query params:
 *   - eventType: Filter by event type
 *   - userId: Filter by user ID
 *   - userEmail: Filter by user email
 *   - userRole: Filter by user role
 *   - status: Filter by status (SUCCESS, FAILURE)
 *   - startDate: Filter by start date
 *   - endDate: Filter by end date
 *   - limit: Number of records (default: 100)
 *   - skip: Skip N records (default: 0)
 */
const getAuditLogs = async (req, res) => {
  try {
    const {
      eventType,
      userId,
      userEmail,
      userRole,
      status,
      startDate,
      endDate,
      limit = 100,
      skip = 0
    } = req.query;

    // Build filter object
    const filter = {};

    if (eventType) filter.eventType = eventType;
    if (userId) filter.userId = userId;
    if (userEmail) filter.userEmail = userEmail.toLowerCase();
    if (userRole) filter.userRole = userRole;
    if (status) filter.status = status;

    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Fetch audit logs with pagination
    const auditLogs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'name email role');

    // Get total count for pagination
    const total = await AuditLog.countDocuments(filter);

    // LAB MARK: Create audit log for admin accessing logs
    await createAuditLog(
      'ADMIN_ACTION',
      req.userId,
      req.userRole,
      req.userEmail,
      'View audit logs',
      'SUCCESS',
      req.ip,
      req.get('user-agent'),
      null,
      null,
      null,
      {
        action: 'view_audit_logs',
        filters: filter,
        recordsRetrieved: auditLogs.length,
        total
      }
    );

    logger.success(`Admin retrieved ${auditLogs.length} audit logs`);

    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Get Audit Logs Error:', error.stack);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
};

/**
 * Get audit log summary/statistics
 * GET /admin/audit-logs/summary
 */
const getAuditLogSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Get summary statistics
    const summary = await AuditLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const statusSummary = await AuditLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const roleSummary = await AuditLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$userRole',
          count: { $sum: 1 }
        }
      }
    ]);

    // LAB MARK: Create audit log for admin accessing summary
    await createAuditLog(
      'ADMIN_ACTION',
      req.userId,
      req.userRole,
      req.userEmail,
      'View audit log summary',
      'SUCCESS',
      req.ip,
      req.get('user-agent'),
      null,
      null,
      null,
      {
        action: 'view_audit_summary',
        startDate,
        endDate
      }
    );

    logger.success(`Admin retrieved audit log summary`);

    res.json({
      success: true,
      data: {
        byEventType: summary,
        byStatus: statusSummary,
        byRole: roleSummary,
        period: {
          startDate: startDate || 'all',
          endDate: endDate || 'now'
        }
      }
    });
  } catch (error) {
    logger.error('Get Audit Summary Error:', error.stack);
    res.status(500).json({ error: 'Failed to retrieve audit summary.' });
  }
};

/**
 * Export audit logs (CSV)
 * GET /admin/audit-logs/export
 */
const exportAuditLogs = async (req, res) => {
  try {
    const {
      eventType,
      userRole,
      startDate,
      endDate
    } = req.query;

    const filter = {};
    if (eventType) filter.eventType = eventType;
    if (userRole) filter.userRole = userRole;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const auditLogs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .lean();

    // Convert to CSV format
    const csv = convertToCSV(auditLogs);

    // LAB MARK: Create audit log for export
    await createAuditLog(
      'ADMIN_ACTION',
      req.userId,
      req.userRole,
      req.userEmail,
      'Export audit logs',
      'SUCCESS',
      req.ip,
      req.get('user-agent'),
      null,
      null,
      null,
      {
        action: 'export_audit_logs',
        recordsExported: auditLogs.length
      }
    );

    logger.success(`Admin exported ${auditLogs.length} audit logs to CSV`);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`
    );
    res.send(csv);
  } catch (error) {
    logger.error('Export Audit Logs Error:', error.stack);
    res.status(500).json({ error: 'Failed to export audit logs.' });
  }
};

/**
 * Helper function to convert audit logs to CSV
 */
function convertToCSV(auditLogs) {
  if (!auditLogs || auditLogs.length === 0) {
    return 'No data';
  }

  const headers = [
    'Timestamp',
    'Event Type',
    'User Email',
    'User Role',
    'Action',
    'Status',
    'IP Address',
    'Resource ID',
    'Reason'
  ];

  const rows = auditLogs.map((log) => [
    log.timestamp?.toISOString() || '',
    log.eventType || '',
    log.userEmail || '',
    log.userRole || '',
    log.action || '',
    log.status || '',
    log.ipAddress || '',
    log.resourceId || '',
    log.reason || ''
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
  ].join('\n');

  return csv;
}

/**
 * Get failed login attempts (Security)
 * GET /admin/security/failed-logins
 */
const getFailedLoginAttempts = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const failedLogins = await AuditLog.find({
      eventType: { $in: ['LOGIN_FAILED', 'ACCOUNT_LOCKED'] },
      status: 'FAILURE'
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'name email role');

    const total = await AuditLog.countDocuments({
      eventType: { $in: ['LOGIN_FAILED', 'ACCOUNT_LOCKED'] },
      status: 'FAILURE'
    });

    logger.success(`Admin retrieved ${failedLogins.length} failed login attempts`);

    res.json({
      success: true,
      data: failedLogins,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    logger.error('Get Failed Logins Error:', error.stack);
    res.status(500).json({ error: 'Failed to retrieve failed login attempts.' });
  }
};

/**
 * Get prescription activity
 * GET /admin/prescriptions/activity
 */
const getPrescriptionActivity = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const activity = await AuditLog.find({
      eventType: {
        $in: [
          'PRESCRIPTION_CREATED',
          'PRESCRIPTION_VERIFIED',
          'PRESCRIPTION_DISPENSED',
          'PRESCRIPTION_CANCELLED'
        ]
      }
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'name email role');

    const total = await AuditLog.countDocuments({
      eventType: {
        $in: [
          'PRESCRIPTION_CREATED',
          'PRESCRIPTION_VERIFIED',
          'PRESCRIPTION_DISPENSED',
          'PRESCRIPTION_CANCELLED'
        ]
      }
    });

    logger.success(`Admin retrieved ${activity.length} prescription activities`);

    res.json({
      success: true,
      data: activity,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    logger.error('Get Prescription Activity Error:', error.stack);
    res.status(500).json({ error: 'Failed to retrieve prescription activity.' });
  }
};

module.exports = {
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
};
