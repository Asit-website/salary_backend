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
 * Calculates the shift template ID for a given user on a specific date based on active rule and a fixed anchor
 */
function calculateShiftForDate(userId, dateStr, rule, anchor) {
  if (!rule || !rule.active) return null;

  const targetDate = dayjs(dateStr).startOf('day');
  const diffDays = targetDate.diff(anchor, 'day');
  
  // If target date is before the start of the rotation anchor, return start shift
  if (diffDays < 0) {
    return rule.startShiftTemplateId;
  }

  const cycleDays = rule.cycleDays || 15;
  const cycleIndex = Math.floor(diffDays / cycleDays);

  // Even cycle indices (0, 2, 4...) get the start shift.
  // Odd cycle indices (1, 3, 5...) get the alternate shift.
  if (cycleIndex % 2 === 0) {
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

    // Calculate fixed anchor for the entire generation range (prevents resets at month boundaries)
    let anchor = dayjs(rule.anchorDate).startOf('day');
    if (!anchor.isValid()) {
      if (rule.cycleStartType === 'FIRST_MONDAY_OF_MONTH') {
        const startTarget = dayjs(startDateStr).startOf('day');
        anchor = getFirstMondayOfMonth(startTarget.year(), startTarget.month());
      } else {
        anchor = dayjs(startDateStr).startOf('month').startOf('day'); // Fallback
      }
    }
    anchor = anchor.startOf('day');

    let current = start;
    while (current.isBefore(end) || current.isSame(end)) {
      const dateStr = current.format('YYYY-MM-DD');

      for (const staff of staffList) {
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
            rosterEntries.push({
              userId: staff.id,
              date: dateStr,
              shiftTemplateId: null,
              status: 'WEEKLY_OFF',
              orgAccountId
            });
            continue;
          }
        }

        const shiftTemplateId = calculateShiftForDate(staff.id, dateStr, rule, anchor);
        
        if (shiftTemplateId) {
          rosterEntries.push({
            userId: staff.id,
            date: dateStr,
            shiftTemplateId,
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
