const { LatePunchInRule, StaffLatePunchInAssignment, User, StaffShiftAssignment, ShiftTemplate, StaffRoster } = require('../models');
const { Op } = require('sequelize');

/**
 * Service to handle automated Late Punch-In calculations and penalties
 */
class LatePunchInService {
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
      console.error('[LatePunchInService] Error getting shift:', error);
      return null;
    }
  }

  /**
   * Main calculation logic for Late Punch-In penalty
   */
  async calculateLatePenalty(attendance, orgAccount, now = new Date(), daysInMonth = 30) {
    const { userId, orgAccountId, date: dateKey, punchedInAt } = attendance;
    if (!punchedInAt) return { latePunchInMinutes: 0, latePunchInAmount: 0, latePunchInRuleId: null };

    // 1. Identify Shift Start Time (Always identify shift to get raw minutes)
    const shift = await this.getEffectiveShiftTemplate(userId, dateKey);
    let latePunchInMinutes = 0;

    if (shift && shift.shiftType !== 'open' && shift.startTime) {
      const [sh, sm, ss] = shift.startTime.split(':').map(Number);
      const shiftStartTs = new Date(punchedInAt);
      shiftStartTs.setHours(sh, sm, ss || 0, 0);

      if (punchedInAt > shiftStartTs) {
        latePunchInMinutes = Math.floor((punchedInAt - shiftStartTs) / 60000);
      }
    }

    // 2. Resolve applicable Rule for penalty calculation
    let finalRule = null;
    const assignment = await StaffLatePunchInAssignment.findOne({
      where: {
        userId,
        orgAccountId,
        effectiveFrom: { [Op.lte]: dateKey },
        [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: dateKey } }]
      },
      order: [['effectiveFrom', 'DESC']],
      include: [{ model: LatePunchInRule, as: 'rule' }]
    });

    if (assignment?.rule?.active) {
      finalRule = assignment.rule;
    }

    // If no rule or no lateness, return just the minutes (if any) and 0 penalty
    if (!finalRule || !finalRule.active || latePunchInMinutes <= 0) {
      return { 
        latePunchInMinutes, 
        latePunchInAmount: 0, 
        latePunchInRuleId: finalRule?.id || null,
        isLate: latePunchInMinutes > 0
      };
    }

    // 3. Calculate Deduction Amount (Only if rule exists and late)
    let deductionAmount = 0;
    const user = await User.findByPk(userId);
    const baseSalary = Number(user?.grossSalary || user?.basicSalary || 0) + (user?.grossSalary ? 0 : Number(user?.da || 0));
    const dailySalary = baseSalary / daysInMonth;

    const pType = finalRule.penaltyType || 'SLABS';
    let thresholds = finalRule.thresholds;
    if (typeof thresholds === 'string') {
        try { thresholds = JSON.parse(thresholds); } catch (e) { thresholds = []; }
    }
    if (!Array.isArray(thresholds)) thresholds = [];

    let matchedTier = null;
    if (pType === 'SLABS') {
        const tier = thresholds.find(t => latePunchInMinutes >= Number(t.minMinutes) && latePunchInMinutes <= Number(t.maxMinutes));
        if (tier) {
            matchedTier = tier;
            if (Number(tier.frequency || 0) === 1) {
                deductionAmount = dailySalary * Number(tier.deduction || 0);
            }
        }
    } else if (pType === 'FIXED_AMOUNT') {
        const threshold = thresholds.find(t => latePunchInMinutes >= Number(t.minMinutes));
        if (threshold) {
            matchedTier = threshold;
            deductionAmount = Number(threshold.value || 0);
        }
    } else if (pType === 'FIXED_AMOUNT_PER_HOUR') {
        const threshold = thresholds.find(t => latePunchInMinutes >= Number(t.minMinutes));
        if (threshold) {
            matchedTier = threshold;
            const hours = Math.ceil(latePunchInMinutes / 60);
            deductionAmount = Number(threshold.value || 0) * hours;
        }
    } else if (pType === 'HALF_DAY') {
        const threshold = thresholds.find(t => latePunchInMinutes >= Number(t.minMinutes));
        if (threshold) {
            matchedTier = threshold;
            deductionAmount = dailySalary / 2;
        }
    } else if (pType === 'FULL_DAY') {
        const threshold = thresholds.find(t => latePunchInMinutes >= Number(t.minMinutes));
        if (threshold) {
            matchedTier = threshold;
            deductionAmount = dailySalary;
        }
    } else if (pType === 'SALARY_MULTIPLIER') {
        const threshold = thresholds.find(t => latePunchInMinutes >= Number(t.minMinutes));
        if (threshold) {
            matchedTier = threshold;
            const hourlySalary = dailySalary / 8; // Assuming 8-hour workday
            deductionAmount = hourlySalary * Number(threshold.value || 0);
        }
    }

    console.log(`[LatePunchInService] User: ${userId}, Late: ${latePunchInMinutes}m, Type: ${pType}, Amount: ${deductionAmount.toFixed(2)}`);

    return {
      latePunchInMinutes,
      latePunchInAmount: parseFloat(deductionAmount.toFixed(2)),
      latePunchInRuleId: finalRule.id,
      tier: matchedTier,
      rule: finalRule
    };
  }
}

module.exports = new LatePunchInService();
