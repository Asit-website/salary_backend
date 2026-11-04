const { StaffBadge, Badge, BadgePermission } = require('../models');

async function hasStaffModulePermission(req, permissionKey) {
  if (!req.user) return false;
  const role = req.user.role;
  // Superadmins and Admins have full access
  if (role === 'admin' || role === 'superadmin') return true;
  if (role !== 'staff') return false;

  const orgId = req.tenantOrgAccountId || req.user.orgAccountId;
  if (!orgId) return false;

  try {
    const staffBadges = await StaffBadge.findAll({
      where: { userId: req.user.id, orgAccountId: orgId, isActive: true },
      include: [
        {
          model: Badge,
          as: 'badge',
          where: { isActive: true },
          include: [{ model: BadgePermission, as: 'permissions' }],
        },
      ],
    });

    if (!staffBadges || staffBadges.length === 0) return false;

    const needed = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
    for (const sb of staffBadges) {
      const badge = sb.badge;
      if (!badge) continue;
      const hasPerm = (badge.permissions || []).some((p) =>
        needed.includes(p.permissionKey)
      );
      if (hasPerm) return true;
    }
  } catch (err) {
    console.error('[hasStaffModulePermission] Error checking badges:', err);
  }
  return false;
}

function requireModulePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const allowed = await hasStaffModulePermission(req, permissionKey);
      if (allowed) return next();
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to access this module',
      });
    } catch (err) {
      console.error('[requireModulePermission] Error:', err);
      return res.status(500).json({ success: false, message: 'Permission check error' });
    }
  };
}

module.exports = {
  hasStaffModulePermission,
  requireModulePermission,
};
