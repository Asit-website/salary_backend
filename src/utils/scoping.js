const { StaffBadge, Badge, BadgePermission, BadgeStaffAssignment } = require('../models');

/**
 * Returns a list of staff IDs that the current user is allowed to manage based on their assigned badges.
 * If the user is a SuperAdmin or Admin without specific badge-based scoping, it returns null (indicating all staff).
 * If the user has badges with "Attendance" permission AND specific staff assignments, it returns the limited list of staff IDs.
 * If the user has badges with "Attendance" permission but NO specific staff assignments, it returns null (indicating all staff).
 */
async function getScopedStaffIds(req, orgId) {
  if (!req.user || !orgId) return null;

  // Superadmins and main Admins usually shouldn't be scoped unless they have a badge with staff assignments
  if (req.user.role === 'superadmin') return null;

  // Find all badges assigned to this user
  const staffBadges = await StaffBadge.findAll({
    where: { userId: req.user.id, orgAccountId: orgId, isActive: true },
    include: [{
      model: Badge,
      as: 'badge',
      where: { isActive: true },
      include: [
        { model: BadgePermission, as: 'permissions' },
        { model: BadgeStaffAssignment, as: 'managedStaffAssignments', where: { isActive: true }, required: false }
      ]
    }]
  });

  if (!staffBadges || staffBadges.length === 0) {
    // If no badges assigned, and user is admin, they might still have full access.
    // However, if they are staff-level "admin" (manager), they might have nothing.
    // For this implementation, if no badge is found, we assume no scoping (default behavior).
    return null;
  }

  const allScopedIds = new Set();
  let hasScopingBadge = false;
  let hasUnscopedBadge = false;

  for (const sb of staffBadges) {
    const badge = sb.badge;
    if (!badge) continue;

    // We only care about scoping if the badge has "Attendance" permission
    const hasAttendancePerm = (badge.permissions || []).some(p => p.permissionKey === 'attendance_tab');
    if (!hasAttendancePerm) continue;

    const assignments = badge.managedStaffAssignments || [];
    if (assignments.length > 0) {
      hasScopingBadge = true;
      assignments.forEach(a => allScopedIds.add(a.staffUserId));
    } else {
      // If ANY assigned badge with Attendance perm has NO staff assignments, it means "All Staff"
      hasUnscopedBadge = true;
    }
  }

  // If they have any badge that says "All Staff", return null
  if (hasUnscopedBadge) return null;

  // If they have scoping badges, return the list
  if (hasScopingBadge) return Array.from(allScopedIds);

  // Default: no specific attendance scoping found in their badges
  return null;
}

module.exports = { getScopedStaffIds };
