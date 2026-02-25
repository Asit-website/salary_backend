const express = require('express');
const { Op } = require('sequelize');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');
const { Badge, BadgePermission, StaffBadge, User, StaffProfile, OrgBrand, OrgBusinessInfo } = require('../models');

const router = express.Router();

const SIDEBAR_PERMISSION_OPTIONS = [
  { key: 'dashboard_tab', label: 'Dashboard' },
  { key: 'staff_management_tab', label: 'Staff Management' },
  { key: 'attendance_tab', label: 'Attendance' },
  { key: 'payroll_tab', label: 'Payroll' },
  { key: 'loans_tab', label: 'Loans' },
  { key: 'sales_tab', label: 'Sales' },
  { key: 'reports_tab', label: 'Reports' },
  { key: 'assets_tab', label: 'Assets' },
  { key: 'expenses_tab', label: 'Expenses' },
  { key: 'geolocation_tab', label: 'Geolocation' },
  { key: 'letters_tab', label: 'Letters' },
  { key: 'settings_tab', label: 'Settings' },
];

const permissionMap = new Map(SIDEBAR_PERMISSION_OPTIONS.map((x) => [x.key, x.label]));

function requireAdmin(req, res, next) {
  if (req.user?.role === 'admin' || req.user?.role === 'superadmin') return next();
  return res.status(403).json({ success: false, message: 'Admin access required' });
}

router.get('/permission-options', authRequired, tenantEnforce, async (_req, res) => {
  return res.json({ success: true, options: SIDEBAR_PERMISSION_OPTIONS });
});

router.get('/sidebar-brand', authRequired, tenantEnforce, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const brandRow = await OrgBrand.findOne({
      where: { orgAccountId, active: true },
      order: [['updatedAt', 'DESC']],
    });
    const infoRow = await OrgBusinessInfo.findOne({
      where: { orgAccountId, active: true },
      order: [['updatedAt', 'DESC']],
    });
    return res.json({
      success: true,
      brand: {
        displayName: brandRow?.displayName || '',
      },
      info: {
        logoUrl: infoRow?.logoUrl || '',
        sidebarHeaderType: infoRow?.sidebarHeaderType || 'name',
      },
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Failed to load sidebar brand info' });
  }
});

router.get('/badges', authRequired, tenantEnforce, requireAdmin, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const badges = await Badge.findAll({
      where: { orgAccountId, isActive: true },
      include: [{ model: BadgePermission, as: 'permissions' }],
      order: [['name', 'ASC']],
    });
    return res.json({ success: true, badges });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load badges' });
  }
});

router.post('/badges', authRequired, tenantEnforce, requireAdmin, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const { name, description, permissionKeys } = req.body || {};
    const cleanName = String(name || '').trim();
    const keys = Array.isArray(permissionKeys) ? permissionKeys.filter((k) => permissionMap.has(k)) : [];

    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Badge name is required' });
    }
    if (keys.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one permission' });
    }

    const existing = await Badge.findOne({ where: { orgAccountId, name: cleanName, isActive: true } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Badge name already exists' });
    }

    const badge = await Badge.create({
      orgAccountId,
      name: cleanName,
      description: description || null,
      isActive: true,
      createdById: req.user?.id || null,
      updatedById: req.user?.id || null,
    });

    await BadgePermission.bulkCreate(
      keys.map((key) => ({
        orgAccountId,
        badgeId: badge.id,
        permissionKey: key,
        permissionLabel: permissionMap.get(key),
      }))
    );

    const created = await Badge.findByPk(badge.id, {
      include: [{ model: BadgePermission, as: 'permissions' }],
    });

    return res.status(201).json({ success: true, badge: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create badge' });
  }
});

router.put('/badges/:id', authRequired, tenantEnforce, requireAdmin, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const badgeId = Number(req.params.id);
    const { name, description, permissionKeys } = req.body || {};
    const cleanName = String(name || '').trim();
    const keys = Array.isArray(permissionKeys) ? permissionKeys.filter((k) => permissionMap.has(k)) : [];

    const badge = await Badge.findOne({ where: { id: badgeId, orgAccountId, isActive: true } });
    if (!badge) return res.status(404).json({ success: false, message: 'Badge not found' });

    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Badge name is required' });
    }
    if (keys.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one permission' });
    }

    const duplicate = await Badge.findOne({
      where: { orgAccountId, isActive: true, name: cleanName, id: { [Op.ne]: badgeId } },
    });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Badge name already exists' });
    }

    await badge.update({
      name: cleanName,
      description: description || null,
      updatedById: req.user?.id || null,
    });

    await BadgePermission.destroy({ where: { orgAccountId, badgeId } });
    await BadgePermission.bulkCreate(
      keys.map((key) => ({
        orgAccountId,
        badgeId,
        permissionKey: key,
        permissionLabel: permissionMap.get(key),
      }))
    );

    const updated = await Badge.findByPk(badgeId, {
      include: [{ model: BadgePermission, as: 'permissions' }],
    });
    return res.json({ success: true, badge: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update badge' });
  }
});

router.delete('/badges/:id', authRequired, tenantEnforce, requireAdmin, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const badgeId = Number(req.params.id);
    const badge = await Badge.findOne({ where: { id: badgeId, orgAccountId, isActive: true } });
    if (!badge) return res.status(404).json({ success: false, message: 'Badge not found' });

    const assignedCount = await StaffBadge.count({
      where: { orgAccountId, badgeId, isActive: true },
    });
    if (assignedCount > 0) {
      return res.status(400).json({ success: false, message: 'Badge already assigned to staff' });
    }

    await BadgePermission.destroy({ where: { orgAccountId, badgeId } });
    await badge.update({ isActive: false, updatedById: req.user?.id || null });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete badge' });
  }
});

router.get('/staff', authRequired, tenantEnforce, requireAdmin, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const staff = await User.findAll({
      where: { orgAccountId, role: 'staff', active: true },
      include: [
        { model: StaffProfile, as: 'profile' },
        {
          model: Badge,
          as: 'badges',
          where: { isActive: true },
          required: false,
          through: { where: { isActive: true }, attributes: [] },
        },
      ],
      order: [[{ model: StaffProfile, as: 'profile' }, 'name', 'ASC']],
    });
    return res.json({ success: true, staff });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load staff' });
  }
});

router.post('/assign-badges', authRequired, tenantEnforce, requireAdmin, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const userId = Number(req.body?.userId);
    const badgeIds = Array.isArray(req.body?.badgeIds) ? req.body.badgeIds.map(Number).filter(Number.isFinite) : [];

    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid staff user' });
    }

    const user = await User.findOne({ where: { id: userId, orgAccountId, role: 'staff', active: true } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });

    if (badgeIds.length > 0) {
      const badgeCount = await Badge.count({ where: { id: badgeIds, orgAccountId, isActive: true } });
      if (badgeCount !== badgeIds.length) {
        return res.status(400).json({ success: false, message: 'One or more badges are invalid' });
      }
    }

    await StaffBadge.destroy({ where: { orgAccountId, userId } });
    if (badgeIds.length > 0) {
      await StaffBadge.bulkCreate(
        badgeIds.map((badgeId) => ({
          orgAccountId,
          userId,
          badgeId,
          assignedById: req.user?.id || null,
          isActive: true,
        }))
      );
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to assign badges' });
  }
});

router.get('/my-sidebar-permissions', authRequired, tenantEnforce, async (req, res) => {
  try {
    if (req.user?.role === 'admin' || req.user?.role === 'superadmin') {
      return res.json({
        success: true,
        permissionKeys: SIDEBAR_PERMISSION_OPTIONS.map((x) => x.key),
        badges: [],
      });
    }

    const orgAccountId = req.tenantOrgAccountId;
    const user = await User.findOne({
      where: { id: req.user?.id, orgAccountId },
      include: [
        {
          model: Badge,
          as: 'badges',
          where: { isActive: true },
          required: false,
          through: { where: { isActive: true }, attributes: [] },
          include: [{ model: BadgePermission, as: 'permissions' }],
        },
      ],
    });

    const keySet = new Set();
    const badges = user?.badges || [];
    badges.forEach((badge) => {
      (badge.permissions || []).forEach((perm) => {
        if (permissionMap.has(perm.permissionKey)) keySet.add(perm.permissionKey);
      });
    });

    return res.json({
      success: true,
      permissionKeys: Array.from(keySet),
      badges: badges.map((b) => ({ id: b.id, name: b.name })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load sidebar permissions' });
  }
});

module.exports = router;
