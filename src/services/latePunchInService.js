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
    const buffer = Number(finalRule?.bufferMinutes || 0);
    const effectiveLateMinutes = Math.max(0, latePunchInMinutes - buffer);

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
        const tier = thresholds.find(t => effectiveLateMinutes >= Number(t.minMinutes) && effectiveLateMinutes <= Number(t.maxMinutes));
        if (tier) {
            matchedTier = tier;
            if (Number(tier.frequency || 0) === 1) {
                deductionAmount = dailySalary * Number(tier.deduction || 0);
            }
        }
    } else if (pType === 'FIXED_AMOUNT') {
        const threshold = thresholds.find(t => effectiveLateMinutes >= Number(t.minMinutes));
        if (threshold) {
            matchedTier = threshold;
            deductionAmount = Number(threshold.value || 0);
        }
    } else if (pType === 'FIXED_AMOUNT_PER_HOUR') {
        const threshold = thresholds.find(t => effectiveLateMinutes >= Number(t.minMinutes));
        if (threshold) {
            matchedTier = threshold;
            const hours = Math.ceil(effectiveLateMinutes / 60);
            deductionAmount = Number(threshold.value || 0) * hours;
        }
    } else if (pType === 'HALF_DAY') {
        const threshold = thresholds.find(t => effectiveLateMinutes >= Number(t.minMinutes));
        if (threshold) {
            matchedTier = threshold;
            deductionAmount = dailySalary / 2;
        }
    } else if (pType === 'FULL_DAY') {
        const threshold = thresholds.find(t => effectiveLateMinutes >= Number(t.minMinutes));
        if (threshold) {
            matchedTier = threshold;
            deductionAmount = dailySalary;
        }
    } else if (pType === 'SALARY_MULTIPLIER') {
        const threshold = thresholds.find(t => effectiveLateMinutes >= Number(t.minMinutes));
        if (threshold) {
            matchedTier = threshold;
            const hourlySalary = dailySalary / 8; // Assuming 8-hour workday
            deductionAmount = hourlySalary * Number(threshold.value || 0);
        }
    }

    console.log(`[LatePunchInService] User: ${userId}, Raw Late: ${latePunchInMinutes}m, Buffer: ${buffer}m, Effective: ${effectiveLateMinutes}m, Type: ${pType}, Amount: ${deductionAmount.toFixed(2)}`);

    return {
      latePunchInMinutes,
      effectiveLateMinutes,
      bufferMinutes: buffer,
      latePunchInAmount: parseFloat(deductionAmount.toFixed(2)),
      latePunchInRuleId: finalRule.id,
      tier: matchedTier,
      rule: finalRule
    };
  }
  /**
   * Processes a month's worth of attendance for a user and calculates late penalties
   * with occurrence tracking (e.g., "Every 3 times").
   */
  async calculateMonthlyLateDetails(userId, orgAccountId, monthKey, attendanceRows, dailySalary) {
    if (!attendanceRows || attendanceRows.length === 0) {
      return { rows: [], totalPenalty: 0, totalDays: 0, lateCount: 0 };
    }

    const rows = [...attendanceRows].sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalPenalty = 0;
    let totalDays = 0;
    let lateCount = 0;

    // We track occurrences per unique Rule+Tier combination
    const ruleOccurrences = {}; // { "ruleId_tierIndex": count }

    for (const row of rows) {
      // 1. Calculate raw penalty for this specific day
      // We pass 30 as default daysInMonth, but we primarily care about the matched rule and tier
      const lp = await this.calculateLatePenalty(row, { id: orgAccountId }, new Date(), 30);
      
      row.latePunchInMinutes = lp.latePunchInMinutes || 0;
      row.latePunchInAmount = 0; // Default to 0, will set if threshold met
      row.lateOccurrence = null;

      if (row.latePunchInMinutes > 0) {
        lateCount++;
        
        const rule = lp.rule;
        const tier = lp.tier;

        if (rule && tier) {
          const frequency = Number(tier.frequency || 1);
          const tierKey = `${rule.id}_${JSON.stringify(tier)}`; // Unique key for this specific threshold
          
          ruleOccurrences[tierKey] = (ruleOccurrences[tierKey] || 0) + 1;
          const currentCount = ruleOccurrences[tierKey];
          
          // Set occurrence string (e.g., "1/3")
          row.lateOccurrence = `${currentCount}/${frequency}`;

          // Check if penalty triggers this time
          if (currentCount % frequency === 0) {
            let rowPenalty = 0;
            let rowDays = 0;

            const pType = rule.penaltyType || 'SLABS';
            if (pType === 'SLABS') {
              rowDays = Number(tier.deduction || 0);
              rowPenalty = dailySalary * rowDays;
            } else if (pType === 'FIXED_AMOUNT') {
              rowPenalty = Number(tier.value || 0);
              rowDays = dailySalary > 0 ? (rowPenalty / dailySalary) : 0;
            } else if (pType === 'FIXED_AMOUNT_PER_HOUR') {
              const hours = Math.ceil(row.latePunchInMinutes / 60);
              rowPenalty = Number(tier.value || 0) * hours;
              rowDays = dailySalary > 0 ? (rowPenalty / dailySalary) : 0;
            } else if (pType === 'HALF_DAY') {
              rowDays = 0.5;
              rowPenalty = dailySalary * 0.5;
            } else if (pType === 'FULL_DAY') {
              rowDays = 1.0;
              rowPenalty = dailySalary;
            } else if (pType === 'SALARY_MULTIPLIER') {
              const hourlySalary = dailySalary / 8;
              rowPenalty = hourlySalary * Number(tier.value || 0);
              rowDays = dailySalary > 0 ? (rowPenalty / dailySalary) : 0;
            }

            row.latePunchInAmount = parseFloat(rowPenalty.toFixed(2));
            row.lateOccurrence += ' (Deducted)';
            
            totalPenalty += rowPenalty;
            totalDays += rowDays;
          }
        }
      }
    }

    return {
      rows,
      totalPenalty: parseFloat(totalPenalty.toFixed(2)),
      totalDays: parseFloat(totalDays.toFixed(2)),
      lateCount
    };
  }
}

module.exports = new LatePunchInService();
