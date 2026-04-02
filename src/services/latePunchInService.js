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

    // 1. Resolve applicable Rule
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

    if (!finalRule || !finalRule.active) {
      return { latePunchInMinutes: 0, latePunchInAmount: 0, latePunchInRuleId: null };
    }

    // 2. Identify Shift Start Time
    const shift = await this.getEffectiveShiftTemplate(userId, dateKey);
    if (!shift || !shift.startTime) {
      return { latePunchInMinutes: 0, latePunchInAmount: 0, latePunchInRuleId: finalRule.id };
    }

    // 3. Calculate Late Minutes
    const [sh, sm, ss] = shift.startTime.split(':').map(Number);
    const shiftStartTs = new Date(punchedInAt);
    shiftStartTs.setHours(sh, sm, ss || 0, 0);

    let latePunchInMinutes = 0;
    if (punchedInAt > shiftStartTs) {
      latePunchInMinutes = Math.floor((punchedInAt - shiftStartTs) / 60000);
    }

    if (latePunchInMinutes <= 0) {
      return { latePunchInMinutes: 0, latePunchInAmount: 0, latePunchInRuleId: finalRule.id };
    }

    // 4. Calculate Deduction Amount
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

    if (pType === 'SLABS') {
        // Slab logic: Find the tier that matches late minutes
        const tier = thresholds.find(t => latePunchInMinutes >= Number(t.minMinutes) && latePunchInMinutes <= Number(t.maxMinutes));
        if (tier && Number(tier.frequency || 0) === 1) {
            // Only direct single-occurrence deductions are calculated here.
            // Frequency-based logic (e.g. 3rd occurrence) is usually handled during payroll generation.
            deductionAmount = dailySalary * Number(tier.deduction || 0);
        }
    } else if (pType === 'FIXED_AMOUNT') {
        const threshold = thresholds.find(t => latePunchInMinutes >= Number(t.minMinutes));
        if (threshold) deductionAmount = Number(threshold.value || 0);
    } else if (pType === 'FIXED_AMOUNT_PER_HOUR') {
        const threshold = thresholds.find(t => latePunchInMinutes >= Number(t.minMinutes));
        if (threshold) {
            const hours = Math.ceil(latePunchInMinutes / 60);
            deductionAmount = Number(threshold.value || 0) * hours;
        }
    } else if (pType === 'HALF_DAY') {
        const threshold = thresholds.find(t => latePunchInMinutes >= Number(t.minMinutes));
        if (threshold) deductionAmount = dailySalary / 2;
    } else if (pType === 'FULL_DAY') {
        const threshold = thresholds.find(t => latePunchInMinutes >= Number(t.minMinutes));
        if (threshold) deductionAmount = dailySalary;
    } else if (pType === 'SALARY_MULTIPLIER') {
        const threshold = thresholds.find(t => latePunchInMinutes >= Number(t.minMinutes));
        if (threshold) {
            const hourlySalary = dailySalary / 8; // Assuming 8-hour workday
            deductionAmount = hourlySalary * Number(threshold.value || 0);
        }
    }

    console.log(`[LatePunchInService] User: ${userId}, Late: ${latePunchInMinutes}m, Type: ${pType}, Amount: ${deductionAmount.toFixed(2)}`);

    return {
      latePunchInMinutes,
      latePunchInAmount: parseFloat(deductionAmount.toFixed(2)),
      latePunchInRuleId: finalRule.id
    };
  }
}

module.exports = new LatePunchInService();
