const { EarlyExitRule, StaffEarlyExitAssignment, User, StaffShiftAssignment, ShiftTemplate, StaffRoster } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const shiftService = require('./shiftService');
const { getSettingsPayableDays } = require('../utils/salarySettingsHelper');

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

    // Check if woHolidayAsOt is enabled for this employee and it is a WO/Holiday
    let woHolidayAsOtEnabled = false;
    let isWoOrHoliday = false;
    try {
      const { StaffProfile } = require('../models');
      const profile = await StaffProfile.findOne({ where: { userId } });
      let extraObj = {};
      if (profile && profile.extra) {
        extraObj = typeof profile.extra === 'string' ? JSON.parse(profile.extra) : profile.extra;
      }
      woHolidayAsOtEnabled = !!extraObj?.woHolidayAsOt;
      if (woHolidayAsOtEnabled) {
        const { checkIfDateIsWoOrHoliday } = require('./overtimeService');
        const { isWO, isH } = await checkIfDateIsWoOrHoliday(userId, orgAccountId, dateKey);
        isWoOrHoliday = isWO || isH;
      }
    } catch (e) {
      console.error('Error checking woHolidayAsOt in earlyExitService:', e);
    }

    if (woHolidayAsOtEnabled && isWoOrHoliday) {
      return {
        earlyExitMinutes: 0,
        earlyExitAmount: 0,
        earlyExitRuleId: null
      };
    }

    // 1. Identify Shift End Time (Always identify shift to get raw minutes)
    const shift = await shiftService.getEffectiveShiftTemplate(userId, dateKey);
    let rawSlots = [];
    if (shift?.timeSlots) {
      try { rawSlots = Array.isArray(shift.timeSlots) ? shift.timeSlots : JSON.parse(shift.timeSlots); } catch (_) { rawSlots = []; }
    } else if (shift?.time_slots) {
      try { rawSlots = Array.isArray(shift.time_slots) ? shift.time_slots : JSON.parse(shift.time_slots); } catch (_) { rawSlots = []; }
    }

    let earlyExitMinutes = 0;

    if (rawSlots.length > 1) {
      // Multi-slot / Split shift: calculate early exit for each completed slot and sum up
      try {
        const { AttendancePunch } = require('../models');
        const punches = await AttendancePunch.findAll({
          where: { userId, date: dateKey },
          order: [['punchNumber', 'ASC']]
        });
        const shiftDate = dayjs(dateKey);
        for (let i = 0; i < rawSlots.length; i++) {
          const slot = rawSlots[i];
          const punch = punches[i];
          if (slot && slot.endTime && punch && punch.punchedOutAt) {
            const [sh, sm] = (slot.startTime || '00:00').split(':').map(Number);
            const [eh, em, es] = slot.endTime.split(':').map(Number);
            const outAtLocal = dayjs(punch.punchedOutAt).second(0).millisecond(0);
            let slotStartLocal = shiftDate.hour(sh).minute(sm).second(0).millisecond(0);
            let slotEndLocal = shiftDate.hour(eh).minute(em).second(es || 0).millisecond(0);
            if (slotEndLocal.isBefore(slotStartLocal)) {
              slotEndLocal = slotEndLocal.add(1, 'day');
            }
            if (outAtLocal.isBefore(slotEndLocal)) {
              const diffMins = slotEndLocal.diff(outAtLocal, 'minute');
              if (diffMins > 0) {
                earlyExitMinutes += diffMins;
              }
            }
          }
        }
      } catch (err) {
        console.error('[EarlyExitService] Error calculating multi-slot early exit:', err);
      }
    } else if (shift && shift.shiftType !== 'open' && shift.endTime) {
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
    } else if (shift && (shift.shiftType === 'open' || (!shift.startTime && !shift.endTime)) && attendance.punchedInAt) {
      const grossWorkMins = Number(shift.workMinutes) || 480;
      const inAtLocal = dayjs(attendance.punchedInAt).second(0).millisecond(0);
      const outAtLocal = dayjs(punchedOutAt).second(0).millisecond(0);
      const dynamicEnd = inAtLocal.add(grossWorkMins, 'minute');
      if (outAtLocal.isBefore(dynamicEnd)) {
        earlyExitMinutes = dynamicEnd.diff(outAtLocal, 'minute');
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
    const gross = Number(user?.grossSalary || 0) || Number(sv?.earnings?.gross_salary || sv?.earnings?.GROSS_SALARY || 0) || (basic + da);
    dailySalary = (daysForRate > 0) ? (gross / daysForRate) : 0;

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
          const unpaidBreak = Number(shift?.unpaidBreakMinutes || 0);
          if (unpaidBreak > 0 && shiftWorkMins > unpaidBreak) {
            shiftWorkMins = shiftWorkMins - unpaidBreak;
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
