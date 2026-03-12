const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
  User, StaffProfile, StaffShiftAssignment, ShiftTemplate, SalaryAccess,
  StaffAttendanceAssignment, AttendanceTemplate, StaffSalaryAssignment, SalaryTemplate,
  Attendance, LeaveRequest, WeeklyOffTemplate, StaffWeeklyOffAssignment,
  HolidayTemplate, HolidayDate, StaffHolidayAssignment, PayrollCycle, PayrollLine,
  AppSetting, StaffLoan, OrgAccount, StaffSalesIncentive, SalesIncentiveRule,
  AttendanceAutomationRule, LeaveEncashment
} = require('../models');

const categoryNames = {
  'cl': 'Casual Leave',
  'sl': 'Sick Leave',
  'el': 'Earned Leave',
  'ml': 'Maternity Leave',
  'pt': 'Paternity Leave',
  'unpaid': 'Unpaid Leave'
};

function getMonthRange(monthKey) {
  const [yy, mm] = String(monthKey || '').split('-').map(Number);
  const start = `${monthKey}-01`;
  const end = new Date(yy, mm, 0);
  const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  return { yy, mm, start, end, endKey };
}

async function computeOvertimeMeta({ userId, monthKey, overtimeBaseSalary }) {
  const { start, endKey, end } = getMonthRange(monthKey);
  const rows = await Attendance.findAll({
    where: { userId, date: { [Op.gte]: start, [Op.lte]: endKey } },
    attributes: ['overtimeMinutes']
  });
  const overtimeMinutes = rows.reduce((s, r) => s + (Number(r.overtimeMinutes || 0) || 0), 0);
  const overtimeHours = overtimeMinutes / 60;
  const daysInMonth = Number(end.getDate() || 30);
  const hourlyRate = daysInMonth > 0 ? (Number(overtimeBaseSalary || 0) / (daysInMonth * 8)) : 0;
  const overtimePay = Math.round(Math.max(0, overtimeHours) * Math.max(0, hourlyRate));
  return {
    overtimeMinutes,
    overtimeHours: Number(overtimeHours.toFixed(2)),
    overtimeHourlyRate: Number(hourlyRate.toFixed(2)),
    overtimePay
  };
}

async function calculateSalary(userId, monthKey) {
  const u = await User.findByPk(userId, {
    include: [
      { association: 'profile' },
      { association: 'orgAccount', required: false },
      { model: SalaryTemplate, as: 'salaryTemplate' }
    ]
  });
  // If association not defined in User.js, fetch separately
  let staffProfile = u.profile;
  if (!staffProfile) {
    staffProfile = await StaffProfile.findOne({ where: { userId: u.id } });
    u.profile = staffProfile; // Attach for later
  }

  let orgAccount = u.orgAccount;
  if (!orgAccount && u.orgAccountId) {
    // const { OrgAccount } = require('../models'); // Already imported above
    orgAccount = await OrgAccount.findByPk(u.orgAccountId);
    u.orgAccount = orgAccount;
  }

  if (!u) throw new Error('User not found');

  // Check if payroll line exists for this month across ALL cycles for this monthKey
  const cycles = await PayrollCycle.findAll({ where: { monthKey }, order: [['id', 'DESC']] });
  let line = null;
  let cycle = null;
  for (const c of cycles) {
    const l = await PayrollLine.findOne({ where: { cycleId: c.id, userId: u.id } });
    if (l) { line = l; cycle = c; break; }
  }

  // Prepare to return data. Even if locked, we might need to refresh user details for PDF? 
  // But if locked, values are fixed.
  // If NOT locked, we calculate.

  // Logic for Loan Calculation (Only if calculating fresh/projected or updating)
  // We calculate it and add to 'deductions' if strictly implied.
  // Ideally, loan deduction should be part of 'salaryValues' or computed on fly.

  // Helper to calc loans
  const calculateLoanDeduction = async () => {
    // const { StaffLoan } = require('../models'); // Already imported above
    const activeLoans = await StaffLoan.findAll({
      where: { staffId: u.id, status: 'active' }
    });

    let totalLoanEmi = 0;
    const [targetYear, targetMonth] = monthKey.split('-').map(Number);

    for (const loan of activeLoans) {
      // Check if month is within range
      const startD = new Date(loan.startDate);
      // const loanStartMonthKey = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}`;

      // simple check: is targetMonth >= startMonth?
      // And is it within tenure?
      // Calculate month difference
      const mDiff = (targetYear - startD.getFullYear()) * 12 + (targetMonth - (startD.getMonth() + 1));

      if (mDiff >= 0 && mDiff < loan.tenure) {
        totalLoanEmi += Number(loan.emiAmount);
      }
    }
    return totalLoanEmi;
  };

  // 1. If PayrollLine exists, use it (recomputing totals to be safe)
  if (cycle && line) {
    // ... parse existing ...
    // We do NOT recalculate loans here if it's already generated/locked, 
    // UNLESS the user explicitly requested "regeneration" via the API which calls this.
    // But PayrollLine stores the snapshot.
    // If the user wants to see loan deduction, it must be IN the snapshot.
    // If it wasn't there, we can't magically add it without updating the Line.
    // But the PDF generation uses this data.

    let totalsObj = line.totals;
    if (typeof totalsObj === 'string') { try { totalsObj = JSON.parse(totalsObj); } catch (e) { totalsObj = {}; } }

    let earnings = line.earnings;
    if (typeof earnings === 'string') { try { earnings = JSON.parse(earnings); } catch (e) { earnings = {}; } }

    let incentives = line.incentives;
    if (typeof incentives === 'string') { try { incentives = JSON.parse(incentives); } catch (e) { incentives = {}; } }

    let deductions = line.deductions;
    if (typeof deductions === 'string') { try { deductions = JSON.parse(deductions); } catch (e) { deductions = {}; } }

    // Fix for missing attendance summary
    let attendanceSummary = line.attendanceSummary;
    if (attendanceSummary && typeof attendanceSummary === 'string') {
      try { attendanceSummary = JSON.parse(attendanceSummary); } catch (e) { attendanceSummary = null; }
    }
    if (!attendanceSummary && totalsObj.ratio !== undefined) {
      const [yy, mm] = monthKey.split('-').map(Number);
      const daysInMonth = new Date(yy, mm, 0).getDate();
      const payableDays = Math.round(totalsObj.ratio * daysInMonth);
      attendanceSummary = { present: payableDays, absent: daysInMonth - payableDays };
    }

    // Backfill overtime info for legacy lines that were generated before overtime pay support
    try {
      const overtimeBaseSalary = Number(earnings?.basic_salary || u.basicSalary || 0) + Number(earnings?.da || u.da || 0);
      const ot = await computeOvertimeMeta({ userId: u.id, monthKey, overtimeBaseSalary });
      if (ot.overtimePay > 0 && !Number(earnings?.overtime_pay || 0)) {
        earnings = { ...(earnings || {}), overtime_pay: ot.overtimePay };
      }
      attendanceSummary = {
        ...(attendanceSummary || {}),
        overtimeMinutes: Number(attendanceSummary?.overtimeMinutes || ot.overtimeMinutes || 0),
        overtimeHours: Number(attendanceSummary?.overtimeHours || ot.overtimeHours || 0),
        overtimeHourlyRate: Number(attendanceSummary?.overtimeHourlyRate || ot.overtimeHourlyRate || 0),
        overtimePay: Number(attendanceSummary?.overtimePay || ot.overtimePay || 0),
      };
      const te = Object.values(earnings || {}).reduce((s, v) => s + (Number(v) || 0), 0);
      const ti = Object.values(incentives || {}).reduce((s, v) => s + (Number(v) || 0), 0);
      const td = Object.values(deductions || {}).reduce((s, v) => s + (Number(v) || 0), 0);
      totalsObj = {
        ...(totalsObj || {}),
        totalEarnings: te,
        totalIncentives: ti,
        totalDeductions: td,
        grossSalary: te + ti,
        netSalary: te + ti - td,
      };
    } catch (_) { /* non-fatal */ }

    return {
      success: true,
      monthKey,
      totals: totalsObj,
      attendanceSummary: attendanceSummary || {},
      earnings: earnings || {},
      incentives: incentives || {},
      deductions: deductions || {},
      isProjected: false,
      user: u,
      paymentStatus: line.paidAt ? 'PAID' : 'DUE',
      generatedAt: line.createdAt,
      isGenerated: true,
      payslipPath: line.payslipPath
    };
  }

  // 2. Fallback: Live Compute (Projected Salary)
  // [Logic adapted from me.js live compute section]
  const [yy, mm] = monthKey.split('-').map(Number);
  const start = `${monthKey}-01`;
  const end = new Date(yy, mm, 0);
  const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

  const parseMaybe = (v) => { if (!v) return v; if (typeof v !== 'string') return v; try { v = JSON.parse(v); } catch { return v; } if (typeof v === 'string') { try { v = JSON.parse(v); } catch { } } return v; };

  let sv = parseMaybe(u.salaryValues || u.salary_values || null);
  const sd = {
    basicSalary: Number(u.basicSalary || 0),
    hra: Number(u.hra || 0),
    da: Number(u.da || 0),
    specialAllowance: Number(u.specialAllowance || 0),
    conveyanceAllowance: Number(u.conveyanceAllowance || 0),
    medicalAllowance: Number(u.medicalAllowance || 0),
    telephoneAllowance: Number(u.telephoneAllowance || 0),
    otherAllowances: Number(u.otherAllowances || 0),
    pfDeduction: Number(u.pfDeduction || 0),
    esiDeduction: Number(u.esiDeduction || 0),
    professionalTax: Number(u.professionalTax || 0),
    tdsDeduction: Number(u.tdsDeduction || 0),
    otherDeductions: Number(u.otherDeductions || 0),
  };

  let earnings = {}, incentives = {}, deductions = {};

  if (sv && typeof sv === 'object' && (sv.earnings || sv.deductions)) {
    const getVal = (v1, v2, fallback) => {
      const n = Number(v1 ?? v2);
      return Number.isFinite(n) && n !== 0 ? n : Number(fallback || 0);
    };

    earnings = {
      ...(sv.earnings || {}),
      basic_salary: getVal(sv.earnings?.BASIC_SALARY, sv.earnings?.basic_salary, sd.basicSalary),
      hra: getVal(sv.earnings?.HRA, sv.earnings?.hra, sd.hra),
      da: getVal(sv.earnings?.DA, sv.earnings?.da, sd.da),
      special_allowance: getVal(sv.earnings?.SPECIAL_ALLOWANCE, sv.earnings?.special_allowance, sd.specialAllowance),
    };
    incentives = (sv.incentives && typeof sv.incentives === 'object') ? sv.incentives : {};
    deductions = {
      ...(sv.deductions || {}),
      provident_fund: getVal(sv.deductions?.PROVIDENT_FUND_EMPLOYEE, sv.deductions?.provident_fund, sd.pfDeduction),
      esi: getVal(sv.deductions?.ESI_EMPLOYEE, sv.deductions?.esi, sd.esiDeduction),
      professional_tax: getVal(sv.deductions?.['PROFESSIONAL TAX'], sv.deductions?.professional_tax, sd.professionalTax),
    };
  } else {
    // Construct from flat fields
    earnings = {
      basic_salary: sd.basicSalary,
      hra: sd.hra,
      da: sd.da,
      special_allowance: sd.specialAllowance,
      conveyance_allowance: sd.conveyanceAllowance,
      medical_allowance: sd.medicalAllowance,
      telephone_allowance: sd.telephoneAllowance,
      other_allowances: sd.otherAllowances,
    };
    deductions = {
      provident_fund: sd.pfDeduction,
      esi: sd.esiDeduction,
      professional_tax: sd.professionalTax,
      tds: sd.tdsDeduction,
      other_deductions: sd.otherDeductions,
    };
  }

  // Smart Deduction Fallback (Rule-based) if stored values are 0
  if (u.salaryTemplate) {
    const tD = u.salaryTemplate.deductions ? (typeof u.salaryTemplate.deductions === 'string' ? JSON.parse(u.salaryTemplate.deductions) : u.salaryTemplate.deductions) : [];
    const getRule = (key) => (Array.isArray(tD) ? tD : []).find(d => d.key === key);

    if (Number(deductions.provident_fund || 0) === 0) {
      const pfRule = getRule('PROVIDENT_FUND_EMPLOYEE');
      if (pfRule && pfRule.type === 'percent' && (pfRule.meta?.basedOn === 'BASIC SALARY' || pfRule.meta?.basedOn === 'BASIC_SALARY')) {
        deductions.provident_fund = Math.round(Number(earnings.basic_salary || 0) * (Number(pfRule.valueNumber || 0) / 100));
      }
    }
    if (Number(deductions.esi || 0) === 0) {
      const esiRule = getRule('ESI_EMPLOYEE');
      if (esiRule && esiRule.type === 'percent' && (esiRule.meta?.basedOn === 'TOTAL EARNINGS' || esiRule.meta?.basedOn === 'TOTAL_EARNINGS')) {
        const currentGross = Object.values(earnings).reduce((s, v) => s + (Number(v) || 0), 0);
        deductions.esi = Math.round(currentGross * (Number(esiRule.valueNumber || 0) / 100));
      }
    }
  }

  // Calculate REAL attendance from database
  const atts = await Attendance.findAll({
    where: { userId: u.id, date: { [Op.gte]: start, [Op.lte]: endKey } },
    attributes: ['status', 'date']
  });
  const attMap = {};
  for (const a of atts) {
    attMap[String(a.date || '').slice(0, 10)] = String(a.status || '').toLowerCase();
  }

  // Build paid/unpaid leave sets from approved leave requests
  let paidLeaveSet = new Set();
  let unpaidLeaveSet = new Set();
  try {
    const lrs = await LeaveRequest.findAll({
      where: { userId: u.id, status: 'APPROVED', startDate: { [Op.lte]: endKey }, endDate: { [Op.gte]: start } }
    });
    for (const lr of (lrs || [])) {
      const lrStart = new Date(Math.max(new Date(String(lr.startDate)), new Date(start)));
      const lrEnd = new Date(Math.min(new Date(String(lr.endDate)), new Date(endKey)));
      let paidRem = Number(lr.paidDays || 0);
      let unpaidRem = Number(lr.unpaidDays || 0);
      for (let dte = new Date(lrStart); dte <= lrEnd; dte.setDate(dte.getDate() + 1)) {
        const k = `${dte.getFullYear()}-${String(dte.getMonth() + 1).padStart(2, '0')}-${String(dte.getDate()).padStart(2, '0')}`;
        if (paidRem > 0) { paidLeaveSet.add(k); paidRem -= 1; }
        else if (unpaidRem > 0) { unpaidLeaveSet.add(k); unpaidRem -= 1; }
        else { paidLeaveSet.add(k); }
      }
    }
  } catch (_) { }

  // Weekly off config (apply only when staff has an effective assignment in this month window)
  let woConfig = [];
  let hasWeeklyOffAssignment = false;
  try {
    if (WeeklyOffTemplate && StaffWeeklyOffAssignment) {
      const asg = await StaffWeeklyOffAssignment.findOne({
        where: {
          userId: u.id,
          effectiveFrom: { [Op.lte]: endKey },
          [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: start } }],
        },
        order: [['effectiveFrom', 'DESC'], ['id', 'DESC']]
      });
      if (asg) {
        hasWeeklyOffAssignment = true;
        const tpl = await WeeklyOffTemplate.findByPk(asg.weeklyOffTemplateId || asg.weekly_off_template_id);
        let rawCfg = tpl?.config;
        // Robust mult-stage parsing for potentially multi-stringified JSON
        while (typeof rawCfg === 'string' && rawCfg.trim().startsWith('[')) {
          try {
            const p = JSON.parse(rawCfg);
            if (p === rawCfg) break;
            rawCfg = p;
          } catch (e) { break; }
        }
        woConfig = Array.isArray(rawCfg) ? rawCfg : [];
      }
    }
  } catch (_) { }

  // Holiday set
  let holidaySet = new Set();
  const toDateKey = (v) => {
    if (!v) return '';
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
      return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
    }
    const raw = String(v);
    const m = raw.match(/\d{4}-\d{2}-\d{2}/);
    if (m && m[0]) return m[0];
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return '';
  };
  try {
    let hasg = await StaffHolidayAssignment.findOne({
      where: {
        userId: u.id,
        effectiveFrom: { [Op.lte]: endKey },
        [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: start } }],
      },
      order: [['effectiveFrom', 'DESC'], ['id', 'DESC']],
    });
    if (hasg) {
      const tplId = Number(hasg.holidayTemplateId || hasg.holiday_template_id);
      const hs = Number.isFinite(tplId)
        ? await HolidayDate.findAll({
          where: {
            holidayTemplateId: tplId,
            active: { [Op.not]: false },
            date: { [Op.gte]: start, [Op.lte]: endKey },
          },
          attributes: ['date', 'active'],
        })
        : [];
      holidaySet = new Set(
        hs
          .map(h => ({ h, key: toDateKey(h?.date) }))
          .filter(x => x.h && x.h.active !== false && x.key && x.key >= start && x.key <= endKey)
          .map(x => x.key)
      );
    } else {
      // No holiday assignment for this staff in org -> do not apply org-wide holidays.
      holidaySet = new Set();
    }
  } catch (_) { }

  // Helper to check weekly off
  const isWeeklyOffForDate = (configArray, jsDate) => {
    try {
      let config = configArray;
      // Robust mult-stage parsing for potentially multi-stringified JSON
      while (typeof config === 'string' && config.trim().startsWith('[')) {
        try {
          const p = JSON.parse(config);
          if (p === config) break;
          config = p;
        } catch (e) { break; }
      }
      if (!Array.isArray(config)) return false;

      const dow = jsDate.getDay(); // 0=Sun
      const wk = Math.floor((jsDate.getDate() - 1) / 7) + 1; // 1..5
      for (const cfg of config) {
        if (cfg && Number(cfg.day) === dow) {
          if (cfg.weeks === 'all') return true;
          if (Array.isArray(cfg.weeks) && cfg.weeks.includes(wk)) return true;
        }
      }
      return false;
    } catch (_) { return false; }
  };

  // Classify calendar days (for current month, only count till today)
  let present = 0, half = 0, leave = 0, paidLeaveCount = 0, unpaidLeave = 0, weeklyOffCount = 0, holidaysCount = 0, absent = 0;
  const daysInMonth = end.getDate();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isCurrentMonth = Number(yy) === now.getFullYear() && Number(mm) === (now.getMonth() + 1);

  for (let dnum = 1; dnum <= daysInMonth; dnum++) {
    const dt = new Date(yy, mm - 1, dnum);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dnum).padStart(2, '0')}`;
    const s = attMap[key];

    // For current month projection, future days are absent unless explicitly marked with work/leave state.
    // For current month projection, future days are not counted toward absence/work unless explicitly entered.
    if (isCurrentMonth && dt > todayStart && (!s || s === 'weekly_off' || s === 'holiday')) {
      // Still count Weekly Off and Holidays in projection for full month gross calculation
      const isWO = hasWeeklyOffAssignment ? isWeeklyOffForDate(woConfig, dt) : false;
      const isH = holidaySet.has(key);
      if (isH || s === 'holiday') { holidaysCount += 1; }
      else if (isWO || s === 'weekly_off') { weeklyOffCount += 1; }
      continue;
    }

    if (s === 'present') { present += 1; continue; }
    if (s === 'half_day') { half += 1; continue; }
    if (s === 'leave') { leave += 1; if (paidLeaveSet.has(key)) paidLeaveCount += 1; else if (unpaidLeaveSet.has(key)) unpaidLeave += 1; continue; }
    if (s === 'weekly_off') { weeklyOffCount += 1; continue; }
    if (s === 'holiday') { holidaysCount += 1; continue; }

    // No explicit attendance or 'absent' marked: check if it's a WO/Holiday first
    const isWO = hasWeeklyOffAssignment ? isWeeklyOffForDate(woConfig, dt) : false;
    const isH = holidaySet.has(key);

    if (isH) { holidaysCount += 1; continue; }
    if (isWO) { weeklyOffCount += 1; continue; }

    if (s === 'absent') { absent += 1; continue; }

    // For past days with no record at all
    if (paidLeaveSet.has(key)) { leave += 1; paidLeaveCount += 1; }
    else if (unpaidLeaveSet.has(key)) { leave += 1; unpaidLeave += 1; }
    else {
      // Only count as absent if the date is in the past (today or before)
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (dt <= today) { absent += 1; }
    }
  }

  const payableUnitsRaw = present + (half * 0.5) + weeklyOffCount + holidaysCount + paidLeaveCount;

  // Late Entry Penalty Logic
  let lateCount = 0;
  let latePenaltyDays = 0;
  try {
    const penaltyRule = await AttendanceAutomationRule.findOne({
      where: { key: 'late_punchin_penalty', orgAccountId: u.orgAccountId, active: true }
    });
    if (penaltyRule) {
      let config = penaltyRule.config;
      if (typeof config === 'string') {
        try { config = JSON.parse(config); } catch (e) {
          try { config = JSON.parse(JSON.parse(config)); } catch (__) { config = {}; }
        }
      }

      const isRuleActive = config.active !== false && penaltyRule.active;
      if (isRuleActive) {
        let tiers = [];
        if (Array.isArray(config.tiers) && config.tiers.length > 0) {
          tiers = config.tiers;
        } else {
          tiers = [{
            minMinutes: Number(config.lateMinutes || 15),
            maxMinutes: 9999,
            deduction: Number(config.deduction || 1),
            frequency: Number(config.threshold || 3)
          }];
        }

        let tierCounts = new Array(tiers.length).fill(0);

        // Fetch detailed attendance for the month
        const detailedAtts = await Attendance.findAll({
          where: { userId: u.id, date: { [Op.gte]: start, [Op.lte]: endKey } },
          attributes: ['date', 'punchedInAt', 'status']
        });

        // Pre-fetch all shift templates and assignments for the month
        const allShiftTemplates = await ShiftTemplate.findAll({ where: { orgAccountId: u.orgAccountId, active: true } });
        const shiftTemplateMap = {};
        allShiftTemplates.forEach(t => { shiftTemplateMap[t.id] = t; });

        const shiftAssignments = await StaffShiftAssignment.findAll({
          where: { userId: u.id },
          include: [{ model: ShiftTemplate, as: 'template' }],
          order: [['effectiveFrom', 'ASC']]
        });

        for (const a of detailedAtts) {
          if (!a.punchedInAt) continue;

          // Check if it's a work status (present/half_day/overtime)
          const status = String(a.status || '').toLowerCase();
          if (status !== 'present' && status !== 'half_day' && status !== 'overtime') continue;

          const dateKey = a.date;
          const dayShiftAsg = shiftAssignments
            .filter(asg => dateKey >= asg.effectiveFrom && (!asg.effectiveTo || dateKey <= asg.effectiveTo))
            .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

          let shiftTpl = dayShiftAsg?.template || u.shiftTemplate;
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

              for (let i = 0; i < tiers.length; i++) {
                const t = tiers[i];
                if (lateMins >= Number(t.minMinutes) && lateMins <= Number(t.maxMinutes)) {
                  tierCounts[i] += 1;
                  lateCount += 1;
                  break;
                }
              }
            }
          }
        }

        for (let i = 0; i < tiers.length; i++) {
          const t = tiers[i];
          if (t.frequency > 0 && tierCounts[i] > 0) {
            latePenaltyDays += Math.floor(tierCounts[i] / t.frequency) * Number(t.deduction);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error calculating late penalty:', err);
  }

  const payableUnits = Math.max(0, payableUnitsRaw - latePenaltyDays);
  const daysForRatio = daysInMonth;
  const ratio = daysForRatio > 0 ? Math.max(0, Math.min(1, payableUnits / daysForRatio)) : 1;

  const loanDeduction = await calculateLoanDeduction();

  // Re-construct deductions for live compute to include loan
  // Re-construct deductions for live compute
  // Use the deductions object which already has merged values from sv and flat columns
  let liveDeductions = { ...deductions };

  // Ensure basic keys are present and mapped from any aliases
  if (!liveDeductions.provident_fund && sd.pfDeduction) liveDeductions.provident_fund = sd.pfDeduction;
  if (!liveDeductions.esi && sd.esiDeduction) liveDeductions.esi = sd.esiDeduction;
  if (!liveDeductions.professional_tax && sd.professionalTax) liveDeductions.professional_tax = sd.professionalTax;
  if (!liveDeductions.income_tax && sd.tdsDeduction) liveDeductions.income_tax = sd.tdsDeduction;
  if (!liveDeductions.other_deductions && sd.otherDeductions) liveDeductions.other_deductions = sd.otherDeductions;

  if (loanDeduction > 0) {
    liveDeductions['loan_emi'] = loanDeduction;
  }

  const finalEarnings = { ...earnings };
  const finalIncentives = incentives;
  const finalDeductions = liveDeductions;

  // FETCH SETTLED EXPENSES
  try {
    const { ExpenseClaim } = require('../models');
    const settledExpenses = await ExpenseClaim.findAll({
      where: {
        userId: u.id,
        status: 'settled',
        settledAt: { [Op.gte]: start, [Op.lte]: endKey }
      }
    });

    for (const exp of settledExpenses) {
      const label = `EXPENSE: ${exp.expenseType || 'Claim'}`;
      finalEarnings[label] = (finalEarnings[label] || 0) + Number(exp.approvedAmount || exp.amount || 0);
    }
  } catch (e) {
    console.error('Error fetching expenses for payroll:', e);
  }

  const sumObj = (o) => Object.values(o || {}).reduce((s, v) => s + (Number(v) || 0), 0);

  // Pro-rate deductions (Except LOAN_EMI)
  Object.keys(finalDeductions).forEach(k => {
    if (k !== 'loan_emi') {
      finalDeductions[k] = Math.round(Number(finalDeductions[k] || 0) * ratio);
    }
  });
  const totalDeductions = sumObj(finalDeductions);

  // Pro-rate standard incentives
  Object.keys(finalIncentives).forEach(k => {
    finalIncentives[k] = Math.round(Number(finalIncentives[k] || 0) * ratio);
  });

  // FETCH APPROVED SALES INCENTIVES (Not pro-rated)
  try {
    const approvedIncentives = await StaffSalesIncentive.findAll({
      where: {
        staffUserId: u.id,
        status: 'approved',
        approvedAt: { [Op.gte]: start, [Op.lte]: endKey }
      },
      include: [{ model: SalesIncentiveRule, as: 'rule', attributes: ['name'] }]
    });

    for (const inc of approvedIncentives) {
      const label = `SALES_INCENTIVE: ${inc.rule?.name || 'Incentive'}`;
      finalIncentives[label] = (finalIncentives[label] || 0) + Number(inc.incentiveAmount || 0);
    }
  } catch (e) {
    console.error('Error fetching sales incentives for payroll:', e);
  }
  const totalIncentives = sumObj(finalIncentives);

  // Pro-rate standard earnings, keep Expenses as is
  Object.keys(finalEarnings).forEach(k => {
    if (!k.startsWith('EXPENSE:')) {
      finalEarnings[k] = Math.round(Number(finalEarnings[k] || 0) * ratio);
    }
  });

  // FETCH APPROVED LEAVE ENCASHMENTS (Not pro-rated)
  try {
    const encashments = await LeaveEncashment.findAll({
      where: {
        userId: u.id,
        status: 'APPROVED',
        monthKey: monthKey
      }
    });

    for (const enc of encashments) {
      // Calculate amount if not already stored: (Basic + DA) / 30 * days
      // Or if staff has a specific Rate, use that. For now, we take from flat fields.
      let amount = Number(enc.amount || 0);
      if (amount <= 0) {
        const base = Number(earnings?.basic_salary || sd.basicSalary || 0) + Number(earnings?.da || sd.da || 0);
        const dailyRate = base / 30; // Standard 30 days month for encashment calculation
        amount = Math.round(dailyRate * Number(enc.days || 0));
      }
      const catName = categoryNames[enc.categoryKey.toLowerCase()] || enc.categoryKey.toUpperCase();
      const label = `LEAVE_ENCASHMENT: ${catName}`;
      finalEarnings[label] = (finalEarnings[label] || 0) + amount;
    }
  } catch (e) {
    console.error('Error fetching leave encashment for payroll:', e);
  }

  // Overtime pay
  const overtimeBaseSalary = Number(earnings?.basic_salary || sd.basicSalary || 0) + Number(earnings?.da || sd.da || 0);
  const overtimeMeta = await computeOvertimeMeta({ userId: u.id, monthKey, overtimeBaseSalary });
  if (overtimeMeta.overtimePay > 0) {
    finalEarnings.overtime_pay = overtimeMeta.overtimePay;
  }

  const totalEarnings = sumObj(finalEarnings);

  const grossSalary = totalEarnings + totalIncentives;
  const netSalary = grossSalary - totalDeductions;

  return {
    success: true,
    monthKey,
    totals: {
      totalEarnings,
      totalIncentives,
      totalDeductions,
      grossSalary,
      netSalary,
      ratio
    },
    attendanceSummary: {
      present, half, leave, paidLeave: paidLeaveCount, unpaidLeave,
      absent: absent + unpaidLeave + latePenaltyDays, weeklyOff: weeklyOffCount, holidays: holidaysCount, ratio,
      lateCount, latePenaltyDays,
      overtimeMinutes: overtimeMeta.overtimeMinutes,
      overtimeHours: overtimeMeta.overtimeHours,
      overtimeHourlyRate: overtimeMeta.overtimeHourlyRate,
      overtimePay: overtimeMeta.overtimePay,
    },
    earnings: finalEarnings,
    incentives: finalIncentives,
    deductions: finalDeductions,
    isProjected: true,
    isGenerated: false,
    payslipPath: null,
    user: u,
    paymentStatus: 'ESTIMATED',
    generatedAt: new Date()
  };
}

async function generatePayslipPDF(data, savePath = null) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const { user, monthKey, earnings, incentives, deductions, totals, attendanceSummary, generatedAt } = data;

  const { OrgBusinessInfo } = require('../models');

  // Get Details
  const employeeName = user.profile ? user.profile.name : (user.name || user.fullName || 'Unknown');
  const employeeId = user.profile ? user.profile.staffId : user.id;
  const department = user.profile ? user.profile.department : (user.department || '-');
  const designation = user.profile ? user.profile.designation : (user.designation || '-');

  let businessName = 'ThinkTech Solutions';
  let logoHtml = '';

  if (user.orgAccount) {
    businessName = user.orgAccount.name;
    // Fetch Business Info for Logo
    try {
      const bizInfo = await OrgBusinessInfo.findOne({ where: { orgAccountId: user.orgAccount.id } });
      if (bizInfo && bizInfo.logoUrl) {
        // Construct absolute path. logoUrl is likely like '/uploads/logos/...'
        // Remove leading slash if present to join with process.cwd()
        const cleanPath = bizInfo.logoUrl.startsWith('/') ? bizInfo.logoUrl.slice(1) : bizInfo.logoUrl;
        const logoPath = path.join(process.cwd(), cleanPath);

        if (fs.existsSync(logoPath)) {
          const bitmap = fs.readFileSync(logoPath);
          const base64 = Buffer.from(bitmap).toString('base64');
          // Guess mime type based on extension
          const ext = path.extname(logoPath).toLowerCase();
          const mime = ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png');
          logoHtml = `<img src="data:${mime};base64,${base64}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;" />`;
        }
      }
    } catch (e) {
      console.error('Error fetching logo:', e);
    }
  }

  // Format amounts
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const dateFmt = (d) => new Date(d).toLocaleDateString('en-IN');

  // Prepare rows
  const earningRows = Object.entries(earnings || {}).map(([k, v]) =>
    `<tr><td>${k.replace(/_/g, ' ').toUpperCase()}</td><td class="text-right">${fmt(v)}</td></tr>`
  ).join('');

  const incentiveRows = Object.entries(incentives || {}).map(([k, v]) =>
    `<tr><td>${k.replace(/_/g, ' ').toUpperCase()} (Inc.)</td><td class="text-right">${fmt(v)}</td></tr>`
  ).join('');

  const deductionRows = Object.entries(deductions || {}).map(([k, v]) =>
    `<tr><td>${k.replace(/_/g, ' ').toUpperCase()}</td><td class="text-right">${fmt(v)}</td></tr>`
  ).join('');

  // Attendance details
  const att = attendanceSummary || {};
  const workDays = att.present !== undefined ?
    (Number(att.present || 0) + Number(att.absent || 0) + Number(att.paidLeave || 0) + Number(att.weeklyOff || 0) + Number(att.holidays || 0))
    : new Date(new Date(monthKey + '-01').getFullYear(), new Date(monthKey + '-01').getMonth() + 1, 0).getDate();
  const overtimeHours = Number(att.overtimeHours || 0);
  const overtimeMinutes = Number(att.overtimeMinutes || 0);
  const overtimeRate = Number(att.overtimeHourlyRate || 0);
  const overtimePay = Number(att.overtimePay || (earnings && earnings.overtime_pay) || 0);
  const showOvertime = overtimeMinutes > 0 || overtimePay > 0;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payslip ${monthKey}</title>
      <style>
        body { font-family: Helvetica, Arial, sans-serif; padding: 40px; color: #000; max-width: 800px; margin: 0 auto; line-height: 1.5; }
        .header { text-align: center; margin-bottom: 20px; }
        .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .doc-title { font-size: 14px; }
        
        .grid-header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
        .info-col { font-size: 12px; }
        .info-row { margin-bottom: 4px; }
        
        .tables-container { display: flex; gap: 20px; margin-bottom: 20px; }
        .table-box { flex: 1; }
        
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { text-align: left; font-weight: bold; border-bottom: 1px solid #000; padding: 5px; }
        td { padding: 5px; }
        .text-right { text-align: right; }
        .amount-col { width: 80px; }
        
        .total-row td { font-weight: bold; border-top: 1px solid #000; padding-top: 5px; }
        
        .net-pay-container { text-align: center; margin-top: 20px; margin-bottom: 40px; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 10px; }
        .net-pay { font-size: 16px; font-weight: bold; }
        
        .signatures { display: flex; justify-content: space-between; margin-top: 50px; font-size: 12px; }
        .sig-box { width: 200px; text-align: center; }
        .sig-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; }
        
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #555; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoHtml ? `<div>${logoHtml}</div>` : ''}
        <div class="company-name">${businessName}</div>
        <div class="doc-title">Payslip for the month of ${new Date(monthKey + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
      </div>

      <div class="grid-header">
        <div class="info-col">
          <div class="info-row"><strong>Employee Name:</strong> ${employeeName}</div>
          <div class="info-row"><strong>Employee ID:</strong> ${employeeId}</div>
          <div class="info-row"><strong>Department:</strong> ${department}</div>
          <div class="info-row"><strong>Designation:</strong> ${designation}</div>
        </div>
        <div class="info-col" style="text-align: right;">
          <div class="info-row"><strong>Pay Period:</strong> ${monthKey}</div>
          <div class="info-row"><strong>Status:</strong> ${data.isPaid || data.paidAt ? 'PAID' : 'DUE'}</div>
          <div class="info-row"><strong>Generated:</strong> ${dateFmt(generatedAt || new Date())}</div>
          <div class="info-row"><strong>Working Days:</strong> ${workDays}</div>
          ${showOvertime ? `<div class="info-row"><strong>Overtime:</strong> ${overtimeHours.toFixed(2)}h (${overtimeMinutes}m)</div>` : ''}
          ${showOvertime ? `<div class="info-row"><strong>OT Rate:</strong> ${fmt(overtimeRate)}/hr</div>` : ''}
          ${showOvertime ? `<div class="info-row"><strong>OT Pay:</strong> ${fmt(overtimePay)}</div>` : ''}
        </div>
      </div>

      <div class="tables-container">
        <div class="table-box">
          <table>
            <thead>
              <tr>
                <th>EARNINGS</th>
                <th class="text-right amount-col">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${earningRows}
              ${incentiveRows}
              <!-- Spacer rows if needed to align height could go here -->
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td>Total</td>
                <td class="text-right">${fmt((totals.totalEarnings || 0) + (totals.totalIncentives || 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div class="table-box">
          <table>
            <thead>
              <tr>
                <th>DEDUCTIONS</th>
                <th class="text-right amount-col">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${deductionRows}
            </tbody>
             <tfoot>
              <tr class="total-row">
                <td>Total</td>
                <td class="text-right">${fmt(totals.totalDeductions)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="net-pay-container">
        <div class="net-pay">Net Salary: ${fmt(totals.netSalary)}</div>
      </div>

      <div class="signatures">
        <div class="sig-box">
          <div>Employee Signature</div>
          <div class="sig-line"></div>
        </div>
        <div class="sig-box">
          <div>Employer Signature</div>
          <div class="sig-line"></div>
        </div>
      </div>

      <div class="footer">
        Generated on ${new Date().toLocaleString('en-IN')} <br>
        This is a computer generated document.
      </div>
    </body>
    </html>
    `;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  if (savePath) {
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(savePath, pdfBuffer);
  }

  return pdfBuffer;
}

module.exports = {
  calculateSalary,
  generatePayslipPDF
};
