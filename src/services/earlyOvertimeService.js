const dayjs = require('dayjs');
const { sequelize, EarlyOvertimeRule, ShiftTemplate, StaffShiftAssignment, User, StaffProfile, StaffRoster, OrgAccount, StaffEarlyOvertimeAssignment } = require('../models');
const shiftService = require('./shiftService');
const { getSettingsPayableDays } = require('../utils/salarySettingsHelper');


/**
 * Helper to find minutes worked before shift start.
 */
async function getEarlyOvertimeMinutes(attendance, rule, shiftTemplate) {
  // Explicitly skip for Open Shifts (no fixed start time, early OT doesn't apply)
  if (!attendance.punchedInAt || !shiftTemplate || shiftTemplate.shiftType === 'open' || !shiftTemplate.startTime) {
    return 0;
  }

  const punchInLocal = dayjs(attendance.punchedInAt).second(0).millisecond(0);
  const [sh, sm, ss] = shiftTemplate.startTime.split(':').map(Number);
  
  // Use the attendance dateKey as the base for the shift start
  const shiftDate = dayjs(attendance.date || attendance.punchedInAt);
  const shiftStartLocal = shiftDate.hour(sh).minute(sm).second(ss || 0).millisecond(0);

  if (punchInLocal.isBefore(shiftStartLocal)) {
    const earlyMin = shiftStartLocal.diff(punchInLocal, 'minute');

    // Check against minimum threshold for Early OT to count (fallback to 0)
    const baseThreshold = (rule.thresholds && rule.thresholds.length > 0) ? rule.thresholds[0].minMinutes : 0;

    if (earlyMin >= baseThreshold) {
      return earlyMin;
    }
  }

  return 0;
}

/**
 * Calculates early overtime based on a specific Rule or fallback ShiftTemplate.
 */
async function calculateEarlyOvertime(params, orgAccountArg, daysInMonthArg = 30, nowArg = null) {
  const attendance = (params.toJSON ? params.toJSON() : params);
  const now = nowArg || new Date();

  const userId = attendance.userId ? Number(attendance.userId) : null;
  const orgAccountId = attendance.orgAccountId ? Number(attendance.orgAccountId) : (params.orgId ? Number(params.orgId) : null);
  const dateKey = attendance.date || (new Date(now).toISOString().split('T')[0]);

  if (!userId || !orgAccountId) {
    return { earlyOvertimeMinutes: 0, earlyOvertimeAmount: 0, earlyOvertimeRuleId: null };
  }

  let orgAccount = orgAccountArg;
  if (!orgAccount && orgAccountId) {
    orgAccount = await OrgAccount.findByPk(orgAccountId);
  }

  const shiftTemplate = await shiftService.getEffectiveShiftTemplate(userId, dateKey);

  const { Op } = require('sequelize');
  const assignment = await StaffEarlyOvertimeAssignment.findOne({
    where: {
      userId,
      orgAccountId,
      effectiveFrom: { [Op.lte]: dateKey }
    },
    order: [['effectiveFrom', 'DESC'], ['id', 'DESC']]
  });

  const ruleId = assignment ? assignment.earlyOvertimeRuleId : (orgAccount && orgAccount.earlyOvertimeRuleId);

  let finalRule = ruleId ? await EarlyOvertimeRule.findByPk(ruleId) : null;
  let thresholds = [];

  if (!finalRule) {
    console.log(`[EarlyOvertimeService] No automation rule for user ${userId}. Returning 0.`);
    return { earlyOvertimeMinutes: 0, earlyOvertimeAmount: 0, earlyOvertimeRuleId: null };
  } else {
    thresholds = finalRule.thresholds || [];
    if (typeof thresholds === 'string') {
      try { thresholds = JSON.parse(thresholds); } catch (e) { thresholds = []; }
    }
  }

  const earlyOvertimeMinutes = await getEarlyOvertimeMinutes(attendance, { ...(finalRule.toJSON ? finalRule.toJSON() : finalRule), thresholds }, shiftTemplate);

  if (earlyOvertimeMinutes <= 0) {
    return {
      earlyOvertimeMinutes: 0,
      earlyOvertimeAmount: 0,
      earlyOvertimeRuleId: finalRule.id || null
    };
  }

  const sortedTiers = [...(thresholds || [])].sort((a, b) => b.minMinutes - a.minMinutes);
  const tier = sortedTiers.find(t => earlyOvertimeMinutes >= t.minMinutes);

  let earlyOvertimeAmount = 0;
  const rewardType = tier?.rewardType || (finalRule && finalRule.rewardType);
  const rewardValue = tier?.rewardValue || tier?.value || 0;

  if (rewardType === 'FIXED_AMOUNT') {
    earlyOvertimeAmount = rewardValue;
  } else if (rewardType === 'FIXED_AMOUNT_PER_HOUR') {
    earlyOvertimeAmount = (earlyOvertimeMinutes / 60) * rewardValue;
  } else if (rewardType === 'SALARY_MULTIPLIER' || rewardType === 'MULTIPLIER') {
    const user = await User.findByPk(userId);
    let sv = {};
    if (user?.salaryValues) {
      try { sv = typeof user.salaryValues === 'string' ? JSON.parse(user.salaryValues) : user.salaryValues; } catch (e) { sv = {}; }
    }
    const basic = Number(user?.basicSalary || 0) || Number(sv?.earnings?.basic_salary || sv?.earnings?.BASIC_SALARY || 0);
    const da = Number(user?.da || 0) || Number(sv?.earnings?.da || sv?.earnings?.DA || 0);
    const baseSalary = basic + da;
    let daysForRate = daysInMonthArg || 30;
    if (orgAccount && dateKey) {
      const monthKey = dateKey.substring(0, 7);
      const settingsDays = await getSettingsPayableDays(orgAccount, monthKey);
      if (settingsDays > 0) {
        daysForRate = settingsDays;
      }
    }
    const daysInMonth = daysForRate;

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

    // CUSTOM: If organization has 'Half Day' bonus enabled at 0 mins in the MAIN overtime rule,
    // we apply the same '1 hour = 0.5 days' logic to early overtime for consistency.
    if (orgAccount?.overtimeRuleId) {
      const { OvertimeRule } = require('../models');
      const mainRule = await OvertimeRule.findByPk(orgAccount.overtimeRuleId);
      if (mainRule && mainRule.giveHalfDayOvertime && Number(mainRule.halfDayThresholdMinutes) === 0) {
        const dailyRate = daysInMonth > 0 ? (baseSalary / daysInMonth) : 0;
        hourlySalary = dailyRate / 2;
      }
    }

    if (hourlySalary <= 0) {
      earlyOvertimeAmount = 0;
    } else {
      const multiplier = Number(rewardValue) || 1;
      earlyOvertimeAmount = (hourlySalary * multiplier) * (earlyOvertimeMinutes / 60);
      console.log(`[EarlyOvertimeService] Debug - User ${userId} BaseSalary: ${baseSalary}, Hourly: ${hourlySalary.toFixed(2)}, Multiplier: ${multiplier}, Result: ${earlyOvertimeAmount.toFixed(2)}`);
    }
  }

  return {
    earlyOvertimeMinutes,
    earlyOvertimeAmount: parseFloat(earlyOvertimeAmount.toFixed(2)),
    earlyOvertimeRuleId: finalRule.id || null
  };
}

module.exports = {
  calculateEarlyOvertime
};
