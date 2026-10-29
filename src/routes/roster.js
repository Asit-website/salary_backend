const express = require('express');
const { Op } = require('sequelize');
const { StaffRoster, ShiftTemplate, User, StaffProfile, StaffShiftAssignment, Badge, BadgePermission, Attendance, LeaveRequest, StaffHolidayAssignment, HolidayTemplate, HolidayDate, StaffWeeklyOffAssignment, WeeklyOffTemplate, StaffRosterChangeRequest, Notification } = require('../models');
const shiftService = require('../services/shiftService');
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

      // 4. Validation: Maximum Consecutive Working Days (Point 5) - Disabled for now
      /*
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
      */

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

// --- STAFF ROSTER ENDPOINTS ---

// STAFF: Get my monthly roster, upcoming shifts, shift history, and shift timings
router.get('/roster/me', authRequired, requireRole(['staff', 'admin', 'superadmin']), tenantEnforce, async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.tenantOrgAccountId;
    if (!orgId) return res.status(403).json({ success: false, message: 'No organization in context' });

    const monthStr = req.query.month || dayjs().format('YYYY-MM');
    const startOfMonth = dayjs(`${monthStr}-01`).startOf('month');
    const endOfMonth = dayjs(`${monthStr}-01`).endOf('month');
    const startDate = req.query.startDate || startOfMonth.format('YYYY-MM-DD');
    const endDate = req.query.endDate || endOfMonth.format('YYYY-MM-DD');

    const todayStr = dayjs().format('YYYY-MM-DD');

    // 1. Fetch StaffRoster entries in range
    const rosterEntries = await StaffRoster.findAll({
      where: {
        userId,
        orgAccountId: orgId,
        date: { [Op.between]: [startDate, endDate] }
      },
      include: [{ model: ShiftTemplate, as: 'shiftTemplate' }]
    });
    const rosterMap = new Map();
    rosterEntries.forEach(r => rosterMap.set(r.date, r));

    // 2. Fetch approved LeaveRequests in range
    const leaveRequests = await LeaveRequest.findAll({
      where: {
        userId,
        status: 'APPROVED',
        startDate: { [Op.lte]: endDate },
        endDate: { [Op.gte]: startDate }
      }
    });

    // 3. Fetch WeeklyOff assignments
    const woAssignments = await StaffWeeklyOffAssignment.findAll({
      where: { userId },
      include: [{ model: WeeklyOffTemplate, as: 'template' }]
    });

    // 4. Fetch Holiday assignments
    const holidayAssignment = await StaffHolidayAssignment.findOne({
      where: {
        userId,
        effectiveFrom: { [Op.lte]: endDate },
        [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: startDate } }]
      },
      order: [['effectiveFrom', 'DESC']],
      include: [{
        model: HolidayTemplate,
        as: 'template',
        include: [{ model: HolidayDate, as: 'holidays', where: { active: { [Op.ne]: false } }, required: false }]
      }]
    });
    const holidayDates = holidayAssignment?.template?.holidays || [];
    const holidayMap = new Map();
    holidayDates.forEach(h => holidayMap.set(String(h.date), h.name));

    // 5. Fetch all active shift templates for dropdown selection
    const activeShifts = await ShiftTemplate.findAll({
      where: {
        [Op.or]: [{ orgAccountId: orgId }, { orgAccountId: null }],
        active: { [Op.ne]: false }
      },
      order: [['name', 'ASC']]
    });

    // Helper to format time "09:00:00" -> "9:00 AM"
    const formatTimeStr = (t) => {
      if (!t) return '';
      const parts = t.split(':');
      const h = Number(parts[0]);
      const m = Number(parts[1] || 0);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, '0')} ${period}`;
    };

    // 6. Build daily roster schedule
    const days = [];
    const startObj = dayjs(startDate);
    const endObj = dayjs(endDate);
    const totalDaysCount = endObj.diff(startObj, 'day') + 1;

    let summary = {
      totalDutyDays: 0,
      dayShiftsCount: 0,
      nightShiftsCount: 0,
      weeklyOffCount: 0,
      holidayCount: 0,
      leaveCount: 0,
      todayShift: null
    };

    for (let i = 0; i < totalDaysCount; i++) {
      const curDay = startObj.add(i, 'day');
      const dateKey = curDay.format('YYYY-MM-DD');

      let dayType = 'SHIFT'; // 'SHIFT' | 'WEEKLY_OFF' | 'HOLIDAY' | 'LEAVE'
      let shiftObj = null;
      let label = 'Shift';
      let holidayName = null;
      let leaveType = null;

      // 1. Check Roster Override (Highest Priority)
      const rOverride = rosterMap.get(dateKey);
      if (rOverride) {
        if (rOverride.status === 'WEEKLY_OFF') {
          dayType = 'WEEKLY_OFF';
          label = 'Weekly Off';
        } else if (rOverride.status === 'HOLIDAY') {
          dayType = 'HOLIDAY';
          label = 'Holiday';
          holidayName = holidayMap.get(dateKey) || 'Company Holiday';
        } else if (rOverride.status === 'SHIFT' && rOverride.shiftTemplate) {
          dayType = 'SHIFT';
          shiftObj = rOverride.shiftTemplate;
        }
      }

      // 2. If no roster override, check Leave, Holiday, Weekly Off, or Default Shift
      if (!rOverride) {
        // Check Leave
        const matchingLeave = leaveRequests.find(l => dateKey >= l.startDate && dateKey <= l.endDate);
        if (matchingLeave) {
          dayType = 'LEAVE';
          leaveType = matchingLeave.categoryKey || matchingLeave.leaveType || 'Leave';
          label = `Leave (${String(leaveType).toUpperCase()})`;
        } else if (holidayMap.has(dateKey)) {
          dayType = 'HOLIDAY';
          holidayName = holidayMap.get(dateKey);
          label = `Holiday: ${holidayName}`;
        } else {
          // Check Weekly Off
          let isWO = false;
          const targetD = curDay.toDate();
          for (const asg of woAssignments) {
            const ef = new Date(asg.effectiveFrom);
            const et = asg.effectiveTo ? new Date(asg.effectiveTo) : null;
            if (targetD >= ef && (!et || targetD <= et)) {
              let rawConfig = asg.template?.config;
              while (typeof rawConfig === 'string' && rawConfig.trim().startsWith('[')) {
                try { rawConfig = JSON.parse(rawConfig); } catch (_) { break; }
              }
              if (isWeeklyOffForDate(Array.isArray(rawConfig) ? rawConfig : [], targetD)) {
                isWO = true;
                break;
              }
            }
          }

          if (isWO) {
            dayType = 'WEEKLY_OFF';
            label = 'Weekly Off';
          } else {
            // Default shift resolution via shiftService
            shiftObj = await shiftService.getEffectiveShiftTemplate(userId, dateKey);
          }
        }
      }

      // Determine Day vs Night shift
      let isNightShift = false;
      let shiftTypeLabel = 'Day';
      let timingDisplay = '--';

      if (shiftObj) {
        const sTime = shiftObj.startTime || '09:00:00';
        const eTime = shiftObj.endTime || '18:00:00';
        timingDisplay = `${formatTimeStr(sTime)} – ${formatTimeStr(eTime)}`;
        label = shiftObj.name;

        if (sTime >= '18:00:00' || eTime < sTime || String(shiftObj.name).toLowerCase().includes('night')) {
          isNightShift = true;
          shiftTypeLabel = 'Night';
        } else {
          shiftTypeLabel = 'Day';
        }
      }

      // Determine Date Status
      let dateStatus = 'Upcoming';
      if (dateKey === todayStr) dateStatus = 'Today';
      else if (dateKey < todayStr) dateStatus = 'Completed';

      // Update Summary metrics
      if (dayType === 'SHIFT') {
        summary.totalDutyDays++;
        if (isNightShift) summary.nightShiftsCount++;
        else summary.dayShiftsCount++;
      } else if (dayType === 'WEEKLY_OFF') {
        summary.weeklyOffCount++;
      } else if (dayType === 'HOLIDAY') {
        summary.holidayCount++;
      } else if (dayType === 'LEAVE') {
        summary.leaveCount++;
      }

      const dayRecord = {
        date: dateKey,
        dayNum: curDay.date(),
        dayOfWeek: curDay.format('ddd'),
        dayOfWeekFull: curDay.format('dddd'),
        formattedDate: curDay.format('DD MMM YYYY'),
        dayType, // 'SHIFT', 'WEEKLY_OFF', 'HOLIDAY', 'LEAVE'
        shiftId: shiftObj?.id || null,
        shiftName: shiftObj?.name || (dayType === 'WEEKLY_OFF' ? 'Weekly Off' : dayType === 'HOLIDAY' ? `Holiday: ${holidayName}` : dayType === 'LEAVE' ? `Leave (${leaveType})` : 'General Shift'),
        startTime: shiftObj?.startTime || null,
        endTime: shiftObj?.endTime || null,
        time: timingDisplay,
        shiftType: dayType === 'SHIFT' ? shiftTypeLabel : dayType === 'WEEKLY_OFF' ? 'Weekly Off' : dayType === 'HOLIDAY' ? 'Holiday' : 'Leave',
        isNightShift,
        status: dateStatus, // 'Today', 'Upcoming', 'Completed'
        label,
        holidayName,
        leaveType
      };

      if (dateKey === todayStr) {
        summary.todayShift = dayRecord;
      }

      days.push(dayRecord);
    }

    return res.json({
      success: true,
      month: monthStr,
      startDate,
      endDate,
      summary,
      days,
      shifts: activeShifts
    });
  } catch (error) {
    console.error('Error fetching staff roster:', error);
    return res.status(500).json({ success: false, message: 'Failed to load roster schedule' });
  }
});

// STAFF: Submit Roster Change Request
router.post('/roster/request-change', authRequired, requireRole(['staff', 'admin', 'superadmin']), tenantEnforce, async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.tenantOrgAccountId;
    const { date, requestedShiftTemplateId, requestedStatus, reason } = req.body || {};

    if (!date || !reason) {
      return res.status(400).json({ success: false, message: 'date and reason are required' });
    }

    // Resolve current shift for that date
    const currentShift = await shiftService.getEffectiveShiftTemplate(userId, date);

    const changeReq = await StaffRosterChangeRequest.create({
      userId,
      orgAccountId: orgId,
      date,
      currentShiftTemplateId: currentShift?.id || null,
      requestedShiftTemplateId: requestedShiftTemplateId || null,
      requestedStatus: requestedStatus || 'SHIFT',
      reason,
      status: 'PENDING'
    });

    // Notify Admins
    try {
      const staffUser = await User.findOne({
        where: { id: userId },
        include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
      });
      const staffName = staffUser?.profile?.name || 'Staff Member';
      await Notification.create({
        orgAccountId: orgId,
        title: 'Roster Change Request',
        message: `${staffName} has requested a shift change for ${date}.`,
        type: 'roster_request',
        isRead: false
      });
    } catch (_) {}

    return res.json({ success: true, request: changeReq, message: 'Shift change request submitted successfully' });
  } catch (error) {
    console.error('Error submitting roster change request:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit roster change request' });
  }
});

// STAFF: View my roster change requests
router.get('/roster/requests/my', authRequired, requireRole(['staff', 'admin', 'superadmin']), tenantEnforce, async (req, res) => {
  try {
    const requests = await StaffRosterChangeRequest.findAll({
      where: { userId: req.user.id, orgAccountId: req.tenantOrgAccountId },
      include: [
        { model: ShiftTemplate, as: 'currentShift', attributes: ['id', 'name', 'startTime', 'endTime'] },
        { model: ShiftTemplate, as: 'requestedShift', attributes: ['id', 'name', 'startTime', 'endTime'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching my roster requests:', error);
    return res.status(500).json({ success: false, message: 'Failed to load change requests' });
  }
});

// ADMIN: List all change requests
router.get('/admin/roster/requests', authRequired, requireRole(['admin', 'superadmin']), tenantEnforce, async (req, res) => {
  try {
    const requests = await StaffRosterChangeRequest.findAll({
      where: { orgAccountId: req.tenantOrgAccountId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'phone'], include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'staffId'] }] },
        { model: ShiftTemplate, as: 'currentShift', attributes: ['id', 'name', 'startTime', 'endTime'] },
        { model: ShiftTemplate, as: 'requestedShift', attributes: ['id', 'name', 'startTime', 'endTime'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load requests' });
  }
});

// ADMIN: Approve / Reject change request
router.patch('/admin/roster/requests/:id', authRequired, requireRole(['admin', 'superadmin']), tenantEnforce, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be APPROVED or REJECTED' });
    }

    const request = await StaffRosterChangeRequest.findOne({
      where: { id, orgAccountId: req.tenantOrgAccountId }
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    if (status === 'APPROVED') {
      await StaffRoster.upsert({
        userId: request.userId,
        date: request.date,
        shiftTemplateId: request.requestedStatus === 'SHIFT' ? request.requestedShiftTemplateId : null,
        status: request.requestedStatus || 'SHIFT',
        orgAccountId: req.tenantOrgAccountId
      });
      if (request.requestedStatus === 'WEEKLY_OFF') {
        try {
          await Attendance.upsert({
            userId: request.userId,
            date: request.date,
            status: 'weekly_off',
            orgAccountId: req.tenantOrgAccountId
          });
        } catch (_) {}
      }
    }

    await request.update({
      status,
      adminRemarks: adminRemarks || null,
      reviewedBy: req.user.id,
      reviewedAt: new Date()
    });

    return res.json({ success: true, message: `Roster change request ${status.toLowerCase()}` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update request' });
  }
});

module.exports = router;
