const { LatePunchInRule, StaffLatePunchInAssignment, User, StaffShiftAssignment, ShiftTemplate, StaffRoster } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const shiftService = require('./shiftService');
const { getSettingsPayableDays } = require('../utils/salarySettingsHelper');

/**
 * Service to handle automated Late Punch-In calculations and penalties
 */
class LatePunchInService {
  /**
   * Main calculation logic for Late Punch-In penalty
   */
  async calculateLatePenalty(attendance, orgAccount, daysInMonth = 30, now = new Date(), dailySalaryArg = null) {
    const { userId, orgAccountId, date: dateKey, punchedInAt } = attendance;
    if (!punchedInAt) return { latePunchInMinutes: 0, latePunchInAmount: 0, latePunchInRuleId: null };

    // 1. Identify Shift Start Time (Always identify shift to get raw minutes)
    const shift = await shiftService.getEffectiveShiftTemplate(userId, dateKey);
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
    let latePunchInMinutes = 0;

    if (shift && shift.shiftType !== 'open' && shift.startTime) {
      const [sh, sm, ss] = shift.startTime.split(':').map(Number);
      
      // Robust Time Comparison:
      // We assume shift.startTime is in the Organization's Local Time (IST).
      // Build shift start time based on the attendance date (dateKey).
      const inAtLocal = dayjs(punchedInAt).second(0).millisecond(0); 
      const shiftDate = dayjs(dateKey);
      const shiftStartLocal = shiftDate.hour(sh).minute(sm).second(ss || 0).millisecond(0);
      
      latePunchInMinutes = inAtLocal.diff(shiftStartLocal, 'minute');
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

    let dailySalary = dailySalaryArg;

    // Resolve settings-based days for rate
    let daysForRate = daysInMonth || 30;
    const resolvedOrgAccount = orgAccount || (orgAccountId ? { id: orgAccountId } : null);
    if (resolvedOrgAccount && dateKey) {
      const monthKey = String(dateKey).substring(0, 7);
      const settingsDays = await getSettingsPayableDays(resolvedOrgAccount, monthKey);
      if (settingsDays > 0) {
        daysForRate = settingsDays;
      }
    }

    // Recalculate dailySalary using settings-based daysForRate to guarantee accuracy
    const user = await User.findByPk(userId);
    let sv = {};
    if (user?.salaryValues) {
      try { sv = typeof user.salaryValues === 'string' ? JSON.parse(user.salaryValues) : user.salaryValues; } catch (e) { sv = {}; }
    }
    const basic = Number(user?.basicSalary || 0) || Number(sv?.earnings?.basic_salary || sv?.earnings?.BASIC_SALARY || 0);
    const da = Number(user?.da || 0) || Number(sv?.earnings?.da || sv?.earnings?.DA || 0);
    const baseSalary = Number(user?.grossSalary || 0) || Number(sv?.earnings?.gross_salary || sv?.earnings?.GROSS_SALARY || 0) || (basic + da);
    dailySalary = (daysForRate > 0) ? (baseSalary / daysForRate) : 0;

    const pType = finalRule.penaltyType || 'SLABS';
    let thresholds = finalRule.thresholds;
    if (typeof thresholds === 'string') {
      try { thresholds = JSON.parse(thresholds); } catch (e) { thresholds = []; }
    }
    if (!Array.isArray(thresholds)) thresholds = [];

    let matchedTier = null;
    let deductionAmount = 0;
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
        const hourlySalary = dailySalary / shiftHours;
        deductionAmount = hourlySalary * Number(threshold.value || 0);
      }
    }

    console.log(`[LatePunchInService] User: ${userId}, Raw Late: ${latePunchInMinutes}m, Buffer: ${buffer}m, Effective: ${effectiveLateMinutes}m, Type: ${pType}, Amount: ${deductionAmount.toFixed(2)}`);

    return {
      latePunchInMinutes,
      effectiveLateMinutes,
      bufferMinutes: buffer,
      latePunchInAmount: parseFloat(deductionAmount.toFixed(2)),
      tier: matchedTier,
      rule: finalRule,
      shiftHours: shiftHours,
      isLate: latePunchInMinutes > 0
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

    // Filter attendanceRows to keep only the earliest punch-in per unique date
    const uniqueDayRows = [];
    const seenDates = new Map(); // dateKey -> earliestRow

    for (const row of attendanceRows) {
      const dateKey = row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date || '').slice(0, 10);
      if (!dateKey) continue;

      if (!seenDates.has(dateKey)) {
        seenDates.set(dateKey, row);
      } else {
        const existing = seenDates.get(dateKey);
        // If this row has an earlier punch-in, replace the existing one
        if (row.punchedInAt && (!existing.punchedInAt || new Date(row.punchedInAt) < new Date(existing.punchedInAt))) {
          seenDates.set(dateKey, row);
        }
      }
    }
    const rows = Array.from(seenDates.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

    let totalPenalty = 0;
    let totalDays = 0;
    let lateCount = 0;

    // Recalculate/override dailySalary with settings-based daysForRate to guarantee accuracy
    let finalDailySalary = dailySalary;
    if (userId && orgAccountId && monthKey) {
      const settingsDays = await getSettingsPayableDays({ id: orgAccountId }, monthKey);
      const daysForRate = settingsDays > 0 ? settingsDays : 30;
      
      const user = await User.findByPk(userId);
      let sv = {};
      if (user?.salaryValues) {
        try { sv = typeof user.salaryValues === 'string' ? JSON.parse(user.salaryValues) : user.salaryValues; } catch (e) { sv = {}; }
      }
      const basic = Number(user?.basicSalary || 0) || Number(sv?.earnings?.basic_salary || sv?.earnings?.BASIC_SALARY || 0);
      const da = Number(user?.da || 0) || Number(sv?.earnings?.da || sv?.earnings?.DA || 0);
      const baseSalary = Number(user?.grossSalary || 0) || Number(sv?.earnings?.gross_salary || sv?.earnings?.GROSS_SALARY || 0) || (basic + da);
      finalDailySalary = baseSalary / daysForRate;
    }

    // We track occurrences per unique Rule+Tier combination
    const ruleOccurrences = {}; // { "ruleId_tierIndex": count }

    for (const row of rows) {
      // 1. Calculate raw penalty for this specific day
      const lp = await this.calculateLatePenalty(row, { id: orgAccountId }, 30, new Date(), finalDailySalary);

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
              rowPenalty = finalDailySalary * rowDays;
            } else if (pType === 'FIXED_AMOUNT') {
              rowPenalty = Number(tier.value || 0);
              rowDays = finalDailySalary > 0 ? (rowPenalty / finalDailySalary) : 0;
            } else if (pType === 'FIXED_AMOUNT_PER_HOUR') {
              const hours = Math.round(row.latePunchInMinutes / 60);
              rowPenalty = Number(tier.value || 0) * hours;
              rowDays = finalDailySalary > 0 ? (rowPenalty / finalDailySalary) : 0;
            } else if (pType === 'HALF_DAY') {
              rowDays = 0.5;
              rowPenalty = finalDailySalary * 0.5;
            } else if (pType === 'FULL_DAY') {
              rowDays = 1.0;
              rowPenalty = finalDailySalary;
            } else if (pType === 'SALARY_MULTIPLIER') {
              const shiftHours = lp.shiftHours || 8;
              const hourlySalary = finalDailySalary / shiftHours;
              rowPenalty = hourlySalary * Number(tier.value || 0);
              rowDays = finalDailySalary > 0 ? (rowPenalty / finalDailySalary) : 0;
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
