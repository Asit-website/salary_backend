const { sequelize, EarlyOvertimeRule, ShiftTemplate, StaffShiftAssignment, User, StaffProfile, StaffRoster, OrgAccount, StaffEarlyOvertimeAssignment } = require('../models');

/**
 * Resolves the effective Shift Template for a user on a given date.
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
    console.error('[EarlyOvertimeService] Error getting shift template:', e.message);
    return null; 
  }
}

/**
 * Helper to find minutes worked before shift start.
 */
async function getEarlyOvertimeMinutes(attendance, rule, shiftTemplate) {
  if (!attendance.punchedInAt || !shiftTemplate || !shiftTemplate.startTime) {
    return 0;
  }

  const punchIn = new Date(attendance.punchedInAt);
  
  // Timezone safe extraction (IST - Asia/Kolkata)
  const istStr = punchIn.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false });
  const localMatch = istStr.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  let punchInSec = 0;
  
  if (localMatch) {
    const ph = parseInt(localMatch[1]);
    const pm = parseInt(localMatch[2]);
    const ps = parseInt(localMatch[3]);
    punchInSec = ph * 3600 + pm * 60 + ps;
  } else {
    punchInSec = punchIn.getHours() * 3600 + punchIn.getMinutes() * 60 + punchIn.getSeconds();
  }
  
  const [sh, sm, ss] = shiftTemplate.startTime.split(':').map(Number);
  const shiftStartSec = (sh * 3600 + sm * 60 + (ss || 0));

  console.log(`[EarlyOvertimeService] Rule ID: ${rule.id}, PI (IST): ${istStr}, SS: ${shiftTemplate.startTime}, PISec: ${punchInSec}, SSSec: ${shiftStartSec}`);

  if (punchInSec < shiftStartSec) {
    const earlyMin = Math.floor((shiftStartSec - punchInSec) / 60);
    
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
async function calculateEarlyOvertime(params, orgAccountArg, nowArg, daysInMonthArg = 30) {
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

  const shiftTemplate = await getEffectiveShiftTemplate(userId, dateKey);
  
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
    const baseSalary = Number(user?.basicSalary || 0) + Number(user?.da || 0);
    const daysInMonth = daysInMonthArg || 30;
    const hourlySalary = daysInMonth > 0 ? (baseSalary / (daysInMonth * 8)) : 0;
    
    if (hourlySalary <= 0) {
      earlyOvertimeAmount = 0;
    } else {
      const multiplier = Number(rewardValue) || 1;
      earlyOvertimeAmount = hourlySalary * multiplier;
      console.log(`[EarlyOvertimeService] Debug - User ${userId} BaseSalary: ${baseSalary}, Hourly: ${hourlySalary.toFixed(2)}, Multiplier: ${multiplier}, Result: ${earlyOvertimeAmount.toFixed(2)}`);
    }
  }

  return {
    earlyOvertimeMinutes: Math.floor(earlyOvertimeMinutes),
    earlyOvertimeAmount: parseFloat(earlyOvertimeAmount.toFixed(2)),
    earlyOvertimeRuleId: finalRule.id || null
  };
}

module.exports = {
  calculateEarlyOvertime
};
