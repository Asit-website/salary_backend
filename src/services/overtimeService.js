const { sequelize, OvertimeRule, ShiftTemplate, StaffShiftAssignment, User, StaffProfile, StaffRoster, OrgAccount, StaffOvertimeAssignment } = require('../models');

/**
 * Calculates overtime based on a specific Rule or fallback ShiftTemplate.
 * 
 * @param {Object} attendance - The attendance record (must have userId, totalWorkHours, etc.)
 * @param {Object} orgAccount - The organization account object (to find activeOvertimeRule)
 * @param {Date} now - Current time for Shift End calculations
 */
async function getEffectiveShiftTemplate(userId, dateKey) {
  try {
    const { Op } = require('sequelize');
    const where = { userId };
    if (dateKey) {
      where.effectiveFrom = { [Op.lte]: dateKey };
      where[Op.or] = [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: dateKey } }];
    }
    // 1. Roster check
    if (userId && dateKey) {
      const roster = await StaffRoster.findOne({ where: { userId, date: dateKey } });
      if (roster) {
        if (roster.status === 'SHIFT' && roster.shiftTemplateId) {
          const tpl = await ShiftTemplate.findByPk(roster.shiftTemplateId);
          if (tpl && tpl.active !== false) return tpl;
        }
        if (roster.status === 'WEEKLY_OFF' || roster.status === 'HOLIDAY') return null;
      }
    }
    // 2. Assignment check
    const asg = await StaffShiftAssignment.findOne({ where, order: [['effectiveFrom', 'DESC'], ['id', 'DESC']] });
    if (asg) {
      const tpl = await ShiftTemplate.findByPk(asg.shiftTemplateId);
      if (tpl && tpl.active !== false) return tpl;
    }
    // 3. Profile check
    const user = await User.findByPk(userId, { include: [{ model: StaffProfile, as: 'profile' }] });
    if (user?.shiftTemplateId) {
      const tpl = await ShiftTemplate.findByPk(user.shiftTemplateId);
      if (tpl && tpl.active !== false) return tpl;
    }
    if (user?.profile?.shiftSelection) {
      const tpl = await ShiftTemplate.findOne({ where: { id: Number(user.profile.shiftSelection), active: true } });
      if (tpl) return tpl;
    }
    return null;
  } catch (e) {
    console.error('[OvertimeService] Error getting shift template:', e.message);
    return null;
  }
}

/**
 * Helper to find minutes exceeding the threshold based on Calculation Type
 */
async function getOvertimeMinutes(attendance, rule, shiftTemplate) {
  const totalWorkMinutes = Math.floor(attendance.totalWorkHours * 60);
  const baseThreshold = (rule.thresholds && rule.thresholds.length > 0) ? rule.thresholds[0].minMinutes : 0;

  let overtimeByPeriod = 0;
  let overtimeByShift = 0;

  overtimeByPeriod = Math.max(0, totalWorkMinutes - baseThreshold);

  if (attendance.punchedOutAt && shiftTemplate && shiftTemplate.endTime) {
    const punchOut = new Date(attendance.punchedOutAt);

    // Timezone safe extraction (IST - Asia/Kolkata)
    const istStr = punchOut.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false });
    const localMatch = istStr.match(/(\d{1,2}):(\d{2}):(\d{2})/);
    let punchOutSec = 0;

    if (localMatch) {
      const ph = parseInt(localMatch[1]);
      const pm = parseInt(localMatch[2]);
      const ps = parseInt(localMatch[3]);
      punchOutSec = ph * 3600 + pm * 60 + ps;
    } else {
      // Fallback to local system time if formatter fails
      punchOutSec = punchOut.getHours() * 3600 + punchOut.getMinutes() * 60 + punchOut.getSeconds();
    }

    const [eh, em, es] = shiftTemplate.endTime.split(':').map(Number);
    const shiftEndSec = (eh * 3600 + em * 60 + (es || 0));

    console.log(`[OvertimeService] Rule ID: ${rule.id}, PO (IST): ${istStr}, SE: ${shiftTemplate.endTime}, POSec: ${punchOutSec}, SESec: ${shiftEndSec}`);

    if (punchOutSec > shiftEndSec) {
      overtimeByShift = Math.floor((punchOutSec - shiftEndSec) / 60);
    }
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
async function calculateOvertime(params, orgAccountArg, nowArg, daysInMonthArg = 30) {
  const attendance = (params.toJSON ? params.toJSON() : params);
  const totalWorkMinutes = Math.floor((attendance.totalWorkHours || 0) * 60);
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
  const shiftTemplate = await getEffectiveShiftTemplate(userId, dateKey);

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
        status: (totalWorkMinutes < (shiftTemplate?.halfDayThresholdMinutes || 240)) ? 'half_day' : 'present' 
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
      status: (attendance.totalWorkHours * 60 < (shiftTemplate?.halfDayThresholdMinutes || 240)) ? 'half_day' : 'present'
    };
  }

  // 3. Calculate Reward (Amount) based on Tiers
  // Find the highest applicable threshold based on OVERTIME MINUTES (not total work minutes)
  const sortedTiers = [...(thresholds || [])].sort((a, b) => b.minMinutes - a.minMinutes);
  const tier = sortedTiers.find(t => overtimeMinutes >= t.minMinutes);

  let overtimeAmount = 0;
  const rewardType = tier?.rewardType || (finalRule && finalRule.rewardType);
  const rewardValue = tier?.rewardValue || tier?.value || 0;

  if (rewardType === 'FIXED_AMOUNT') {
    overtimeAmount = rewardValue;
  } else if (rewardType === 'FIXED_AMOUNT_PER_HOUR') {
    overtimeAmount = (overtimeMinutes / 60) * rewardValue;
  } else if (rewardType === 'SALARY_MULTIPLIER' || rewardType === 'MULTIPLIER') {
    const user = await User.findByPk(userId);
    // REVERTED: OT uses (Basic + DA) as the base, not Gross.
    const baseSalary = Number(user?.basicSalary || 0) + Number(user?.da || 0);
    const daysInMonth = daysInMonthArg || 30; // Standard month units
    const hourlySalary = daysInMonth > 0 ? (baseSalary / (daysInMonth * 8)) : 0;

    // If salary is missing, we can't calculate a multiplier amount, but we should log it
    if (hourlySalary <= 0) {
      console.log(`[OvertimeService] Warning: Salary Multiplier rule used for user ${userId} but no base salary found (Found: ${baseSalary}).`);
      overtimeAmount = 0;
    } else {
      const multiplier = Number(rewardValue) || Number(finalRule.multiplier) || 1;
      // NEW FIXED SLAB LOGIC: Only multiply by the multiplier (no actual hours)
      overtimeAmount = hourlySalary * multiplier;
      console.log(`[OvertimeService] Debug - User ${userId} BaseSalary(Gross): ${baseSalary}, Hourly: ${hourlySalary.toFixed(2)}, Multiplier: ${multiplier}, Result: ${overtimeAmount.toFixed(2)}`);
    }
  }

  // Handle Half/Full Day Bonuses if using a real rule
  if (finalRule && finalRule.id) {
    if (finalRule.giveHalfDayOvertime && finalRule.halfDayThresholdMinutes) {
      if (totalWorkMinutes >= finalRule.halfDayThresholdMinutes) {
        const user = await User.findByPk(userId);
        const dailyRate = (Number(user?.grossSalary || 0)) / (daysInMonthArg || 30);
        overtimeAmount += (dailyRate / 2);
      }
    }

    if (finalRule.giveFullDayOvertime && finalRule.fullDayThresholdMinutes) {
      if (totalWorkMinutes >= finalRule.fullDayThresholdMinutes) {
        const user = await User.findByPk(userId);
        const dailyRate = (Number(user?.grossSalary || 0)) / (daysInMonthArg || 30);
        overtimeAmount += dailyRate;
      }
    }
  }

  return {
    overtimeMinutes: Math.floor(overtimeMinutes),
    overtimeAmount: assignment ? parseFloat(overtimeAmount.toFixed(2)) : 0,
    overtimeRuleId: finalRule.id || null,
    status: overtimeMinutes > 0 ? 'overtime' : (totalWorkMinutes < (shiftTemplate?.halfDayThresholdMinutes || 240) ? 'half_day' : 'present')
  };
}

module.exports = {
  calculateOvertime
};