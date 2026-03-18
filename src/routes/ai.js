const express = require('express');
const { Op } = require('sequelize');
const { 
  User, StaffProfile, Attendance, SalaryTemplate, StaffSalaryAssignment, 
  SalaryForecast, StaffWeeklyOffAssignment, WeeklyOffTemplate, 
  StaffHolidayAssignment, HolidayTemplate, HolidayDate, LeaveRequest,
  ShiftTemplate, StaffShiftAssignment, AttendanceAutomationRule, LeaveEncashment,
  Appraisal, Subscription, Plan
} = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { tenantEnforce } = require('../middleware/tenant');
const aiProvider = require('../services/aiProvider');
const dayjs = require('dayjs');

const router = express.Router();

router.use(authRequired);
router.use(requireRole(['admin', 'superadmin']));
router.use(tenantEnforce);

// Helper: check if a JS Date is a weekly off based on weeklyOffConfig
function isWeeklyOffDay(configArray, jsDate) {
  try {
    let config = configArray;
    while (typeof config === 'string' && config.trim().startsWith('[')) {
      try { const p = JSON.parse(config); if (p === config) break; config = p; } catch (_) { break; }
    }
    if (!Array.isArray(config) || config.length === 0) return false;
    const dow = jsDate.getDay();
    const wk = Math.floor((jsDate.getDate() - 1) / 7) + 1;
    for (const cfg of config) {
      if (cfg && Number(cfg.day) === dow) {
        const weeks = cfg.weeks;
        if (weeks === 'all') return true;
        const normWeeks = Array.isArray(weeks) ? weeks.map(Number) : (Number.isFinite(Number(weeks)) ? [Number(weeks)] : []);
        if (normWeeks.includes(0) || normWeeks.includes(wk)) return true;
      }
    }
    return false;
  } catch (_) { return false; }
}

// Build accurate local assumptions based on real attendance data
function buildLocalAssumptions(userData, forecastNetPay, today) {
  const { attendance, baseSalary } = userData;
  const { present = 0, absent = 0, halfDay = 0, totalLogs = 0, weeklyOffs = 0, holidays = 0, paidLeave = 0, latePenaltyDays = 0, lateCount = 0, overtimeMinutes = 0 } = attendance || {};
  const leaveEncashmentAmount = userData.leaveEncashmentAmount || 0;
  const dayOfMonth = today.date();

  let attendanceTrend;
  if (totalLogs === 0 && weeklyOffs === 0 && holidays === 0) {
    attendanceTrend = `${dayOfMonth} days have elapsed this month but no attendance records found yet.`;
  } else {
    const parts = [];
    if (present > 0) parts.push(`${present} present`);
    if (halfDay > 0) parts.push(`${halfDay} half-day`);
    if (absent > 0) parts.push(`${absent} absent`);
    if (weeklyOffs > 0) parts.push(`${weeklyOffs} weekly off`);
    if (holidays > 0) parts.push(`${holidays} holiday`);
    if (paidLeave > 0) parts.push(`${paidLeave} paid leave`);
    if (lateCount > 0) parts.push(`${lateCount} late arrival(s) → ${latePenaltyDays} penalty day(s)`);
    if (overtimeMinutes > 0) parts.push(`${Math.round(overtimeMinutes / 60 * 10) / 10}h overtime`);
    attendanceTrend = parts.length > 0 ? `${parts.join(', ')} in ${dayOfMonth} elapsed days.` : `${dayOfMonth} days elapsed, no records yet.`;
  }

  const holidayCount = holidays || 0;
  const leaveCount = paidLeave || 0;
  let rosterImpact;
  const rosterParts = [];
  if (weeklyOffs > 0) rosterParts.push(`${weeklyOffs} weekly off(s) (paid)`);
  if (holidayCount > 0) rosterParts.push(`${holidayCount} public holiday(s) (paid)`);
  if (leaveCount > 0) rosterParts.push(`${leaveCount} approved leave(s) (paid)`);
  if (leaveEncashmentAmount > 0) {
    const encDetails = (userData.encashmentDetails || []).map(e => `${e.category}: ${e.days}d = ₹${e.amount?.toLocaleString()}`).join(', ');
    rosterParts.push(`Leave encashment: ${encDetails || '₹' + leaveEncashmentAmount.toLocaleString()}`);
  }
  rosterImpact = rosterParts.length > 0 ? rosterParts.join(' | ') + '.' : 'No weekly offs, holidays, leaves or encashments this month.';

  const deduction = (baseSalary || 0) - Math.round(forecastNetPay || 0);
  let summary;
  if (totalLogs === 0 && weeklyOffs === 0 && holidays === 0) {
    summary = `No attendance data found yet for this month. Showing full salary as estimate — please verify.`;
  } else if (deduction > 0) {
    const reasons = [];
    if (absent > 0) reasons.push(`${absent} absent day(s)`);
    if (halfDay > 0) reasons.push(`${halfDay} half-day(s)`);
    if (latePenaltyDays > 0) reasons.push(`${latePenaltyDays} late penalty day(s)`);
    summary = `Estimated ₹${deduction.toLocaleString()} deduction due to ${reasons.join(' and ')}.`;
    if (leaveEncashmentAmount > 0) summary += ` Leave encashment of ₹${leaveEncashmentAmount.toLocaleString()} added.`;
  } else {
    summary = `Full pay expected. No unexcused absents or half-days recorded so far.`;
    if (leaveEncashmentAmount > 0) summary += ` Plus ₹${leaveEncashmentAmount.toLocaleString()} leave encashment.`;
  }

  return { attendanceTrend, rosterImpact, summary };
}

// Local rule-based forecast — uses same ratio method as payroll
function calculateLocalForecastNetPay(userData) {
  const { baseSalary, attendance, monthContext } = userData;
  const { present = 0, halfDay = 0, weeklyOffs = 0, holidays = 0, paidLeave = 0, latePenaltyDays = 0, overtimeMinutes = 0 } = attendance || {};
  const totalDays = monthContext?.totalDaysInMonth || 31;
  const leaveEncashmentAmount = userData.leaveEncashmentAmount || 0;

  // Payable units so far (present + 0.5*half + weeklyOffs + holidays + paidLeave - latePenalty)
  const payableUnits = Math.max(0, present + (halfDay * 0.5) + weeklyOffs + holidays + paidLeave - latePenaltyDays);

  // For remaining future days, project WOs + holidays + assume present
  const futureWO = monthContext?.futureWeeklyOffs || 0;
  const futureHol = monthContext?.futureHolidays || 0;
  const futureDays = monthContext?.daysRemaining || 0;
  const futureWorkDays = Math.max(0, futureDays - futureWO - futureHol);
  const projectedPayable = payableUnits + futureWO + futureHol + futureWorkDays;

  const ratio = totalDays > 0 ? Math.max(0, Math.min(1, projectedPayable / totalDays)) : 1;
  
  // Overtime pay (same as payroll: (basic+da) / (daysInMonth * 8) * overtimeHours)
  const overtimeHours = overtimeMinutes / 60;
  const hourlyRate = baseSalary / (totalDays * 8);
  const overtimePay = Math.round(overtimeHours * hourlyRate);

  return Math.max(0, Math.round(baseSalary * ratio) + overtimePay + leaveEncashmentAmount);
}

router.get('/salary-forecast', async (req, res) => {
  try {
    const orgId = req.tenantOrgAccountId;
    const now = dayjs();
    const month = now.month() + 1;
    const year = now.year();
    const startDate = now.startOf('month').format('YYYY-MM-DD');
    const endDate = now.endOf('month').format('YYYY-MM-DD');
    const dayOfMonth = now.date();
    const totalDaysInMonth = now.daysInMonth();

    // 1. Fetch active staff with all necessary assignments and attendance
    const users = await User.findAll({
      where: { orgAccountId: orgId, role: 'staff', active: true },
      include: [
        { model: StaffProfile, as: 'profile' },
        {
          model: StaffSalaryAssignment,
          as: 'salaryAssignments',
          include: [{ model: SalaryTemplate, as: 'template' }]
        },
        {
          model: Attendance,
          as: 'attendance',
          where: {
            date: { [Op.between]: [startDate, endDate] }
          },
          required: false
        },
        {
          model: StaffWeeklyOffAssignment,
          as: 'weeklyOffAssignments',
          include: [{ model: WeeklyOffTemplate, as: 'template' }]
        },
        {
          model: StaffHolidayAssignment,
          as: 'holidayAssignments',
          include: [{ 
            model: HolidayTemplate, 
            as: 'template',
            include: [{ 
              model: HolidayDate, 
              as: 'holidays',
              where: { date: { [Op.between]: [startDate, endDate] } },
              required: false
            }]
          }]
        }
      ]
    });

    // Fetch approved leaves separately for the month
    const leaves = await LeaveRequest.findAll({
      where: {
        orgAccountId: orgId,
        status: 'APPROVED',
        [Op.or]: [
          { startDate: { [Op.between]: [startDate, endDate] } },
          { endDate: { [Op.between]: [startDate, endDate] } }
        ]
      }
    });

    // Fetch late penalty rule for the org
    let latePenaltyTiers = [];
    try {
      const penaltyRule = await AttendanceAutomationRule.findOne({
        where: { key: 'late_punchin_penalty', orgAccountId: orgId, active: true }
      });
      if (penaltyRule) {
        let config = penaltyRule.config;
        if (typeof config === 'string') {
          try { config = JSON.parse(config); } catch (e) {
            try { config = JSON.parse(JSON.parse(config)); } catch (__) { config = {}; }
          }
        }
        if (config.active !== false) {
          if (Array.isArray(config.tiers) && config.tiers.length > 0) {
            latePenaltyTiers = config.tiers;
          } else {
            latePenaltyTiers = [{
              minMinutes: Number(config.lateMinutes || 15),
              maxMinutes: 9999,
              deduction: Number(config.deduction || 1),
              frequency: Number(config.threshold || 3)
            }];
          }
        }
      }
    } catch (err) { console.error('AI: Error fetching late penalty rule:', err); }

    // Pre-fetch all shift templates for the org
    const allShiftTemplates = await ShiftTemplate.findAll({ where: { orgAccountId: orgId, active: true } });
    const shiftTemplateMap = {};
    allShiftTemplates.forEach(t => { shiftTemplateMap[t.id] = t; });

    // Fetch leave encashments for the month
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const allEncashments = await LeaveEncashment.findAll({
      where: { orgAccountId: orgId, status: 'APPROVED', monthKey }
    });

    // 2. Prepare detailed data for AI — day-by-day classification matching payroll logic
    const aiInput = [];
    for (const u of users) {
      // --- Salary: try StaffSalaryAssignment template first, then User salaryValues, then direct fields ---
      const assignments = u.salaryAssignments || [];
      const activeAsg = assignments
        .filter(a => {
          const start = dayjs(a.effectiveFrom);
          const end = a.effectiveTo ? dayjs(a.effectiveTo) : null;
          return (start.isBefore(now) || start.isSame(now, 'day')) && (!end || end.isAfter(now) || end.isSame(now, 'day'));
        })
        .sort((a, b) => dayjs(b.effectiveFrom).diff(dayjs(a.effectiveFrom)))[0];

      const template = activeAsg?.template;
      const templateEarnings = template?.earnings || [];
      let totalGross = templateEarnings.reduce((sum, e) => sum + (Number(e.valueNumber) || 0), 0);

      // --- Build earnings breakdown (matching payroll logic) for encashment/overtime ---
      // Helper: find value from template earnings array by key
      const findTemplateEarning = (key) => {
        const found = templateEarnings.find(e => (e.key || '').toLowerCase() === key.toLowerCase());
        return Number(found?.valueNumber || 0);
      };

      let earningsBasic = 0, earningsDA = 0;

      if (totalGross > 0) {
        // From template earnings array
        earningsBasic = findTemplateEarning('BASIC_SALARY') || findTemplateEarning('basic_salary') || findTemplateEarning('Basic Salary');
        earningsDA = findTemplateEarning('DA') || findTemplateEarning('da') || findTemplateEarning('Dearness Allowance');
      }

      if (!totalGross) {
        try {
          let sv = u.salaryValues;
          if (typeof sv === 'string') sv = JSON.parse(sv);
          const svE = (sv && typeof sv === 'object' && sv.earnings) ? sv.earnings : null;
          if (svE) {
            totalGross = Object.values(svE).reduce((s, v) => s + (Number(v) || 0), 0);
            earningsBasic = Number(svE.BASIC_SALARY || svE.basic_salary || 0);
            earningsDA = Number(svE.DA || svE.da || 0);
          }
        } catch (_) {}
      }

      if (!totalGross) {
        totalGross = (Number(u.basicSalary || 0) + Number(u.hra || 0) + Number(u.da || 0) +
          Number(u.specialAllowance || 0) + Number(u.conveyanceAllowance || 0) +
          Number(u.medicalAllowance || 0) + Number(u.telephoneAllowance || 0) + Number(u.otherAllowances || 0));
        earningsBasic = Number(u.basicSalary || 0);
        earningsDA = Number(u.da || 0);
      }

      // Fallback: if still no basic found, use totalGross as base
      if (!earningsBasic && totalGross) {
        earningsBasic = totalGross;
      }

      const salaryNotConfigured = !totalGross;
      if (!totalGross) totalGross = 20000;

      // --- Build attendance map (date -> status) ---
      const att = u.attendance || [];
      const attMap = {};
      for (const r of att) {
        const d = r.date || r.createdAt;
        if (!d) continue;
        const key = typeof d === 'string' ? d.slice(0, 10) : dayjs(d).format('YYYY-MM-DD');
        attMap[key] = String(r.status || '').toLowerCase();
      }
      const overtimeMinutes = att.reduce((sum, r) => sum + (Number(r.overtimeMinutes) || 0), 0);

      // --- Weekly Off config ---
      const woAsg = (u.weeklyOffAssignments || []).sort((a, b) => dayjs(b.effectiveFrom).diff(dayjs(a.effectiveFrom)))[0];
      const weeklyOffConfig = woAsg?.template?.config || [];
      const hasWO = weeklyOffConfig.length > 0;

      // --- Holidays set ---
      const holAsg = (u.holidayAssignments || []).sort((a, b) => dayjs(b.effectiveFrom).diff(dayjs(a.effectiveFrom)))[0];
      const holidayDates = holAsg?.template?.holidays?.map(d => d.date) || [];
      const holidaySet = new Set(holidayDates.map(d => typeof d === 'string' ? d.slice(0, 10) : dayjs(d).format('YYYY-MM-DD')));

      // --- Approved leaves set ---
      const userLeaves = leaves.filter(l => l.userId === u.id);
      const paidLeaveSet = new Set();
      for (const lv of userLeaves) {
        let d = dayjs(lv.startDate);
        const end = dayjs(lv.endDate);
        while (d.isBefore(end) || d.isSame(end, 'day')) {
          paidLeaveSet.add(d.format('YYYY-MM-DD'));
          d = d.add(1, 'day');
        }
      }

      // --- Day-by-day classification (matching payroll logic) ---
      let present = 0, absent = 0, halfDay = 0, weeklyOffs = 0, holidays = 0, paidLeave = 0;
      // Also compute future WO + holidays for projection
      let futureWeeklyOffs = 0, futureHolidays = 0;

      for (let d = 1; d <= totalDaysInMonth; d++) {
        const dt = new Date(year, month - 1, d);
        const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const s = attMap[key]; // status from DB (lowercase)
        const isFuture = d > dayOfMonth; // today and future

        if (isFuture) {
          // Future: only count WO/Holiday for projection, don't count as absent
          const isWO = hasWO ? isWeeklyOffDay(weeklyOffConfig, dt) : false;
          const isH = holidaySet.has(key);
          if (s === 'holiday' || isH) { holidays++; futureHolidays++; }
          else if (s === 'weekly_off' || isWO) { weeklyOffs++; futureWeeklyOffs++; }
          else if (s === 'present' || s === 'overtime') { present++; }
          else if (s === 'half_day') { halfDay++; }
          else if (s === 'leave' || paidLeaveSet.has(key)) { paidLeave++; }
          // else: future day with no data — don't count
          continue;
        }

        // Past/today: day-by-day just like payroll
        if (s === 'present' || s === 'overtime') { present++; continue; }
        if (s === 'half_day') { halfDay++; continue; }
        if (s === 'leave') { paidLeave++; continue; }
        if (s === 'weekly_off') { weeklyOffs++; continue; }
        if (s === 'holiday') { holidays++; continue; }

        // No explicit status — check WO/Holiday/Leave by config
        const isWO = hasWO ? isWeeklyOffDay(weeklyOffConfig, dt) : false;
        const isH = holidaySet.has(key);

        if (isH) { holidays++; continue; }
        if (isWO) { weeklyOffs++; continue; }
        if (s === 'absent') { absent++; continue; }
        if (paidLeaveSet.has(key)) { paidLeave++; continue; }

        // Past day with no record at all → absent (same as payroll)
        if (d < dayOfMonth) { absent++; }
        // Today with no record: don't count yet (day not finished)
      }

      // --- Late Penalty Calculation (same as payroll) ---
      let lateCount = 0;
      let latePenaltyDays = 0;
      if (latePenaltyTiers.length > 0) {
        try {
          const shiftAssignments = await StaffShiftAssignment.findAll({
            where: { userId: u.id },
            include: [{ model: ShiftTemplate, as: 'template' }],
            order: [['effectiveFrom', 'ASC']]
          });

          const tierCounts = new Array(latePenaltyTiers.length).fill(0);

          for (const a of att) {
            if (!a.punchedInAt) continue;
            const status = String(a.status || '').toLowerCase();
            if (status !== 'present' && status !== 'half_day' && status !== 'overtime') continue;

            const dateKey = typeof a.date === 'string' ? a.date.slice(0, 10) : dayjs(a.date).format('YYYY-MM-DD');
            const dayShiftAsg = shiftAssignments
              .filter(asg => dateKey >= asg.effectiveFrom && (!asg.effectiveTo || dateKey <= asg.effectiveTo))
              .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

            let shiftTpl = dayShiftAsg?.template;
            if (!shiftTpl && u.profile?.shiftSelection) {
              shiftTpl = shiftTemplateMap[Number(u.profile.shiftSelection)];
            }

            if (shiftTpl?.startTime) {
              const [sh, sm, ss] = shiftTpl.startTime.split(':').map(Number);
              const shiftStartSeconds = sh * 3600 + sm * 60 + (ss || 0);

              const punchIn = new Date(a.punchedInAt);
              const istDate = new Date(punchIn.getTime() + (5.5 * 3600 * 1000));
              const punchInSeconds = istDate.getUTCHours() * 3600 + istDate.getUTCMinutes() * 60 + istDate.getUTCSeconds();

              if (punchInSeconds > shiftStartSeconds) {
                const lateMins = Math.floor((punchInSeconds - shiftStartSeconds) / 60);
                for (let i = 0; i < latePenaltyTiers.length; i++) {
                  const t = latePenaltyTiers[i];
                  if (lateMins >= Number(t.minMinutes) && lateMins <= Number(t.maxMinutes)) {
                    tierCounts[i] += 1;
                    lateCount += 1;
                    break;
                  }
                }
              }
            }
          }

          for (let i = 0; i < latePenaltyTiers.length; i++) {
            const t = latePenaltyTiers[i];
            if (t.frequency > 0 && tierCounts[i] > 0) {
              latePenaltyDays += Math.floor(tierCounts[i] / t.frequency) * Number(t.deduction);
            }
          }
        } catch (err) { console.error('AI: Error calculating late penalty for user:', u.id, err); }
      }

      // --- Leave Encashment (matching payroll: (basic+DA) / 30 * days) ---
      let leaveEncashmentAmount = 0;
      const encashmentDetails = [];
      const userEncashments = allEncashments.filter(e => e.userId === u.id);
      for (const enc of userEncashments) {
        let amount = Number(enc.amount || 0);
        if (amount <= 0) {
          const base = earningsBasic + earningsDA;
          const dailyRate = base / 30;
          amount = Math.round(dailyRate * Number(enc.days || 0));
        }
        leaveEncashmentAmount += amount;
        encashmentDetails.push({
          category: enc.categoryKey,
          days: Number(enc.days || 0),
          amount
        });
      }

      // --- Overtime Pay (matching payroll: (basic+DA) / (daysInMonth * 8) * hours) ---
      const overtimeHours = overtimeMinutes / 60;
      const basicForOT = earningsBasic + earningsDA;
      const overtimeHourlyRate = totalDaysInMonth > 0 ? basicForOT / (totalDaysInMonth * 8) : 0;
      const overtimePay = Math.round(overtimeHours * overtimeHourlyRate);

      aiInput.push({
        userId: u.id,
        name: u.profile?.name || u.phone,
        baseSalary: totalGross,
        salaryNotConfigured,
        leaveEncashmentAmount,
        encashmentDetails,
        overtimePay,
        attendance: {
          present,
          absent,
          halfDay,
          overtimeMinutes,
          weeklyOffs,
          holidays,
          paidLeave,
          lateCount,
          latePenaltyDays,
          totalLogs: att.length
        },
        roster: {
          weeklyOffConfig,
          holidaysThisMonth: holidayDates,
          approvedLeaves: userLeaves.map(l => ({ start: l.startDate, end: l.endDate, type: l.leaveType }))
        },
        monthContext: {
          todayDate: now.format('YYYY-MM-DD'),
          dayOfMonth,
          totalDaysInMonth,
          daysRemaining: totalDaysInMonth - dayOfMonth,
          futureWeeklyOffs,
          futureHolidays
        }
      });
    }

    // 3. Call AI for individual forecasts (with local fallback)
    let forecasts = await aiProvider.forecastSalary({ month, year, users: aiInput });

    if (!forecasts) {
      // Local fallback: rule-based calculation
      forecasts = aiInput.map(u => ({
        userId: u.userId,
        forecastNetPay: calculateLocalForecastNetPay(u),
        assumptions: buildLocalAssumptions(u, calculateLocalForecastNetPay(u), now)
      }));
    }

    // 4. Calculate Total Organization Forecast
    const totalBaseSalary = aiInput.reduce((sum, u) => sum + u.baseSalary, 0);
    const totalForecastedPay = forecasts.reduce((sum, f) => sum + (f.forecastNetPay || 0), 0);
    
    // 5. Generate Next Month Projection using formula:
    // Next Month Forecast = Current Payroll + Expected Overtime + Increment Impact + New Hiring Salary - Expected Deductions
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthDays = dayjs(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`).daysInMonth();
    const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    const nextMonthEnd = dayjs(nextMonthStart).endOf('month').format('YYYY-MM-DD');

    // --- A) Current Payroll (this month forecasted net = base line) ---
    const currentPayroll = totalForecastedPay;

    // --- B) Staff Limit from subscription/plan ---
    let staffLimit = 0;
    try {
      const sub = await Subscription.findOne({
        where: { orgAccountId: orgId, status: 'active' },
        include: [{ model: Plan, as: 'plan' }],
        order: [['createdAt', 'DESC']]
      });
      staffLimit = sub?.staffLimit || sub?.plan?.staffLimit || 0;
    } catch (e) { console.error('AI: Error fetching staff limit:', e); }

    const currentStaffCount = users.length;
    const canHireMore = staffLimit > 0 ? Math.max(0, staffLimit - currentStaffCount) : 0;

    // --- C) Expected Overtime (project from current trend, slightly regressed) ---
    const totalOvertimeMin = aiInput.reduce((s, u) => s + (u.attendance?.overtimeMinutes || 0), 0);
    const totalOvertimePay = aiInput.reduce((s, u) => s + (u.overtimePay || 0), 0);
    // Project: current month OT adjusted for full month, then apply 85% regression
    const otProjectionFactor = dayOfMonth > 0 ? (totalDaysInMonth / dayOfMonth) : 1;
    const expectedOvertime = Math.round(totalOvertimePay * otProjectionFactor * 0.85);
    // Remove current OT from currentPayroll to avoid double count, then add projected
    const currentPayrollWithoutOT = currentPayroll - totalOvertimePay;

    // --- D) Increment Impact (appraisals effective next month) ---
    let incrementImpact = 0;
    const incrementDetails = [];
    try {
      const upcomingAppraisals = await Appraisal.findAll({
        where: {
          orgAccountId: orgId,
          status: 'COMPLETED',
          effectiveFrom: { [Op.between]: [nextMonthStart, nextMonthEnd] }
        }
      });
      for (const appr of upcomingAppraisals) {
        const staffInput = aiInput.find(u => u.userId === appr.userId);
        if (staffInput && appr.score > 0) {
          const hikePercent = Number(appr.score);
          const monthlyIncrease = Math.round(staffInput.baseSalary * hikePercent / 100);
          incrementImpact += monthlyIncrease;
          const staffUser = users.find(u => u.id === appr.userId);
          incrementDetails.push({
            name: staffUser?.profile?.name || `User ${appr.userId}`,
            hikePercent,
            monthlyIncrease
          });
        }
      }
    } catch (e) { console.error('AI: Error fetching appraisals:', e); }

    // --- E) New Hiring Salary (estimate avg salary * possible new hires) ---
    const avgSalaryPerStaff = currentStaffCount > 0 ? Math.round(totalBaseSalary / currentStaffCount) : 0;
    // We can't predict exact new hires, but show capacity
    // Don't add new hiring salary automatically — just show the capacity info
    const newHiringSalary = 0; // No automatic projection — shown as capacity info

    // --- F) Expected Deductions (project absent/half-day/late trends into next month) ---
    const totalAbsent = aiInput.reduce((s, u) => s + (u.attendance?.absent || 0), 0);
    const totalHalfDay = aiInput.reduce((s, u) => s + (u.attendance?.halfDay || 0), 0);
    const totalLatePenalty = aiInput.reduce((s, u) => s + (u.attendance?.latePenaltyDays || 0), 0);
    const totalEncashment = aiInput.reduce((s, u) => s + (u.leaveEncashmentAmount || 0), 0);
    
    // Per-staff deduction: use actual absent rate to project next month
    // Average absent days per staff per elapsed day
    const absentRatePerDay = dayOfMonth > 0 && currentStaffCount > 0 
      ? totalAbsent / (currentStaffCount * dayOfMonth) 
      : 0;
    const halfDayRatePerDay = dayOfMonth > 0 && currentStaffCount > 0
      ? totalHalfDay / (currentStaffCount * dayOfMonth)
      : 0;
    // Project for next month: absent days * per-day salary
    const avgPerDaySalary = currentStaffCount > 0 ? totalBaseSalary / (currentStaffCount * nextMonthDays) : 0;
    const projectedAbsentDays = Math.round(absentRatePerDay * nextMonthDays * currentStaffCount);
    const projectedHalfDays = Math.round(halfDayRatePerDay * nextMonthDays * currentStaffCount);
    const expectedDeductions = Math.round(
      (projectedAbsentDays * avgPerDaySalary) + 
      (projectedHalfDays * avgPerDaySalary * 0.5) +
      (totalLatePenalty * avgPerDaySalary) // carry same late penalty
    );
    // Encashment: don't carry forward (one-time)
    const expectedEncashment = 0;

    // --- FORMULA: Next Month = Base Salaries + Increment - Deductions + Overtime + Encashment ---
    const nextMonthForecast = Math.max(0, Math.round(
      totalBaseSalary + incrementImpact + newHiringSalary - expectedDeductions + expectedOvertime + expectedEncashment
    ));

    // Build breakdown reasons
    const reasons = [];
    reasons.push(`Current month payroll: ₹${currentPayroll.toLocaleString()} for ${currentStaffCount} staff.`);
    if (expectedOvertime > 0) reasons.push(`Overtime projected at ₹${expectedOvertime.toLocaleString()} (85% of current trend).`);
    if (expectedOvertime === 0 && totalOvertimePay > 0) reasons.push(`Overtime was ₹${totalOvertimePay.toLocaleString()} this month, projected to continue.`);
    if (incrementImpact > 0) reasons.push(`Salary increments of ₹${incrementImpact.toLocaleString()} effective next month for ${incrementDetails.length} staff.`);
    if (expectedDeductions > 0) reasons.push(`Expected deductions of ₹${expectedDeductions.toLocaleString()} based on ~${projectedAbsentDays} projected absent days and ~${projectedHalfDays} half-days.`);
    if (staffLimit > 0) reasons.push(`Staff limit: ${staffLimit}. Current: ${currentStaffCount}. ${canHireMore > 0 ? `Can hire ${canHireMore} more (avg ₹${avgSalaryPerStaff.toLocaleString()}/staff).` : 'At capacity.'}`);
    if (totalEncashment > 0) reasons.push(`Leave encashment (₹${totalEncashment.toLocaleString()}) not carried to next month.`);

    const rationale = reasons.join(' ');

    const nextMonthData = {
      amount: nextMonthForecast,
      rationale,
      breakdown: {
        currentPayroll,
        basePay: totalBaseSalary,
        expectedOvertime,
        incrementImpact,
        incrementDetails,
        newHiringSalary,
        expectedDeductions,
        expectedEncashment,
        staffLimit: staffLimit || null,
        currentStaffCount,
        canHireMore,
        avgSalaryPerStaff
      }
    };

    // 6. Save (Individual) to DB and return
    const results = [];
    for (const f of forecasts) {
      const user = users.find(u => u.id === f.userId);
      if (!user) continue;

      const inputData = aiInput.find(input => input.userId === f.userId);
      const baseSalary = inputData?.baseSalary || 0;
      const salaryNotConfigured = inputData?.salaryNotConfigured || false;

      // Always override AI assumptions with locally-computed accurate text
      const localAssumptions = buildLocalAssumptions(inputData, f.forecastNetPay, now);

      await SalaryForecast.upsert({
        userId: f.userId,
        month,
        year,
        forecastNetPay: f.forecastNetPay,
        assumptions: localAssumptions
      });

      results.push({
        ...f,
        assumptions: localAssumptions,
        baseSalary,
        salaryNotConfigured,
        userName: user.profile?.name || user.phone,
        designation: user.profile?.designation,
        attendance: inputData.attendance,
        leaveEncashmentAmount: inputData.leaveEncashmentAmount || 0,
        encashmentDetails: inputData.encashmentDetails || [],
        overtimePay: inputData.overtimePay || 0
      });
    }

    return res.json({ 
      success: true, 
      month, 
      year, 
      forecasts: results,
      summary: {
        totalStaff: users.length,
        totalBaseSalary,
        totalForecastedPay,
        totalEncashment: results.reduce((s, r) => s + (r.leaveEncashmentAmount || 0), 0),
        totalOvertime: results.reduce((s, r) => s + (r.overtimePay || 0), 0),
        avgAttendance: results.length > 0 ? Math.round(results.reduce((s, r) => s + (r.attendance?.present || 0), 0) / results.length) : 0,
        totalAbsent: results.reduce((s, r) => s + (r.attendance?.absent || 0), 0),
        totalLatePenalty: results.reduce((s, r) => s + (r.attendance?.latePenaltyDays || 0), 0),
        nextMonth: {
          amount: nextMonthData.amount,
          rationale: nextMonthData.rationale,
          breakdown: nextMonthData.breakdown || null,
          monthLabel: `${nextMonth}/${nextYear}`
        },
        // AI Insights: top risks and highlights
        insights: (() => {
          const ins = [];
          const highAbsent = results.filter(r => (r.attendance?.absent || 0) >= 3).sort((a, b) => (b.attendance?.absent || 0) - (a.attendance?.absent || 0));
          if (highAbsent.length > 0) {
            ins.push({ type: 'warning', title: 'High Absenteeism Alert', desc: `${highAbsent.length} staff with 3+ absents: ${highAbsent.slice(0, 3).map(r => r.userName).join(', ')}${highAbsent.length > 3 ? '...' : ''}` });
          }
          const lateStaff = results.filter(r => (r.attendance?.latePenaltyDays || 0) > 0);
          if (lateStaff.length > 0) {
            ins.push({ type: 'warning', title: 'Late Penalty Deductions', desc: `${lateStaff.length} staff incurred late penalties totaling ${lateStaff.reduce((s, r) => s + (r.attendance?.latePenaltyDays || 0), 0)} penalty day(s).` });
          }
          const encStaff = results.filter(r => (r.leaveEncashmentAmount || 0) > 0);
          if (encStaff.length > 0) {
            ins.push({ type: 'success', title: 'Leave Encashment Payable', desc: `₹${encStaff.reduce((s, r) => s + r.leaveEncashmentAmount, 0).toLocaleString()} encashment for ${encStaff.length} staff.` });
          }
          const otStaff = results.filter(r => (r.overtimePay || 0) > 0);
          if (otStaff.length > 0) {
            ins.push({ type: 'info', title: 'Overtime Earnings', desc: `₹${otStaff.reduce((s, r) => s + r.overtimePay, 0).toLocaleString()} overtime for ${otStaff.length} staff.` });
          }
          const zeroPay = results.filter(r => (r.forecastNetPay || 0) === 0);
          if (zeroPay.length > 0) {
            ins.push({ type: 'error', title: 'Zero Pay Forecast', desc: `${zeroPay.length} staff projected at ₹0: ${zeroPay.slice(0, 3).map(r => r.userName).join(', ')}. Verify attendance data.` });
          }
          const saving = totalBaseSalary - totalForecastedPay;
          if (saving > 0) {
            ins.push({ type: 'info', title: 'Cost Savings', desc: `Projected savings of ₹${saving.toLocaleString()} vs configured base (${Math.round(saving / totalBaseSalary * 100)}% reduction due to absences/deductions).` });
          }
          if (ins.length === 0) {
            ins.push({ type: 'success', title: 'All Good', desc: 'No critical alerts. Payroll looks healthy this month.' });
          }
          return ins;
        })()
      }
    });
  } catch (error) {
    console.error('Error in AI Salary Forecast:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate AI forecast' });
  }
});

module.exports = router;

