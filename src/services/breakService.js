const { BreakRule, StaffBreakAssignment, StaffProfile, ShiftTemplate, StaffShiftAssignment, User, StaffRoster } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

/**
 * Calculates break deduction for a specific attendance record.
 */
async function calculateBreakDeduction(attendance, orgAccount, daysInMonth = 30, nowArg = new Date(), dailySalaryArg = null) {
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

    // 1.5 Fetch Shift Template to get dynamic work hours
    const { Op } = require('sequelize');
    let shiftTemplate = null;
    const roster = await StaffRoster.findOne({ where: { userId, date: dateStr } });
    if (roster && roster.status === 'SHIFT' && roster.shiftTemplateId) {
      shiftTemplate = await ShiftTemplate.findByPk(roster.shiftTemplateId);
    }
    if (!shiftTemplate) {
      const asg = await StaffShiftAssignment.findOne({
        where: {
          userId,
          effectiveFrom: { [Op.lte]: dateStr },
          [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: dateStr } }]
        },
        order: [['effectiveFrom', 'DESC']]
      });
      if (asg) shiftTemplate = await ShiftTemplate.findByPk(asg.shiftTemplateId);
    }
    if (!shiftTemplate) {
      const user = await User.findByPk(userId);
      if (user?.shiftTemplateId) shiftTemplate = await ShiftTemplate.findByPk(user.shiftTemplateId);
    }
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

    // 2. Calculate Break Duration
    const totalBreakMinutes = Math.round((attendance.breakTotalSeconds || 0) / 60);
    if (totalBreakMinutes <= 0) {
      return { breakDeductionAmount: 0, excessBreakMinutes: 0, breakRuleId: ruleId };
    }

    // 3. Fetch Staff Salary for Multiplier
    let dailySalary = dailySalaryArg;
    if (!dailySalary && (effectiveRule.deductionType === 'SALARY_MULTIPLIER' || effectiveRule.deductHalfDay || effectiveRule.deductFullDay)) {
      const { User } = require('../models');
      const user = await User.findByPk(userId);
      let sv = {};
      if (user?.salaryValues) {
        try { sv = typeof user.salaryValues === 'string' ? JSON.parse(user.salaryValues) : user.salaryValues; } catch (e) { sv = {}; }
      }
      const basic = Number(user?.basicSalary || 0) || Number(sv?.earnings?.basic_salary || sv?.earnings?.BASIC_SALARY || 0);
      const da = Number(user?.da || 0) || Number(sv?.earnings?.da || sv?.earnings?.DA || 0);
      const gross = Number(user?.grossSalary || 0) || Number(sv?.earnings?.gross_salary || sv?.earnings?.GROSS_SALARY || 0) || (basic + da);
      dailySalary = (daysInMonth > 0) ? (gross / daysInMonth) : 0;
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
          const hourlySalary = dailySalary / shiftHours;
          excessBreakMinutes = totalBreakMinutes - Number(tier.minMinutes);
          const durationHours = excessBreakMinutes / 60;
          deductionAmount = hourlySalary * multiplier * durationHours;
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
