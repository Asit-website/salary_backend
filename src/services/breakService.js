const { BreakRule, StaffBreakAssignment, StaffProfile } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

/**
 * Calculates break deduction for a specific attendance record.
 */
async function calculateBreakDeduction(attendance, orgAccount, nowArg = new Date(), daysInMonth = 30) {
  try {
    const userId = attendance.userId;
    const orgAccountId = attendance.orgAccountId || orgAccount?.id;
    const dateStr = dayjs(attendance.date).format('YYYY-MM-DD');

    // 1. Determine the effective Break Rule
    let effectiveRule = null;
    let ruleId = null;

    // Check staff-specific assignment
    const assignment = await StaffBreakAssignment.findOne({
      where: {
        userId,
        orgAccountId
      },
      include: [{ model: BreakRule, as: 'rule' }]
    });

    if (assignment && assignment.rule && assignment.rule.active) {
      effectiveRule = assignment.rule;
      ruleId = assignment.rule.id;
    } else if (orgAccount && orgAccount.breakRuleId) {
      // Use organization default
      effectiveRule = await BreakRule.findOne({
        where: { id: orgAccount.breakRuleId, active: true }
      });
      ruleId = effectiveRule?.id;
    }

    if (!effectiveRule) {
      return { breakDeductionAmount: 0, excessBreakMinutes: 0, breakRuleId: null };
    }

    // 2. Calculate Break Duration
    const totalBreakMinutes = Math.floor((attendance.breakTotalSeconds || 0) / 60);
    if (totalBreakMinutes <= 0) {
      return { breakDeductionAmount: 0, excessBreakMinutes: 0, breakRuleId: ruleId };
    }

    // 3. Fetch Staff Salary for Multiplier
    let dailySalary = 0;
    if (effectiveRule.deductionType === 'SALARY_MULTIPLIER' || effectiveRule.deductHalfDay || effectiveRule.deductFullDay) {
      const profile = await StaffProfile.findOne({ where: { userId } });
      if (profile) {
        const salaryBase = Number(profile.grossSalary || 0);
        dailySalary = (daysInMonth > 0) ? (salaryBase / daysInMonth) : 0;
      }
    }

    let deductionAmount = 0;
    let excessBreakMinutes = 0;

    // 4. Check Full Day / Half Day Overrides first (Highest priority)
    if (effectiveRule.deductFullDay && effectiveRule.fullDayThresholdMinutes && totalBreakMinutes >= effectiveRule.fullDayThresholdMinutes) {
      deductionAmount = dailySalary;
      excessBreakMinutes = totalBreakMinutes - effectiveRule.fullDayThresholdMinutes;
    } else if (effectiveRule.deductHalfDay && effectiveRule.halfDayThresholdMinutes && totalBreakMinutes >= effectiveRule.halfDayThresholdMinutes) {
      deductionAmount = dailySalary / 2;
      excessBreakMinutes = totalBreakMinutes - effectiveRule.halfDayThresholdMinutes;
    } else {
      // 5. Evaluate Multi-tier Thresholds
      // Thresholds: [{ minMinutes: 15, rewardType: 'FIXED_AMOUNT', rewardValue: 100, frequency: 1 }]
      let thresholds = effectiveRule.thresholds || [];
      if (typeof thresholds === 'string') {
        try { thresholds = JSON.parse(thresholds); } catch (e) { thresholds = []; }
      }

      // Sort by minMinutes descending to get the highest applicable tier
      const applicableThresholds = thresholds
        .filter(t => totalBreakMinutes >= Number(t.minMinutes))
        .sort((a, b) => Number(b.minMinutes) - Number(a.minMinutes));

      if (applicableThresholds.length > 0) {
        const tier = applicableThresholds[0];
        
        // Apply deduction directly if threshold is met
        if (tier.rewardType === 'FIXED_AMOUNT') {
          deductionAmount = Number(tier.rewardValue || 0);
        } else if (tier.rewardType === 'SALARY_MULTIPLIER' || (effectiveRule.deductionType === 'SALARY_MULTIPLIER' && !tier.rewardType)) {
          const multiplier = Number(tier.rewardValue || 1);
          deductionAmount = dailySalary * multiplier;
        } else {
          // Default to rule level deduction
          deductionAmount = Number(tier.rewardValue || 0);
        }
        excessBreakMinutes = totalBreakMinutes - Number(tier.minMinutes);
      }
    }

    return {
      breakDeductionAmount: Math.max(0, Number(deductionAmount.toFixed(2))),
      excessBreakMinutes: Math.max(0, excessBreakMinutes),
      breakRuleId: ruleId
    };
  } catch (error) {
    console.error('[BreakService] Error:', error);
    return { breakDeductionAmount: 0, excessBreakMinutes: 0, breakRuleId: null };
  }
}

module.exports = {
  calculateBreakDeduction
};
