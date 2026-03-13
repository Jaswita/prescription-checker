// ============================================
// ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE
// Enforces role-based permissions
// LAB MARK: Access Control Model & Policy
// ============================================

/**
 * RBAC Policy Definition
 * LAB MARK: Policy Definition for Access Control
 * 
 * Doctor   -> Create & Sign Prescriptions
 * Pharmacy -> Verify & Dispense Prescriptions
 * Patient  -> View Own Prescriptions
 * Admin    -> Manage Users, View Logs, Full Access
 */

const ROLE_PERMISSIONS = {
  doctor: [
    'prescription:create',
    'prescription:sign',
    'prescription:view_own',
    'prescription:list_issued'
  ],
  pharmacy: [
    'prescription:verify',
    'prescription:dispense',
    'prescription:view_for_dispense',
    'controlled_substance:log'
  ],
  patient: [
    'prescription:view_own',
    'prescription:download',
    'prescription:verify_qr'
  ],
  admin: [
    'user:create',
    'user:update',
    'user:delete',
    'user:list',
    'user:lock',
    'user:unlock',
    'logs:view',
    'logs:security',
    'prescription:view_all',
    'analytics:view'
  ]
};

/**
 * Middleware to check if user has required role
 * @param {...string} allowedRoles - Roles allowed to access the route
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.userRole) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.userRole)) {
      // LAB MARK: Security Logging for unauthorized access attempts
      console.log(`[SECURITY] Unauthorized access attempt by ${req.user.email} (${req.userRole}) to ${req.originalUrl}`);
      
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        yourRole: req.userRole
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has specific permission
 * @param {string} permission - Required permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.userRole) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    const userPermissions = ROLE_PERMISSIONS[req.userRole] || [];
    
    if (!userPermissions.includes(permission)) {
      console.log(`[SECURITY] Permission denied: ${req.user.email} lacks '${permission}'`);
      
      return res.status(403).json({ 
        error: 'Access denied. Missing required permission.',
        code: 'MISSING_PERMISSION',
        requiredPermission: permission
      });
    }

    next();
  };
};

/**
 * Get permissions for a role
 * @param {string} role - User role
 * @returns {array} - List of permissions
 */
const getPermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

module.exports = { 
  requireRole, 
  requirePermission, 
  getPermissions,
  ROLE_PERMISSIONS 
};
