const express = require('express');
const { Op } = require('sequelize');
const { ShiftRotationGroup, ShiftRotationRule, User, StaffProfile, ShiftTemplate } = require('../models');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');
const rotationService = require('../services/rotationService');

const router = express.Router();

router.use(authRequired);
router.use(tenantEnforce);

/**
 * GET /admin/shift-rotation/groups
 * Fetch all groups, automatically initializing 'Group A' and 'Group B' if they do not exist.
 */
router.get('/groups', async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;

    // Check if Group A and Group B exist
    let groupA = await ShiftRotationGroup.findOne({
      where: { orgAccountId, name: 'Group A' }
    });
    let groupB = await ShiftRotationGroup.findOne({
      where: { orgAccountId, name: 'Group B' }
    });

    if (!groupA) {
      groupA = await ShiftRotationGroup.create({
        orgAccountId,
        name: 'Group A',
        active: true
      });
    }
    if (!groupB) {
      groupB = await ShiftRotationGroup.create({
        orgAccountId,
        name: 'Group B',
        active: true
      });
    }

    // Now fetch all groups with their assigned staff
    const groups = await ShiftRotationGroup.findAll({
      where: { orgAccountId, active: true },
      include: [
        {
          model: User,
          as: 'staff',
          where: { active: true },
          required: false,
          attributes: ['id', 'phone', 'role'],
          include: [
            {
              model: StaffProfile,
              as: 'profile',
              attributes: ['name', 'staffId']
            }
          ]
        }
      ],
      order: [['name', 'ASC']]
    });

    // Also fetch all staff members in the organization who are NOT assigned to any rotation group,
    // so the UI transfer list/shuttle can display them as "Available Staff".
    const unassignedStaff = await User.findAll({
      where: {
        orgAccountId,
        role: 'staff',
        active: true,
        shiftRotationGroupId: null
      },
      attributes: ['id', 'phone', 'role'],
      include: [
        {
          model: StaffProfile,
          as: 'profile',
          attributes: ['name', 'staffId']
        }
      ]
    });

    return res.json({
      success: true,
      groups,
      unassignedStaff
    });
  } catch (error) {
    console.error('Error fetching shift rotation groups:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch shift rotation groups' });
  }
});

/**
 * POST /admin/shift-rotation/groups/assign
 * Bulk assign userIds to a specific group, or clear them.
 */
router.post('/groups/assign', async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const { userIds, shiftRotationGroupId } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ success: false, message: 'userIds must be an array' });
    }

    // If a group ID is provided, verify it belongs to this organization
    if (shiftRotationGroupId) {
      const group = await ShiftRotationGroup.findOne({
        where: { id: shiftRotationGroupId, orgAccountId }
      });
      if (!group) {
        return res.status(404).json({ success: false, message: 'Shift rotation group not found' });
      }
    }

    // Update users matching the array to the new group
    await User.update(
      { shiftRotationGroupId: shiftRotationGroupId || null },
      {
        where: {
          id: { [Op.in]: userIds },
          orgAccountId,
          role: 'staff'
        }
      }
    );

    return res.json({ success: true, message: 'Staff group assignments updated successfully' });
  } catch (error) {
    console.error('Error assigning staff to rotation group:', error);
    return res.status(500).json({ success: false, message: 'Failed to update staff assignments' });
  }
});

/**
 * GET /admin/shift-rotation/rules
 * Fetch all rotation rules configured in this tenant
 */
router.get('/rules', async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;

    const rules = await ShiftRotationRule.findAll({
      where: { orgAccountId },
      include: [
        {
          model: ShiftRotationGroup,
          as: 'group',
          attributes: ['id', 'name']
        },
        {
          model: ShiftTemplate,
          as: 'startShift',
          attributes: ['id', 'name', 'startTime', 'endTime']
        },
        {
          model: ShiftTemplate,
          as: 'alternateShift',
          attributes: ['id', 'name', 'startTime', 'endTime']
        }
      ]
    });

    return res.json({ success: true, rules });
  } catch (error) {
    console.error('Error fetching shift rotation rules:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch shift rotation rules' });
  }
});

/**
 * POST /admin/shift-rotation/rules
 * Upsert a rotation configuration rule for a group.
 */
router.post('/rules', async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const {
      shiftRotationGroupId,
      startShiftTemplateId,
      alternateShiftTemplateId,
      cycleDays,
      cycleStartType,
      excludeWeeklyOff,
      anchorDate,
      active
    } = req.body;

    if (!shiftRotationGroupId || !startShiftTemplateId || !alternateShiftTemplateId) {
      return res.status(400).json({
        success: false,
        message: 'shiftRotationGroupId, startShiftTemplateId, and alternateShiftTemplateId are required'
      });
    }

    // Verify group belongs to this organization
    const group = await ShiftRotationGroup.findOne({
      where: { id: shiftRotationGroupId, orgAccountId }
    });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Shift rotation group not found' });
    }

    // Verify shift templates belong to this organization (or are valid)
    const templatesCount = await ShiftTemplate.count({
      where: {
        id: { [Op.in]: [startShiftTemplateId, alternateShiftTemplateId] },
        orgAccountId
      }
    });
    if (templatesCount < 2 && startShiftTemplateId !== alternateShiftTemplateId) {
      return res.status(400).json({ success: false, message: 'Invalid shift templates selected' });
    }

    // Find existing rule or build new one
    let rule = await ShiftRotationRule.findOne({
      where: { shiftRotationGroupId, orgAccountId }
    });

    const ruleData = {
      orgAccountId,
      shiftRotationGroupId,
      startShiftTemplateId,
      alternateShiftTemplateId,
      cycleDays: Number(cycleDays || 14),
      cycleStartType: cycleStartType || 'FIRST_MONDAY_OF_MONTH',
      excludeWeeklyOff: excludeWeeklyOff !== undefined ? !!excludeWeeklyOff : true,
      anchorDate: anchorDate || null,
      active: active !== undefined ? !!active : true
    };

    if (rule) {
      await rule.update(ruleData);
    } else {
      rule = await ShiftRotationRule.create(ruleData);
    }

    return res.json({ success: true, rule, message: 'Rotation rule saved successfully' });
  } catch (error) {
    console.error('Error saving shift rotation rule:', error);
    return res.status(500).json({ success: false, message: 'Failed to save shift rotation rule' });
  }
});

/**
 * POST /admin/shift-rotation/generate
 * Manually trigger rotation calculation and bulk-upsert staff rosters.
 */
router.post('/generate', async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    console.log(`Running manual rotation generation for org: ${orgAccountId} from ${startDate} to ${endDate}`);
    const result = await rotationService.generateRotatedRoster(orgAccountId, startDate, endDate);

    return res.json({
      success: true,
      message: `Rotation patterns generated successfully! Processed roster assignments.`,
      count: result.count
    });
  } catch (error) {
    console.error('Error generating rotated roster:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate rotated roster: ' + error.message });
  }
});

module.exports = router;
