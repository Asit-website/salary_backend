const { EarlyExitRule, StaffEarlyExitAssignment, User, StaffShiftAssignment, ShiftTemplate, StaffRoster } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const shiftService = require('./shiftService');

/**
 * Service to handle automated Early Exit calculations and penalties
 */
class EarlyExitService {
  /**
   * Main calculation logic for Early Exit
   */
  async calculateEarlyExit(attendance, orgAccount, daysInMonth = 30, now = new Date(), dailySalaryArg = null) {
    const { userId, orgAccountId, date: dateKey, punchedOutAt } = attendance;
    if (!punchedOutAt) return { earlyExitMinutes: 0, earlyExitAmount: 0, earlyExitRuleId: null };

    // 1. Identify Shift End Time (Always identify shift to get raw minutes)
    const shift = await shiftService.getEffectiveShiftTemplate(userId, dateKey);
    let earlyExitMinutes = 0;

    if (shift && shift.shiftType !== 'open' && shift.endTime) {
      const [sh, sm] = (shift.startTime || '00:00').split(':').map(Number);
      const [eh, em, es] = shift.endTime.split(':').map(Number);
      
      // Robust Time Comparison:
      // We assume shift times are in Local Time (IST).
      // Build shift start and end times based on the attendance date (dateKey).
      const outAtLocal = dayjs(punchedOutAt).second(0).millisecond(0);
      const shiftDate = dayjs(dateKey);
      
      let shiftStartLocal = shiftDate.hour(sh).minute(sm).second(0).millisecond(0);
      let shiftEndLocal = shiftDate.hour(eh).minute(em).second(es || 0).millisecond(0);

      // If end time is before start time (e.g. 10 PM to 6 AM), end is on the next day relative to start.
      if (shiftEndLocal.isBefore(shiftStartLocal)) {
          shiftEndLocal = shiftEndLocal.add(1, 'day');
      }

      if (outAtLocal.isBefore(shiftEndLocal)) {
        earlyExitMinutes = shiftEndLocal.diff(outAtLocal, 'minute');
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
    let dailySalary = dailySalaryArg;

    if (!dailySalary) {
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
          let shiftWorkMins = shift?.workMinutes || 0;
          if (!shiftWorkMins && shift?.startTime && shift?.endTime) {
            const [sh, sm] = shift.startTime.split(':').map(Number);
            const [eh, em] = shift.endTime.split(':').map(Number);
            let startMin = sh * 60 + sm;
            let endMin = eh * 60 + em;
            if (endMin <= startMin) endMin += 1440;
            shiftWorkMins = endMin - startMin;
          }
          const shiftHours = (shiftWorkMins || 480) / 60;
          const hourlySalary = dailySalary / shiftHours;
          const durationHours = earlyExitMinutes / 60;
          deductionAmount = hourlySalary * rewardValue * durationHours;
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
