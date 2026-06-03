const express = require('express');
const { Op } = require('sequelize');
const { StaffRoster, ShiftTemplate, User, StaffProfile, StaffShiftAssignment, Badge, BadgePermission, Attendance, LeaveRequest, StaffHolidayAssignment, HolidayDate, StaffWeeklyOffAssignment, WeeklyOffTemplate } = require('../models');
const { authRequired } = require('../middleware/auth');
const dayjs = require('dayjs');
const { isWeeklyOffForDate } = require('./weeklyOff');
const { requireRole } = require('../middleware/roles');
const { tenantEnforce } = require('../middleware/tenant');

const router = express.Router();

async function checkRosterPermission(req) {
  if (req.user?.role === 'admin' || req.user?.role === 'superadmin') return true;
  if (req.user?.role !== 'staff') return false;

  const user = await User.findOne({
    where: { id: req.user.id, orgAccountId: req.tenantOrgAccountId },
    include: [
      {
        model: Badge,
        as: 'badges',
        where: { isActive: true },
        required: false,
        through: { where: { isActive: true }, attributes: [] },
        include: [{
          model: BadgePermission,
          as: 'permissions',
          where: { permissionKey: 'roster_tab' }
        }],
      },
    ],
  });

  const hasPerm = (user?.badges || []).some(b => (b.permissions || []).length > 0);
  return hasPerm;
}

function todayKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateToShort(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleString('default', { month: 'long' });
  let s = 'th';
  if (day === 1 || day === 21 || day === 31) s = 'st';
  else if (day === 2 || day === 22) s = 'nd';
  else if (day === 3 || day === 23) s = 'rd';

  return `${day}${s} ${month}`;
}

function requireOrg(req, res) {
  const orgId = req.tenantOrgAccountId || null;
  if (!orgId || isNaN(orgId)) {
    res.status(403).json({ success: false, message: 'No organization in context' });
    return null;
  }
  return Number(orgId);
}

router.get('/admin/roster/staff', authRequired, requireRole(['admin', 'superadmin', 'staff']), tenantEnforce, async (req, res) => {
  try {
    const hasAccess = await checkRosterPermission(req);
    if (!hasAccess) return res.status(403).json({ success: false, message: 'Forbidden: Roster access required' });

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

router.get('/admin/roster', authRequired, requireRole(['admin', 'superadmin', 'staff']), tenantEnforce, async (req, res) => {
  try {
    const hasAccess = await checkRosterPermission(req);
    if (!hasAccess) return res.status(403).json({ success: false, message: 'Forbidden: Roster access required' });

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

router.post('/admin/roster', authRequired, requireRole(['admin', 'superadmin', 'staff']), tenantEnforce, async (req, res) => {
  try {
    const hasAccess = await checkRosterPermission(req);
    if (!hasAccess) return res.status(403).json({ success: false, message: 'Forbidden: Roster access required' });

    const orgId = requireOrg(req, res); if (!orgId) return;

    const { assessments, isBulk } = req.body; // Array of { userId, date, shiftTemplateId, status }

    if (!Array.isArray(assessments)) {
      return res.status(400).json({ success: false, message: 'assessments array is required' });
    }

    // Create a lookup map for assessments in this request for validation
    const assessmentMap = {};
    assessments.forEach(a => {
      assessmentMap[`${a.userId}_${a.date}`] = a.status;
    });

    for (const item of assessments) {
      const { userId, date, shiftTemplateId, status } = item;

      // 1. Validation: Block if employee is on approved leave (Point 7: Leave vs Roster Sync)
      if (status !== 'DELETE') {
        const overlappingLeave = await LeaveRequest.findOne({
          where: {
            userId,
            status: 'APPROVED',
            startDate: { [Op.lte]: date },
            endDate: { [Op.gte]: date }
          }
        });

        if (overlappingLeave) {
          const fromStr = formatDateToShort(overlappingLeave.startDate);
          const toStr = formatDateToShort(overlappingLeave.endDate);
          return res.status(400).json({
            success: false,
            message: `Cannot assign shift. Employee is on approved leave from ${fromStr} to ${toStr}`
          });
        }
      }

      // 2. Validation: Alert if employee is on Public Holiday (Point 6: Public Holiday Conflict)
      if (status === 'SHIFT' && !req.body.forceHoliday) {
        const assignment = await StaffHolidayAssignment.findOne({
          where: {
            userId,
            effectiveFrom: { [Op.lte]: date },
            [Op.or]: [
              { effectiveTo: null },
              { effectiveTo: { [Op.gte]: date } }
            ]
          },
          order: [['effectiveFrom', 'DESC']]
        });

        if (assignment) {
          const holiday = await HolidayDate.findOne({
            where: {
              holidayTemplateId: assignment.holidayTemplateId,
              date,
              active: true
            }
          });

          if (holiday) {
            return res.status(400).json({
              success: false,
              isHolidayWarning: true,
              message: `Alert: You are assigning a shift on a Public Holiday (${holiday.name}). Special Overtime rates may apply. Do you want to continue?`
            });
          }
        }
      }

      // 2b. Validation: Alert if employee is on Weekly Off
      if (status === 'SHIFT' && !req.body.forceWeeklyOff) {
        const woAssignments = await StaffWeeklyOffAssignment.findAll({
          where: { userId },
          include: [{ model: WeeklyOffTemplate, as: 'template' }]
        });

        const targetDate = new Date(`${date}T00:00:00`);
        let hasWeeklyOffConflict = false;

        for (const asg of woAssignments) {
          const ef = new Date(asg.effectiveFrom);
          const et = asg.effectiveTo ? new Date(asg.effectiveTo) : null;
          if (targetDate >= ef && (!et || targetDate <= et)) {
            let rawConfig = asg.template?.config;
            while (typeof rawConfig === 'string' && rawConfig.trim().startsWith('[')) {
              try { rawConfig = JSON.parse(rawConfig); } catch (_) { break; }
            }
            if (isWeeklyOffForDate(Array.isArray(rawConfig) ? rawConfig : [], targetDate)) {
              hasWeeklyOffConflict = true;
              break;
            }
          }
        }

        if (hasWeeklyOffConflict) {
          return res.status(400).json({
            success: false,
            isWeeklyOffWarning: true,
            message: `Alert: You are assigning a shift on a Weekly Off day. Do you want to continue?`
          });
        }
      }

      // 3. Validation: Rest Period Rule (Point 4 - 11 Hours Gap)
      if (status === 'SHIFT') {
        const currentTemplate = await ShiftTemplate.findByPk(shiftTemplateId);
        if (currentTemplate) {
          const checkGap = async (targetDateStr, isNextDay) => {
            let neighborStatus = assessmentMap[`${userId}_${targetDateStr}`];
            let neighborTemplateId = null;

            if (neighborStatus === undefined) {
              const existing = await StaffRoster.findOne({
                where: { userId, date: targetDateStr, orgAccountId: orgId },
                include: [{ model: ShiftTemplate, as: 'shiftTemplate' }]
              });
              neighborStatus = existing?.status || 'SHIFT'; // Default to shift if not in roster
              neighborTemplateId = existing?.shiftTemplateId;

              // If no roster record, check StaffShiftAssignment or default
              if (!existing) {
                const user = await User.findByPk(userId);
                neighborTemplateId = user?.shiftTemplateId;
              }
            } else if (neighborStatus === 'SHIFT') {
              // Get from assessmentMap if available, but we need templateId
              const itemInBatch = assessments.find(a => a.userId === userId && a.date === targetDateStr);
              neighborTemplateId = itemInBatch?.shiftTemplateId;
            }

            if (neighborStatus === 'SHIFT' && neighborTemplateId) {
              const neighborTemplate = await ShiftTemplate.findByPk(neighborTemplateId);
              if (neighborTemplate) {
                // Calculate absolute times
                const getTimes = (dStr, temp) => {
                  const start = dayjs(`${dStr} ${temp.startTime}`);
                  let end = dayjs(`${dStr} ${temp.endTime}`);
                  if (end.isBefore(start)) end = end.add(1, 'day'); // Night shift
                  return { start, end };
                };

                const currentTimes = getTimes(date, currentTemplate);
                const neighborTimes = getTimes(targetDateStr, neighborTemplate);

                let gapHours = 0;
                if (isNextDay) {
                  // Current End vs Next Start
                  gapHours = neighborTimes.start.diff(currentTimes.end, 'hour', true);
                } else {
                  // Prev End vs Current Start
                  gapHours = currentTimes.start.diff(neighborTimes.end, 'hour', true);
                }

                if (gapHours >= 0 && gapHours < 11) {
                  return { invalid: true, gap: gapHours.toFixed(1) };
                }
              }
            }
            return { invalid: false };
          };

          // Check Previous Day
          const prevDateStr = dayjs(date).subtract(1, 'day').format('YYYY-MM-DD');
          const prevResult = await checkGap(prevDateStr, false);
          if (prevResult.invalid) {
            return res.status(400).json({
              success: false,
              message: `Insufficient Rest Period! Employee needs at least 11 hours of break between shifts. (Current gap with previous day: ${prevResult.gap} hours)`
            });
          }

          // Check Next Day
          const nextDateStr = dayjs(date).add(1, 'day').format('YYYY-MM-DD');
          const nextResult = await checkGap(nextDateStr, true);
          if (nextResult.invalid) {
            return res.status(400).json({
              success: false,
              message: `Insufficient Rest Period! Employee needs at least 11 hours of break between shifts. (Current gap with next day: ${nextResult.gap} hours)`
            });
          }
        }
      }

      // 4. Validation: Maximum Consecutive Working Days (Point 5)
      if (status === 'SHIFT') {
        let consecutiveDays = 0;
        let hasWO = false;

        // Check the 6 days prior to the current date
        const currentDate = new Date(date);
        for (let i = 1; i <= 6; i++) {
          const prevDate = new Date(currentDate);
          prevDate.setDate(currentDate.getDate() - i);
          const prevDateStr = prevDate.toISOString().split('T')[0];

          // Check in current request first, then in DB
          let prevStatus = assessmentMap[`${userId}_${prevDateStr}`];
          if (!prevStatus) {
            const existing = await StaffRoster.findOne({
              where: { userId, date: prevDateStr, orgAccountId: orgId }
            });
            prevStatus = existing?.status;
          }

          if (prevStatus === 'WEEKLY_OFF') {
            hasWO = true;
            break;
          }
        }

        if (!hasWO) {
          // If we reached here, it means no WO was found in the last 6 days
          // Now check if those 6 days were actually shifts (to confirm consecutive working)
          // Actually, the rule says "cannot work more than 6 days", so if all 6 were shifts, block.
          let shiftsInRow = 0;
          for (let i = 1; i <= 6; i++) {
            const prevDate = new Date(currentDate);
            prevDate.setDate(currentDate.getDate() - i);
            const prevDateStr = prevDate.toISOString().split('T')[0];

            let prevStatus = assessmentMap[`${userId}_${prevDateStr}`];
            if (!prevStatus) {
              const existing = await StaffRoster.findOne({
                where: { userId, date: prevDateStr, orgAccountId: orgId }
              });
              prevStatus = existing?.status;
            }
            if (prevStatus === 'SHIFT') {
              shiftsInRow++;
            } else {
              // If it's WEEKLY_OFF, HOLIDAY, or Blank (not assigned), it's not a consecutive work day
              break;
            }
          }

          if (shiftsInRow >= 6) {
            return res.status(400).json({
              success: false,
              message: "Policy Violation: Employee cannot work more than 6 consecutive days without a Weekly Off."
            });
          }
        }
      }

      /*
      // 4. Validation: Block roster change if staff is already present
      const attendance = await Attendance.findOne({
        where: { userId, date, orgAccountId: orgId }
      });

      if (attendance && attendance.punchedInAt) {
        if (isBulk) {
          const staff = await User.findOne({
            where: { id: userId },
            include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
          });
          const staffName = staff?.profile?.name || 'Staff';
          const [y, m, d] = date.split('-');
          const formattedDate = `${d}-${m}-${y}`;

          return res.status(400).json({
            success: false,
            message: `THIS STAFF ${staffName.toUpperCase()} IS PRESENT ON THIS DATE ${formattedDate} SO PLEASE CHANGE RANGE`
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'This staff present today so can not assign roster'
          });
        }
      }
      */

      if (status === 'DELETE') {
        // Find existing roster to check status before delete
        const existing = await StaffRoster.findOne({ where: { userId, date, orgAccountId: orgId } });
        if (existing && (existing.status === 'WEEKLY_OFF' || existing.status === 'HOLIDAY')) {
          // Also remove from attendance if it was synced as WO/Holiday
          const att = await Attendance.findOne({ where: { userId, date, orgAccountId: orgId } });
          if (att && (att.status === 'weekly_off' || att.status === 'holiday')) {
            await Attendance.destroy({ where: { id: att.id } });
          }
        }
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

      // Sync to Attendance for WEEKLY_OFF and HOLIDAY
      if (status === 'WEEKLY_OFF' || status === 'HOLIDAY') {
        const attStatus = status === 'WEEKLY_OFF' ? 'weekly_off' : 'holiday';
        await Attendance.upsert({
          userId,
          date,
          status: attStatus,
          orgAccountId: orgId,
          source: 'roster'
        });
      } else if (status === 'SHIFT') {
        // If we assigned a shift, and there was a WO/Holiday attendance record, we might want to clear it?
        // But better leave it as is if it's already present/absent.
        // However, if it was 'weekly_off' from a previous roster assignment, we should probably clear it.
        const att = await Attendance.findOne({ where: { userId, date, orgAccountId: orgId } });
        if (att && (att.status === 'weekly_off' || att.status === 'holiday') && att.source === 'roster') {
          await Attendance.destroy({ where: { id: att.id } });
        }
      }
    }

    return res.json({ success: true, message: 'Roster updated successfully' });
  } catch (error) {
    console.error('Error saving roster:', error);
    return res.status(500).json({ success: false, message: 'Failed to save roster' });
  }
});

module.exports = router;

module.exports = router;
