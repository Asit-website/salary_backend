const { EarlyExitRule, StaffEarlyExitAssignment, User, StaffShiftAssignment, ShiftTemplate, StaffRoster } = require('../models');
const { Op } = require('sequelize');

/**
 * Service to handle automated Early Exit calculations and penalties
 */
class EarlyExitService {
  /**
   * Helper to get effective shift template for a user on a specific date
   */
  async getEffectiveShiftTemplate(userId, dateKey) {
    try {
      const roster = await StaffRoster.findOne({ where: { userId, date: dateKey } });
      if (roster && roster.status === 'SHIFT' && roster.shiftTemplateId) {
        const tpl = await ShiftTemplate.findByPk(roster.shiftTemplateId);
        if (tpl && tpl.active !== false) return tpl;
      }

      const asg = await StaffShiftAssignment.findOne({
        where: {
          userId,
          effectiveFrom: { [Op.lte]: dateKey },
          [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: dateKey } }]
        },
        order: [['effectiveFrom', 'DESC']]
      });

      if (asg) {
        const tpl = await ShiftTemplate.findByPk(asg.shiftTemplateId);
        if (tpl && tpl.active !== false) return tpl;
      }

      const user = await User.findByPk(userId);
      if (user?.shiftTemplateId) {
        const tpl = await ShiftTemplate.findByPk(user.shiftTemplateId);
        if (tpl && tpl.active !== false) return tpl;
      }

      return null;
    } catch (error) {
      console.error('[EarlyExitService] Error getting shift:', error);
      return null;
    }
  }

  /**
   * Main calculation logic for Early Exit
   */
  async calculateEarlyExit(attendance, orgAccount, now = new Date(), daysInMonth = 30) {
    const { userId, orgAccountId, date: dateKey, punchedOutAt } = attendance;
    if (!punchedOutAt) return { earlyExitMinutes: 0, earlyExitAmount: 0, earlyExitRuleId: null };

    // 1. Identify Shift End Time (Always identify shift to get raw minutes)
    const shift = await this.getEffectiveShiftTemplate(userId, dateKey);
    let earlyExitMinutes = 0;

    if (shift && shift.shiftType !== 'open' && shift.endTime) {
      const [eh, em, es] = shift.endTime.split(':').map(Number);
      const shiftEndTs = new Date(punchedOutAt);
      shiftEndTs.setHours(eh, em, es || 0, 0);

      // Handle overnight shift if necessary (basic check)
      const [sh, sm] = (shift.startTime || '00:00').split(':').map(Number);
      if (sh > eh) {
        // If start hour > end hour, shift ends next day. 
        // However, for pure early exit calculation at punch out, 
        // we usually compare against the current day's projected end.
      }

      if (punchedOutAt < shiftEndTs) {
        earlyExitMinutes = Math.floor((shiftEndTs - punchedOutAt) / 60000);
      }
    }

    // 2. Resolve applicable Rule for penalty calculation
    let finalRule = null;
    const assignment = await StaffEarlyExitAssignment.findOne({
      where: {
        userId,
        orgAccountId,
        effectiveFrom: { [Op.lte]: dateKey },
        [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: dateKey } }]
      },
      order: [['effectiveFrom', 'DESC']],
      include: [{ model: EarlyExitRule, as: 'rule' }]
    });

    if (assignment?.rule?.active) {
      finalRule = assignment.rule;
    } else if (orgAccount?.earlyExitRuleId) {
      finalRule = await EarlyExitRule.findByPk(orgAccount.earlyExitRuleId);
    }

    // If no rule or no early exit, return just the minutes (if any) and 0 penalty
    if (!finalRule || !finalRule.active || earlyExitMinutes <= 0) {
      return {
        earlyExitMinutes,
        earlyExitAmount: 0,
        earlyExitRuleId: finalRule?.id || null
      };
    }

    // 3. Calculate Deduction Amount (Only if rule exists and early exit)
    let deductionAmount = 0;
    const user = await User.findByPk(userId);
    const baseSalary = Number(user?.grossSalary || user?.basicSalary || 0) + (user?.grossSalary ? 0 : Number(user?.da || 0));
    const dailySalary = baseSalary / daysInMonth;

    // A. Priority 1: Full Day Deduction
    if (finalRule.deductFullDay && finalRule.fullDayThresholdMinutes && earlyExitMinutes >= finalRule.fullDayThresholdMinutes) {
      deductionAmount = dailySalary;
    }
    // B. Priority 2: Half Day Deduction
    else if (finalRule.deductHalfDay && finalRule.halfDayThresholdMinutes && earlyExitMinutes >= finalRule.halfDayThresholdMinutes) {
      deductionAmount = dailySalary / 2;
    }
    // C. Priority 3: Threshold based Fines
    else {
      let thresholds = finalRule.thresholds;
      if (typeof thresholds === 'string') {
        try { thresholds = JSON.parse(thresholds); } catch (e) { thresholds = []; }
      }
      if (!Array.isArray(thresholds)) thresholds = [];

      // Find the highest applicable threshold
      const tier = thresholds
        .filter(t => earlyExitMinutes >= Number(t.minMinutes))
        .sort((a, b) => b.minMinutes - a.minMinutes)[0];

      if (tier) {
        const rewardType = tier.rewardType || finalRule.deductionType;
        const rewardValue = Number(tier.rewardValue || 0);

        if (rewardType === 'FIXED_AMOUNT') {
          deductionAmount = rewardValue;
        } else if (rewardType === 'SALARY_MULTIPLIER') {
          const hourlySalary = baseSalary / (daysInMonth * 8);
          deductionAmount = hourlySalary * rewardValue;
        }
      }
    }

    console.log(`[EarlyExitService] User: ${userId}, Early: ${earlyExitMinutes}m, Deduction: ${deductionAmount.toFixed(2)}`);

    return {
      earlyExitMinutes,
      earlyExitAmount: parseFloat(deductionAmount.toFixed(2)),
      earlyExitRuleId: finalRule.id
    };
  }
}

module.exports = new EarlyExitService();
