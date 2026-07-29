const { StaffRoster, ShiftRotationGroup, ShiftRotationRule, User, ShiftTemplate, StaffWeeklyOffAssignment, WeeklyOffTemplate } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { isWeeklyOffForDate } = require('../routes/weeklyOff');

/**
 * Helper to calculate the first Monday of the month for a given date (starts at 00:00:00)
 */
function getFirstMondayOfMonth(year, month) {
  // month is 0-indexed (0 = Jan, 11 = Dec)
  let d = dayjs().year(year).month(month).date(1).startOf('day');
  while (d.day() !== 1) { // 1 = Monday
    d = d.add(1, 'day');
  }
  return d;
}

/**
 * Calculates the shift template ID for a given user on a specific date based on active rule and continuous anchor
 */
function calculateShiftForDate(userId, dateStr, rule) {
  if (!rule || !rule.active) return null;

  const targetDate = dayjs(dateStr).startOf('day');
  let anchor = rule.anchorDate ? dayjs(rule.anchorDate).startOf('day') : null;

  if (!anchor || !anchor.isValid()) {
    if (rule.createdAt) {
      anchor = getFirstMondayOfMonth(dayjs(rule.createdAt).year(), dayjs(rule.createdAt).month());
    } else {
      anchor = getFirstMondayOfMonth(targetDate.year(), targetDate.month());
    }
  }

  const diffDays = targetDate.diff(anchor, 'day');
  const cycleDays = rule.cycleDays || 14;
  const cycleIndex = Math.floor(diffDays / cycleDays);

  // Even cycle indices (0, 2, -2...) get the start shift.
  // Odd cycle indices (1, 3, -1...) get the alternate shift.
  if (Math.abs(cycleIndex) % 2 === 0) {
    return rule.startShiftTemplateId;
  } else {
    return rule.alternateShiftTemplateId;
  }
}

/**
 * Generates and commits rotated shifts for all assigned staff in an organization over a date range
 */
async function generateRotatedRoster(orgAccountId, startDateStr, endDateStr) {
  const rules = await ShiftRotationRule.findAll({
    where: { orgAccountId, active: true },
    include: [
      {
        model: ShiftRotationGroup,
        as: 'group',
        where: { active: true },
        include: [
          {
            model: User,
            as: 'staff',
            where: { active: true }
          }
        ]
      }
    ]
  });

  const rosterEntries = [];
  const start = dayjs(startDateStr);
  const end = dayjs(endDateStr);

  for (const rule of rules) {
    const staffList = rule.group?.staff || [];
    if (staffList.length === 0) continue;

    const staffIds = staffList.map(s => s.id);
    const woAssignments = await StaffWeeklyOffAssignment.findAll({
      where: { userId: { [Op.in]: staffIds } },
      include: [{ model: WeeklyOffTemplate, as: 'template' }]
    });

    let current = start;
    while (current.isBefore(end) || current.isSame(end)) {
      const dateStr = current.format('YYYY-MM-DD');

      for (const staff of staffList) {
        const calculatedShift = calculateShiftForDate(staff.id, dateStr, rule);

        if (rule.excludeWeeklyOff) {
          const targetJsDate = new Date(`${dateStr}T00:00:00`);
          let isWo = false;
          
          for (const asg of woAssignments) {
            if (asg.userId === staff.id) {
              const ef = new Date(asg.effectiveFrom);
              const et = asg.effectiveTo ? new Date(asg.effectiveTo) : null;
              if (targetJsDate >= ef && (!et || targetJsDate <= et)) {
                let rawConfig = asg.template?.config;
                while (typeof rawConfig === 'string' && rawConfig.trim().startsWith('[')) {
                  try { rawConfig = JSON.parse(rawConfig); } catch (_) { break; }
                }
                if (isWeeklyOffForDate(Array.isArray(rawConfig) ? rawConfig : [], targetJsDate)) {
                  isWo = true;
                  break;
                }
              }
            }
          }

          if (isWo) {
            const cycleShiftId = rule.attachShiftToWeeklyOff
              ? calculatedShift
              : null;

            rosterEntries.push({
              userId: staff.id,
              date: dateStr,
              shiftTemplateId: cycleShiftId,
              status: 'WEEKLY_OFF',
              orgAccountId
            });
            continue;
          }
        }
        
        if (calculatedShift) {
          rosterEntries.push({
            userId: staff.id,
            date: dateStr,
            shiftTemplateId: calculatedShift,
            status: 'SHIFT',
            orgAccountId
          });
        }
      }
      current = current.add(1, 'day');
    }

    // Bulk upsert roster entries
    if (rosterEntries.length > 0) {
      for (const entry of rosterEntries) {
        const existing = await StaffRoster.findOne({
          where: { userId: entry.userId, date: entry.date, orgAccountId: entry.orgAccountId }
        });

        if (existing) {
          const canOverwrite = existing.status === 'SHIFT' || 
                               (existing.status === 'WEEKLY_OFF' && !rule.excludeWeeklyOff) || 
                               (entry.status === 'WEEKLY_OFF');
          if (canOverwrite) {
            await existing.update({ 
              shiftTemplateId: entry.shiftTemplateId,
              status: entry.status
            });
          }
        } else {
          await StaffRoster.create(entry);
        }
      }
    }
  }

  return { success: true, count: rosterEntries.length };
}

module.exports = {
  getFirstMondayOfMonth,
  calculateShiftForDate,
  generateRotatedRoster
};
