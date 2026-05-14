const { sequelize, OvertimeRule, ShiftTemplate, StaffShiftAssignment, User, StaffProfile, StaffRoster, OrgAccount, StaffOvertimeAssignment } = require('../models');
const dayjs = require('dayjs');
const shiftService = require('./shiftService');

/**
 * Calculates overtime based on a specific Rule or fallback ShiftTemplate.
 * 
 * @param {Object} attendance - The attendance record (must have userId, totalWorkHours, etc.)
 * @param {Object} orgAccount - The organization account object (to find activeOvertimeRule)
 * @param {Date} now - Current time for Shift End calculations
 */

/**
 * Helper to find minutes exceeding the threshold based on Calculation Type
 */
async function getOvertimeMinutes(attendance, rule, shiftTemplate) {
  const totalWorkMinutes = Math.floor((attendance.totalWorkHours || 0) * 60);

  // 1. Resolve Threshold (Rule > ShiftTemplate > Calculated Shift Time)
  let baseThreshold = (rule.thresholds && rule.thresholds.length > 0) ? rule.thresholds[0].minMinutes : 0;

  // FALLBACK: If rule threshold is 0/missing, use Shift Template's required work minutes
  // REINFORCEMENT: For calculation types that depend on shift boundaries, 
  // ensure the threshold is at least the shift duration to avoid "ghost" overtime.
  if (shiftTemplate) {
    let shiftWorkMins = 0;
    if (shiftTemplate.workMinutes) {
      shiftWorkMins = shiftTemplate.workMinutes;
    } else if (shiftTemplate.startTime && shiftTemplate.endTime) {
      const [sh, sm] = shiftTemplate.startTime.split(':').map(Number);
      const [eh, em] = shiftTemplate.endTime.split(':').map(Number);
      let startMin = sh * 60 + sm;
      let endMin = eh * 60 + em;
      if (endMin <= startMin) endMin += 1440; // overnight shift
      shiftWorkMins = endMin - startMin;
    }

    // If the rule threshold is missing OR smaller than the shift duration, 
    // we use the shift duration as the baseline payability threshold.
    if (!baseThreshold || (shiftWorkMins > 0 && baseThreshold < shiftWorkMins)) {
      baseThreshold = shiftWorkMins;
    }
  }

  let overtimeByPeriod = 0;
  let overtimeByShift = 0;

  overtimeByPeriod = Math.max(0, totalWorkMinutes - baseThreshold);

  if (attendance.punchedOutAt && shiftTemplate && shiftTemplate.endTime) {
    const [sh, sm] = (shiftTemplate.startTime || '00:00').split(':').map(Number);
    const [eh, em, es] = shiftTemplate.endTime.split(':').map(Number);
    
    // Robust Time Comparison:
    // Build shift start and end times based on the attendance date.
    const punchOutLocal = dayjs(attendance.punchedOutAt);
    const shiftDate = dayjs(attendance.date || attendance.punchedInAt || attendance.punchedOutAt);

    let shiftStartLocal = shiftDate.hour(sh).minute(sm).second(0).millisecond(0);
    let shiftEndLocal = shiftDate.hour(eh).minute(em).second(es || 0).millisecond(0);

    // Overnight logic
    if (shiftEndLocal.isBefore(shiftStartLocal)) {
        shiftEndLocal = shiftEndLocal.add(1, 'day');
    }

    if (punchOutLocal.isAfter(shiftEndLocal)) {
      overtimeByShift = Math.round(punchOutLocal.diff(shiftEndLocal, 'minute', true));
    }

    console.log(`[OvertimeService] Rule ID: ${rule.id}, PO(Local): ${punchOutLocal.format()}, SE(Local): ${shiftEndLocal.format()}, OT: ${overtimeByShift}`);
  }

  console.log(`[OvertimeService] Debug - Total min: ${totalWorkMinutes}, Threshold min: ${baseThreshold}, Shift OT: ${overtimeByShift}, Rule Type: ${rule.calculationType}`);

  switch (rule.calculationType) {
    case 'POST_PAYABLE_HOURS':
      return overtimeByPeriod;
    case 'SHIFT_END':
      return overtimeByShift;
    case 'POST_PAYABLE_HOURS_AND_SHIFT_END':
      return (totalWorkMinutes > baseThreshold && overtimeByShift > 0) ? Math.min(overtimeByPeriod, overtimeByShift) : 0;
    case 'POST_PAYABLE_HOURS_OR_SHIFT_END':
      return Math.max(overtimeByPeriod, overtimeByShift);
    default:
      return overtimeByPeriod;
  }
}

/**
 * Calculates overtime based on a specific Rule or fallback ShiftTemplate.
 */
async function calculateOvertime(params, orgAccountArg, daysInMonthArg = 30, nowArg = null) {
  const attendance = (params.toJSON ? params.toJSON() : params);

  // Robust derivation of totalWorkHours if missing or 0
  let totalWorkHours = Number(attendance.totalWorkHours || 0);
  if (totalWorkHours <= 0 && attendance.punchedInAt && attendance.punchedOutAt) {
    const durMs = new Date(attendance.punchedOutAt) - new Date(attendance.punchedInAt);
    totalWorkHours = Math.max(0, durMs / 3600000);
  }
  attendance.totalWorkHours = totalWorkHours;

  const totalWorkMinutes = Math.floor(totalWorkHours * 60);
  const now = nowArg || new Date();

  // Ensure we have numbers for IDs
  const userId = attendance.userId ? Number(attendance.userId) : null;
  const orgAccountId = attendance.orgAccountId ? Number(attendance.orgAccountId) : (params.orgId ? Number(params.orgId) : null);
  const dateKey = attendance.date || (new Date(now).toISOString().split('T')[0]);

  if (!userId || !orgAccountId) {
    console.log(`[OvertimeService] Missing userId (${userId}) or orgAccountId (${orgAccountId})`);
    return { overtimeMinutes: 0, overtimeAmount: 0, overtimeRuleId: null, status: 'present' };
  }

  // Resolve OrgAccount if missing
  let orgAccount = orgAccountArg;
  if (!orgAccount && orgAccountId) {
    orgAccount = await OrgAccount.findByPk(orgAccountId);
  }

  // 1. Resolve effective Shift Template
  const shiftTemplate = await shiftService.getEffectiveShiftTemplate(userId, dateKey);

  // 2. Resolve Automation Rule (Assignment > Org Default)
  const { Op } = require('sequelize');
  const assignment = await StaffOvertimeAssignment.findOne({
    where: {
      userId,
      orgAccountId,
      effectiveFrom: { [Op.lte]: dateKey }
    },
    order: [['effectiveFrom', 'DESC'], ['id', 'DESC']]
  });

  const ruleId = assignment ? assignment.overtimeRuleId : null;
  console.log(`[OvertimeService] User: ${userId}, Date: ${dateKey}. Assignment Found: ${!!assignment}, RuleID: ${ruleId}`);

  let finalRule = ruleId ? await OvertimeRule.findByPk(ruleId) : null;
  let thresholds = [];

  if (!finalRule) {
    return {
      overtimeMinutes: 0,
      overtimeAmount: 0,
      overtimeRuleId: null,
      status: (!attendance.punchedOutAt) ? 'present' : (shiftTemplate?.halfDayThresholdMinutes && totalWorkMinutes < shiftTemplate.halfDayThresholdMinutes ? 'half_day' : 'present')
    };
  } else {
    // Parse thresholds from the actual rule
    thresholds = finalRule.thresholds || [];
    if (typeof thresholds === 'string') {
      try { thresholds = JSON.parse(thresholds); } catch (e) { thresholds = []; }
    }
  }

  const overtimeMinutes = await getOvertimeMinutes(attendance, { ...(finalRule.toJSON ? finalRule.toJSON() : finalRule), thresholds }, shiftTemplate);

  if (overtimeMinutes <= 0) {
    return {
      overtimeMinutes: 0,
      overtimeAmount: 0,
      overtimeRuleId: (finalRule && finalRule.id) || null,
      status: (!attendance.punchedOutAt) ? 'present' : (shiftTemplate?.halfDayThresholdMinutes && (attendance.totalWorkHours * 60) < shiftTemplate.halfDayThresholdMinutes ? 'half_day' : 'present')
    };
  }

  // 3. Calculate Reward (Amount) based on Tiers
  const sortedTiers = [...(thresholds || [])].sort((a, b) => b.minMinutes - a.minMinutes);
  const tier = sortedTiers.find(t => overtimeMinutes >= t.minMinutes);

  let overtimeAmount = 0;
  const rewardType = tier?.rewardType || (finalRule && finalRule.rewardType);
  const rewardValue = tier?.rewardValue || tier?.value || 0;

  const user = await User.findByPk(userId);
  let sv = {};
  if (user?.salaryValues) {
    try { sv = typeof user.salaryValues === 'string' ? JSON.parse(user.salaryValues) : user.salaryValues; } catch (e) { sv = {}; }
  }
  const basic = Number(user?.basicSalary || 0) || Number(sv?.earnings?.basic_salary || sv?.earnings?.BASIC_SALARY || 0);
  const da = Number(user?.da || 0) || Number(sv?.earnings?.da || sv?.earnings?.DA || 0);
  const baseSalary = basic + da;
  const daysInMonth = daysInMonthArg || 30;

  if (rewardType === 'FIXED_AMOUNT') {
    overtimeAmount = rewardValue;
  } else if (rewardType === 'FIXED_AMOUNT_PER_HOUR') {
    overtimeAmount = (overtimeMinutes / 60) * rewardValue;
  } else if (rewardType === 'SALARY_MULTIPLIER' || rewardType === 'MULTIPLIER') {
    let shiftWorkMins = shiftTemplate?.workMinutes || 0;
    if (!shiftWorkMins && shiftTemplate?.startTime && shiftTemplate?.endTime) {
      const [sh, sm] = shiftTemplate.startTime.split(':').map(Number);
      const [eh, em] = shiftTemplate.endTime.split(':').map(Number);
      let startMin = sh * 60 + sm;
      let endMin = eh * 60 + em;
      if (endMin <= startMin) endMin += 1440;
      shiftWorkMins = endMin - startMin;
    }
    const shiftHours = (shiftWorkMins || 480) / 60;
    let hourlySalary = daysInMonth > 0 ? (baseSalary / (daysInMonth * shiftHours)) : 0;

    // CUSTOM: If user has 'Half Day' bonus enabled at 0 mins, 
    // it implies they want 1 hour of OT to be worth at least half a day (standard in some Indian orgs)
    if (finalRule.giveHalfDayOvertime && Number(finalRule.halfDayThresholdMinutes) === 0) {
      const dailyRate = daysInMonth > 0 ? (baseSalary / daysInMonth) : 0;
      hourlySalary = dailyRate / 2; // 1 hour = 0.5 days
    }

    if (hourlySalary <= 0) {
      console.log(`[OvertimeService] Warning: Salary Multiplier rule used for user ${userId} but no base salary found.`);
      overtimeAmount = 0;
    } else {
      const multiplier = Number(rewardValue) || Number(finalRule.multiplier) || 1;
      overtimeAmount = (hourlySalary * multiplier) * (overtimeMinutes / 60);
    }
  }

  // Handle Half/Full Day Bonuses - These should OVERRIDE the base amount if they result in more pay,
  // or as per user request: "lekin agar 4 hour... to full day milega" implies override.
  if (finalRule && finalRule.id) {
    const dailyRate = daysInMonth > 0 ? (baseSalary / daysInMonth) : 0;

    if (finalRule.giveFullDayOvertime && finalRule.fullDayThresholdMinutes) {
      if (overtimeMinutes >= finalRule.fullDayThresholdMinutes) {
        overtimeAmount = Math.max(overtimeAmount, dailyRate);
      } else if (finalRule.giveHalfDayOvertime && finalRule.halfDayThresholdMinutes) {
        if (overtimeMinutes >= finalRule.halfDayThresholdMinutes) {
          overtimeAmount = Math.max(overtimeAmount, dailyRate / 2);
        }
      }
    } else if (finalRule.giveHalfDayOvertime && finalRule.halfDayThresholdMinutes) {
      if (overtimeMinutes >= finalRule.halfDayThresholdMinutes) {
        overtimeAmount = Math.max(overtimeAmount, dailyRate / 2);
      }
    }
  }

  return {
    overtimeMinutes: Math.floor(overtimeMinutes),
    overtimeAmount: assignment ? parseFloat(overtimeAmount.toFixed(2)) : 0,
    overtimeRuleId: finalRule.id || null,
    status: overtimeMinutes > 0 ? 'overtime' : ((!attendance.punchedOutAt) ? 'present' : (shiftTemplate?.halfDayThresholdMinutes && totalWorkMinutes < shiftTemplate.halfDayThresholdMinutes ? 'half_day' : 'present'))
  };
}

module.exports = {
  calculateOvertime
};