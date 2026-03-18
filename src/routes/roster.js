const express = require('express');
const { Op } = require('sequelize');
const { StaffRoster, ShiftTemplate, User, StaffProfile, StaffShiftAssignment } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { tenantEnforce } = require('../middleware/tenant');

const router = express.Router();

function todayKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function requireOrg(req, res) {
  const orgId = req.tenantOrgAccountId || null;
  if (!orgId || isNaN(orgId)) {
    res.status(403).json({ success: false, message: 'No organization in context' });
    return null;
  }
  return Number(orgId);
}

router.use(authRequired);
router.use(requireRole(['admin', 'superadmin', 'staff']));
router.use(tenantEnforce);

router.get('/admin/roster/staff', async (req, res) => {
  try {
    if (req.user?.role === 'staff') return res.status(403).json({ success: false, message: 'Forbidden' });
    const orgId = requireOrg(req, res); if (!orgId) return;

    const dateKey = todayKey();

    const staff = await User.findAll({
      where: { orgAccountId: orgId, role: 'staff', active: true },
      include: [
        { model: StaffProfile, as: 'profile', attributes: ['name', 'phone', 'designation'] },
        { model: ShiftTemplate, as: 'shiftTemplate', attributes: ['id', 'name', 'startTime', 'endTime'] },
        {
          model: StaffShiftAssignment,
          as: 'shiftAssignments',
          where: {
            effectiveFrom: { [Op.lte]: dateKey },
            [Op.or]: [
              { effectiveTo: null },
              { effectiveTo: { [Op.gte]: dateKey } }
            ]
          },
          required: false,
          include: [{ model: ShiftTemplate, as: 'template', attributes: ['id', 'name', 'startTime', 'endTime'] }],
          order: [['effectiveFrom', 'DESC']]
        }
      ],
      attributes: ['id', 'phone', 'shiftTemplateId']
    });

    const formattedStaff = staff.map(u => {
      // Logic to pick the best shift
      let effectiveShift = null;

      // 1. Check StaffShiftAssignment (from include)
      if (u.shiftAssignments && u.shiftAssignments.length > 0) {
        // Sort specifically in JS if ordering in include is tricky
        const assignments = [...u.shiftAssignments].sort((a, b) => 
          new Date(b.effectiveFrom) - new Date(a.effectiveFrom)
        );
        effectiveShift = assignments[0].template;
      }

      // 2. Fallback to User.shiftTemplate or profile
      if (!effectiveShift) {
        effectiveShift = u.shiftTemplate;
      }

      return {
        id: u.id,
        phone: u.phone,
        profile: u.profile,
        shiftTemplate: effectiveShift ? {
          id: effectiveShift.id,
          name: effectiveShift.name,
          startTime: effectiveShift.startTime,
          endTime: effectiveShift.endTime
        } : null
      };
    });

    return res.json({ success: true, staff: formattedStaff });
  } catch (error) {
    console.error('Error fetching roster staff:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch roster staff' });
  }
});

router.get('/admin/roster', async (req, res) => {
  try {
    if (req.user?.role === 'staff') return res.status(403).json({ success: false, message: 'Forbidden' });
    const orgId = requireOrg(req, res); if (!orgId) return;
    
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const roster = await StaffRoster.findAll({
      where: {
        orgAccountId: orgId,
        date: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: ShiftTemplate, as: 'shiftTemplate', attributes: ['id', 'name', 'startTime', 'endTime'] }
      ]
    });

    return res.json({ success: true, roster });
  } catch (error) {
    console.error('Error fetching roster:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch roster' });
  }
});

router.post('/admin/roster', async (req, res) => {
  try {
    if (req.user?.role === 'staff') return res.status(403).json({ success: false, message: 'Forbidden' });
    const orgId = requireOrg(req, res); if (!orgId) return;

    const { assessments } = req.body; // Array of { userId, date, shiftTemplateId, status }

    if (!Array.isArray(assessments)) {
      return res.status(400).json({ success: false, message: 'assessments array is required' });
    }

    for (const item of assessments) {
      const { userId, date, shiftTemplateId, status } = item;
      
      if (status === 'DELETE') {
        await StaffRoster.destroy({ where: { userId, date, orgAccountId: orgId } });
        continue;
      }

      // Upsert roster entry
      await StaffRoster.upsert({
        userId,
        date,
        shiftTemplateId: status === 'SHIFT' ? shiftTemplateId : null,
        status: status || 'SHIFT',
        orgAccountId: orgId
      });
    }

    return res.json({ success: true, message: 'Roster updated successfully' });
  } catch (error) {
    console.error('Error saving roster:', error);
    return res.status(500).json({ success: false, message: 'Failed to save roster' });
  }
});

module.exports = router;
