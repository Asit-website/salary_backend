const { AuditLog } = require('../models');

/**
 * Log an audit action securely.
 * 
 * @param {Object} params
 * @param {Object} [params.req] - Express request object to auto-extract IP, User, Org, etc.
 * @param {string} params.action - The action category (e.g. 'SALARY_CHANGE', 'LOGIN_SUCCESS', 'ATTENDANCE_EDIT')
 * @param {string} params.remarks - Human-readable description
 * @param {Object} [params.details] - Metadata/diff details of the change
 * @param {Object} [params.overrides] - Custom overrides for userId, orgAccountId, performedBy, ipAddress
 */
async function logAudit({ req, action, remarks, details = null, overrides = {} }) {
  try {
    let userId = overrides.userId || null;
    let orgAccountId = overrides.orgAccountId || null;
    let userPhone = overrides.userPhone || null;
    let performedBy = overrides.performedBy || null;
    let ipAddress = overrides.ipAddress || null;

    // Auto-extract from Request if present
    if (req) {
      // Get IP Address
      ipAddress = ipAddress || 
                  req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                  req.socket.remoteAddress || 
                  req.ip || 
                  '127.0.0.1';

      // Get authenticated user info if req.user is set (via authRequired middleware)
      if (req.user) {
        userId = userId || req.user.id;
        orgAccountId = orgAccountId || req.user.orgAccountId;
        userPhone = userPhone || req.user.phone;
        performedBy = performedBy || req.user.name || `User (${req.user.phone})`;
      }
    }

    // Default defaults
    ipAddress = ipAddress || '127.0.0.1';
    performedBy = performedBy || 'System';

    // Create the AuditLog record asynchronously (don't block the request)
    AuditLog.create({
      userId,
      userPhone,
      orgAccountId,
      ipAddress,
      action,
      performedBy,
      details,
      remarks
    }).catch(err => {
      console.error('[AUDIT LOGGER ERROR] Failed to save audit log:', err);
    });

  } catch (err) {
    console.error('[AUDIT LOGGER ERROR] Uncaught error in logAudit:', err);
  }
}

module.exports = {
  logAudit
};
