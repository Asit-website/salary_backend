const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const axios = require('axios');
const {
  User, StaffProfile, StaffShiftAssignment, ShiftTemplate, SalaryAccess,
  StaffAttendanceAssignment, AttendanceTemplate, StaffSalaryAssignment, SalaryTemplate,
  Attendance, LeaveRequest, WeeklyOffTemplate, StaffWeeklyOffAssignment,
  HolidayTemplate, HolidayDate, StaffHolidayAssignment, PayrollCycle, PayrollLine,
  AppSetting, StaffLoan, OrgAccount, StaffSalesIncentive, SalesIncentiveRule,
  AttendanceAutomationRule, LeaveEncashment, StaffAdvance, TenureBonusRule, StaffTenureBonusAssignment
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

function calculateTenureMonths(joiningDate, targetMonthKey) {
  if (!joiningDate) return 0;
  const join = new Date(joiningDate);
  const [targetYear, targetMonth] = targetMonthKey.split('-').map(Number);
  // Target date is the last day of the payroll month for tenure completion check
  const targetEnd = new Date(targetYear, targetMonth, 0);

  let months = (targetEnd.getFullYear() - join.getFullYear()) * 12 + (targetEnd.getMonth() - join.getMonth());
  if (targetEnd.getDate() < join.getDate()) {
    months--;
  }
  return Math.max(0, months);
}

async function computeOvertimeMeta({ userId, monthKey, overtimeBaseSalary, orgAccount }) {
  const { start, endKey, end } = getMonthRange(monthKey);
  const rows = await Attendance.findAll({
    where: { userId, date: { [Op.gte]: start, [Op.lte]: endKey } },
    attributes: ['id', 'userId', 'orgAccountId', 'overtimeMinutes', 'overtimeAmount', 'overtimeRuleId', 'totalWorkHours', 'date', 'punchedInAt', 'punchedOutAt']
  });

  const { calculateOvertime } = require('./overtimeService');
  const daysInMonth = Number(end.getDate() || 30);

  let totalOvertimeMinutes = 0;
  let totalOvertimePay = 0;

  for (const row of rows) {
    // Try both camelCase and snake_case to be extra safe against model mapping issues
    let otAmount = Number(row.overtimeAmount !== undefined ? row.overtimeAmount : (row.getDataValue ? row.getDataValue('overtime_amount') : (row.overtime_amount || 0)));
    let otMinutes = Number(row.overtimeMinutes !== undefined ? row.overtimeMinutes : (row.getDataValue ? row.getDataValue('overtime_minutes') : (row.overtime_minutes || 0)));

    console.log(`[Payroll-OT] Row: ${row.date}, Amt: ${otAmount}, Min: ${otMinutes}`);

    // If an Automation Rule is active and amount is missing, calculate it
    if (orgAccount?.overtimeRuleId && otAmount <= 0 && otMinutes > 0) {
      const result = await calculateOvertime(row, orgAccount, row.punchedOutAt, daysInMonth);
      otAmount = result.overtimeAmount;
      otMinutes = result.overtimeMinutes;
    }

    totalOvertimeMinutes += otMinutes;
    totalOvertimePay += otAmount;
  }

  const overtimeHours = totalOvertimeMinutes / 60;
  const hourlyRate = daysInMonth > 0 ? (Number(overtimeBaseSalary || 0) / (daysInMonth * 8)) : 0;

  const hasActiveRule = Number(orgAccount?.overtimeRuleId) > 0;
  console.log(`[Payroll-OT] Final - User: ${userId}, TotalMin: ${totalOvertimeMinutes}, TotalPay: ${totalOvertimePay}, RuleActive: ${hasActiveRule}`);

  if (!hasActiveRule && totalOvertimePay <= 0 && totalOvertimeMinutes > 0) {
    totalOvertimePay = Math.round(Math.max(0, overtimeHours) * Math.max(0, hourlyRate));
    console.log(`[Payroll-OT] Fallback applied: ${totalOvertimePay}`);
  }

  return {
    overtimeMinutes: totalOvertimeMinutes,
    overtimeHours: Number(overtimeHours.toFixed(2)),
    overtimeHourlyRate: Number(hourlyRate.toFixed(2)),
    overtimePay: totalOvertimePay
  };
}

async function computeEarlyOvertimeMeta({ userId, monthKey, orgAccount }) {
  const { start, endKey, end } = getMonthRange(monthKey);
  const rows = await Attendance.findAll({
    where: { userId, date: { [Op.gte]: start, [Op.lte]: endKey } },
    attributes: ['id', 'userId', 'orgAccountId', 'earlyOvertimeMinutes', 'earlyOvertimeAmount', 'earlyOvertimeRuleId', 'date', 'punchedInAt']
  });

  const { calculateEarlyOvertime } = require('./earlyOvertimeService');
  const daysInMonth = Number(end.getDate() || 30);

  let totalEarlyOvertimeMinutes = 0;
  let totalEarlyOvertimePay = 0;

  for (const row of rows) {
    let eotAmount = Number(row.earlyOvertimeAmount !== undefined ? row.earlyOvertimeAmount : (row.getDataValue ? row.getDataValue('early_overtime_amount') : (row.early_overtime_amount || 0)));
    let eotMinutes = Number(row.earlyOvertimeMinutes !== undefined ? row.earlyOvertimeMinutes : (row.getDataValue ? row.getDataValue('early_overtime_minutes') : (row.early_overtime_minutes || 0)));

    if (orgAccount?.earlyOvertimeRuleId && eotAmount <= 0 && eotMinutes > 0) {
      const result = await calculateEarlyOvertime(row, orgAccount, row.punchedInAt, daysInMonth);
      eotAmount = result.earlyOvertimeAmount;
      eotMinutes = result.earlyOvertimeMinutes;
    }

    totalEarlyOvertimeMinutes += eotMinutes;
    totalEarlyOvertimePay += eotAmount;
  }

  return {
    earlyOvertimeMinutes: totalEarlyOvertimeMinutes,
    earlyOvertimePay: totalEarlyOvertimePay
  };
}

async function computeEarlyExitMeta({ userId, monthKey, orgAccount }) {
  const { start, endKey, end } = getMonthRange(monthKey);
  const daysInMonth = Number(end.getDate() || 30);
  const rows = await Attendance.findAll({
    where: { userId, date: { [Op.gte]: start, [Op.lte]: endKey } },
    attributes: ['id', 'userId', 'orgAccountId', 'earlyExitMinutes', 'earlyExitAmount', 'earlyExitRuleId', 'date', 'punchedOutAt']
  });

  const earlyExitService = require('./earlyExitService');

  let totalEarlyExitMinutes = 0;
  let totalEarlyExitPenalty = 0;

  for (const row of rows) {
    let eeAmount = Number(row.earlyExitAmount !== undefined ? row.earlyExitAmount : (row.getDataValue ? row.getDataValue('early_exit_amount') : (row.early_exit_amount || 0)));
    let eeMinutes = Number(row.earlyExitMinutes !== undefined ? row.earlyExitMinutes : (row.getDataValue ? row.getDataValue('early_exit_minutes') : (row.early_exit_minutes || 0)));

    // If an Automation Rule is active and amount is missing, calculate it
    if (orgAccount?.earlyExitRuleId && eeAmount <= 0 && eeMinutes > 0) {
      const result = await earlyExitService.calculateEarlyExit(row, orgAccount, row.punchedOutAt, daysInMonth);
      eeAmount = result.earlyExitAmount;
      eeMinutes = result.earlyExitMinutes;
    }

    totalEarlyExitMinutes += eeMinutes;
    totalEarlyExitPenalty += eeAmount;
  }

  return {
    earlyExitMinutes: totalEarlyExitMinutes,
    earlyExitPenalty: totalEarlyExitPenalty
  };
}

async function computeBreakMeta({ userId, monthKey, orgAccount }) {
  const { start, endKey, end } = getMonthRange(monthKey);
  const daysInMonth = Number(end.getDate() || 30);
  const rows = await Attendance.findAll({
    where: { userId, date: { [Op.gte]: start, [Op.lte]: endKey } },
    attributes: ['id', 'userId', 'orgAccountId', 'breakDeductionAmount', 'excessBreakMinutes', 'breakRuleId', 'date', 'punchedOutAt', 'breakTotalSeconds']
  });

  const breakService = require('./breakService');

  let totalExcessBreakMinutes = 0;
  let totalBreakPenalty = 0;

  for (const row of rows) {
    let bAmount = Number(row.breakDeductionAmount !== undefined ? row.breakDeductionAmount : (row.getDataValue ? row.getDataValue('break_deduction_amount') : (row.break_deduction_amount || 0)));
    let bMinutes = Number(row.excessBreakMinutes !== undefined ? row.excessBreakMinutes : (row.getDataValue ? row.getDataValue('excess_break_minutes') : (row.excess_break_minutes || 0)));

    // Re-calculate if rule is active but no penalty saved
    if (orgAccount?.breakRuleId && bAmount <= 0 && (row.breakTotalSeconds || 0) > 0) {
      const result = await breakService.calculateBreakDeduction(row, orgAccount, row.punchedOutAt, daysInMonth);
      bAmount = result.breakDeductionAmount;
      bMinutes = result.excessBreakMinutes;
    }

    totalExcessBreakMinutes += bMinutes;
    totalBreakPenalty += bAmount;
  }

  return {
    excessBreakMinutes: totalExcessBreakMinutes,
    breakPenalty: totalBreakPenalty
  };
}

async function computeLatePenaltyMeta({ userId, monthKey, orgAccount, baseSalary }) {
  const { start, endKey, end } = getMonthRange(monthKey);
  const daysInMonth = Number(end.getDate() || 30);
  const dailySalary = baseSalary / daysInMonth;

  // 1. Fetch all attendance records for the month
  const rows = await Attendance.findAll({
    where: { userId, date: { [Op.gte]: start, [Op.lte]: endKey } },
    attributes: ['id', 'userId', 'orgAccountId', 'latePunchInMinutes', 'latePunchInAmount', 'latePunchInRuleId', 'isLate', 'date', 'status', 'punchedInAt'],
    order: [['date', 'ASC']]
  });

  let totalLateMinutes = 0;
  let totalLatePenalty = 0;
  let lateCount = 0;
  let totalLateDays = 0;

  const latePunchInService = require('./latePunchInService');
  const lp = await latePunchInService.calculateMonthlyLateDetails(userId, orgAccount.id, monthKey, rows, dailySalary);

  return {
    latePunchInMinutes: lp.lateCount > 0 ? lp.rows.reduce((sum, r) => sum + (r.latePunchInMinutes || 0), 0) : 0,
    latePunchInPenalty: lp.totalPenalty,
    latePenaltyDays: lp.totalDays,
    lateCount: lp.lateCount,
    lateDetails: lp.rows.filter(r => r.latePunchInMinutes > 0) // Optional: for debugging or extended response
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

  const calculateAdvanceDeduction = async () => {
    const advances = await StaffAdvance.findAll({
      where: { staffId: u.id, deductionMonth: monthKey }
    });
    return advances.reduce((sum, adv) => sum + parseFloat(adv.amount || 0), 0);
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

    // Backfill overtime and early exit info for legacy lines
    try {
      const basicSalary = Number(earnings?.basic_salary || u.basicSalary || 0) + Number(earnings?.da || u.da || 0);
      const orgAccount = await OrgAccount.findByPk(u.orgAccountId);

      const [ee, br, eot, lp] = await Promise.all([
        computeEarlyExitMeta({ userId: u.id, monthKey, orgAccount }),
        computeBreakMeta({ userId: u.id, monthKey, orgAccount }),
        computeEarlyOvertimeMeta({ userId: u.id, monthKey, orgAccount }),
        computeLatePenaltyMeta({ userId: u.id, monthKey, orgAccount, baseSalary: basicSalary })
      ]);

      const fl = require('fs');
      fl.appendFileSync('payroll_debug.log', `[${new Date().toISOString()}] [User ${u.id}] calculateSalary (Existing): lpResult: ${JSON.stringify(lp)}\n`);

      // Note: Regular overtime (ot) usually fetched separately or part of another flow, 
      // but let's ensure these 4 automated deductions/earnings are correctly mapped.

      if (eot.earlyOvertimePay > 0 && !Number(earnings?.early_overtime_pay || 0)) {
        earnings = { ...(earnings || {}), early_overtime_pay: eot.earlyOvertimePay };
      }

      if (ee.earlyExitPenalty > 0 && !Number(deductions?.early_exit_penalty || 0)) {
        deductions = { ...(deductions || {}), early_exit_penalty: ee.earlyExitPenalty };
      }

      if (br.breakPenalty > 0 && !Number(deductions?.break_penalty || 0)) {
        deductions = { ...(deductions || {}), break_penalty: br.breakPenalty };
      }

      if (lp.latePunchInPenalty > 0 && !Number(deductions?.late_punchin_penalty || 0)) {
        deductions = { ...(deductions || {}), late_punchin_penalty: lp.latePunchInPenalty };
      }

      attendanceSummary = {
        ...(attendanceSummary || {}),
        earlyExitMinutes: Number(ee.earlyExitMinutes || 0),
        earlyExitPenalty: Number(ee.earlyExitPenalty || 0),
        excessBreakMinutes: Number(br.excessBreakMinutes || 0),
        breakPenalty: Number(br.breakPenalty || 0),
        earlyOvertimeMinutes: Number(eot.earlyOvertimeMinutes || 0),
        earlyOvertimePay: Number(eot.earlyOvertimePay || 0),
        latePunchInMinutes: Number(lp.latePunchInMinutes || 0),
        latePunchInPenalty: Number(lp.latePunchInPenalty || 0),
        latePenaltyDays: Number(lp.latePenaltyDays || 0),
        lateCount: Number(lp.lateCount || 0),
      };

      // Preserve manual totals if they exist and earnings/deductions are missing or zeroed out (prevents zeroing out historical entries)
      const hasDetailedData = Object.values(earnings || {}).some(v => Number(v) > 0) || Object.values(deductions || {}).some(v => Number(v) > 0);
      const isManualWithTotals = line.isManual && totalsObj?.netSalary > 0 && !hasDetailedData;

      if (isManualWithTotals) {
        // Backfill a basic row so it shows up in PDFs/UI as a non-zero total
        const manualNet = Number(totalsObj.netSalary || 0);
        earnings = { BASIC_SALARY: manualNet };
        deductions = {};
        totalsObj = {
          ...totalsObj,
          totalEarnings: manualNet,
          totalIncentives: 0,
          totalDeductions: 0,
          grossSalary: manualNet,
          netSalary: manualNet,
        };
      } else {
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
      }
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

  let payableUnits = present + (half * 0.5) + paidLeaveCount + weeklyOffCount + holidaysCount;
  let ratio = daysInMonth > 0 ? (payableUnits / daysInMonth) : 0;

  // Calculate Late Penalty separately via the new meta function
  let lp = await computeLatePenaltyMeta({
    userId: u.id,
    monthKey,
    orgAccount: u.orgAccount,
    baseSalary: Number(earnings.basic_salary || sd.basicSalary || 0) + Number(earnings.da || sd.da || 0)
  });

  const fl = require('fs');
  fl.appendFileSync('payroll_debug.log', `[${new Date().toISOString()}] [User ${u.id}] calculateSalary (Live): lpResult: ${JSON.stringify(lp)}\n`);

  const latePenaltyAmount = Number(lp?.latePunchInPenalty || 0);
  if (latePenaltyAmount > 0) {
    deductions = { ...deductions, late_punchin_penalty: latePenaltyAmount };
  }
  const daysForRatio = daysInMonth;
  ratio = daysForRatio > 0 ? Math.max(0, Math.min(1, payableUnits / daysForRatio)) : 1;

  const loanDeduction = await calculateLoanDeduction();
  const advanceDeduction = await calculateAdvanceDeduction();

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
  if (advanceDeduction > 0) {
    liveDeductions['advance_deduction'] = advanceDeduction;
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

  // Pro-rate deductions (Except LOAN_EMI and ADVANCE_DEDUCTION)
  Object.keys(finalDeductions).forEach(k => {
    if (k !== 'loan_emi' && k !== 'advance_deduction') {
      finalDeductions[k] = Math.round(Number(finalDeductions[k] || 0) * ratio);
    }
  });

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
        const dailyRate = base / daysInMonth;
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
  const basicSalary = Number(finalEarnings.basic_salary || sd.basicSalary || 0) + Number(finalEarnings.da || sd.da || 0);
  const [overtime, earlyExit, breakMeta, earlyOvertime] = await Promise.all([
    computeOvertimeMeta({ userId: u.id, monthKey, overtimeBaseSalary: basicSalary, orgAccount: u.orgAccount }),
    computeEarlyExitMeta({ userId: u.id, monthKey, orgAccount: u.orgAccount }),
    computeBreakMeta({ userId: u.id, monthKey, orgAccount: u.orgAccount }),
    computeEarlyOvertimeMeta({ userId: u.id, monthKey, orgAccount: u.orgAccount }),
  ]);

  if (overtime.overtimePay > 0) {
    finalEarnings.overtime_pay = overtime.overtimePay;
  }

  if (earlyOvertime.earlyOvertimePay > 0) {
    finalEarnings.early_overtime_pay = (finalEarnings.early_overtime_pay || 0) + earlyOvertime.earlyOvertimePay;
  }

  // Early Exit penalties
  if (earlyExit.earlyExitPenalty > 0) {
    finalDeductions.early_exit_penalty = (finalDeductions.early_exit_penalty || 0) + earlyExit.earlyExitPenalty;
  }

  // Break penalties
  if (breakMeta.breakPenalty > 0) {
    finalDeductions.break_penalty = (finalDeductions.break_penalty || 0) + breakMeta.breakPenalty;
  }

  // 3. APPLY TENURE BONUS (Only if live compute and month matches)
  try {
    const assignment = await StaffTenureBonusAssignment.findOne({
      where: {
        userId: u.id,
        effectiveFrom: { [Op.lte]: endKey }
      },
      include: [{ model: TenureBonusRule, as: 'rule' }],
      order: [['effectiveFrom', 'DESC']]
    });

    if (assignment && assignment.rule && assignment.rule.active && String(assignment.rule.paymentMonth) === String(monthKey)) {
      const bRule = assignment.rule;
      const bConfig = Array.isArray(bRule.config) ? bRule.config : (typeof bRule.config === 'string' ? JSON.parse(bRule.config) : []);

      const p = u.profile ? (typeof u.profile.get === 'function' ? u.profile.get({ plain: true }) : u.profile) : {};
      const joiningDate = p.dateOfJoining || p.date_of_joining;

      if (joiningDate) {
        const tenureMonths = calculateTenureMonths(joiningDate, monthKey);

        // Find matching rule from config array
        const matchedBracket = bConfig.find(r => tenureMonths >= Number(r.min || 0) && tenureMonths <= Number(r.max || 999));

        if (matchedBracket && Number(matchedBracket.percent) > 0) {
          const grossSalary_pre = sumObj(finalEarnings) + sumObj(finalIncentives);
          const bonusAmt = Math.round(grossSalary_pre * (Number(matchedBracket.percent) / 100));
          if (bonusAmt > 0) {
            finalEarnings.TENURE_BONUS = bonusAmt;
            try {
              require('fs').appendFileSync('payroll_debug.log', `[Bonus] User ${u.id}: Rule=${bRule.name}, Tenure=${tenureMonths}mo, Bracket=${matchedBracket.percent}%, Bonus=${bonusAmt}\n`);
            } catch (_) { }
          }
        }
      }
    }
  } catch (e) {
    console.error(`[Payroll-Bonus] Failed to calculate bonus: ${e.message}`);
  }

  const _totalEarnings = sumObj(finalEarnings);
  const _totalIncentives = sumObj(finalIncentives);
  const _totalDeductions = sumObj(finalDeductions);

  const grossSalary = _totalEarnings + _totalIncentives;
  const netSalary = grossSalary - _totalDeductions;

  return {
    success: true,
    monthKey,
    totals: {
      totalEarnings: _totalEarnings,
      totalIncentives: _totalIncentives,
      totalDeductions: _totalDeductions,
      grossSalary,
      netSalary: Math.max(0, netSalary),
      ratio
    },
    attendanceSummary: {
      present, half, leave, paidLeave: paidLeaveCount, unpaidLeave,
      absent, weeklyOff: weeklyOffCount, holidays: holidaysCount, ratio,
      lateCount: lp.lateCount,
      latePenalty: lp.latePunchInPenalty,
      latePunchInPenalty: lp.latePunchInPenalty,
      latePenaltyDays: lp.latePenaltyDays,
      latePunchInMinutes: lp.latePunchInMinutes,
      overtimeMinutes: overtime.overtimeMinutes,
      overtimeHours: overtime.overtimeHours,
      overtimeHourlyRate: overtime.overtimeHourlyRate,
      overtimePay: overtime.overtimePay,
      earlyExitMinutes: earlyExit.earlyExitMinutes,
      earlyExitPenalty: earlyExit.earlyExitPenalty,
      breakPenalty: breakMeta.breakPenalty,
      excessBreakMinutes: breakMeta.excessBreakMinutes,
      earlyOvertimeMinutes: earlyOvertime.earlyOvertimeMinutes,
      earlyOvertimePay: earlyOvertime.earlyOvertimePay,
    },
    earnings: finalEarnings,
    incentives: finalIncentives,
    deductions: finalDeductions,
    isProjected: true,
    isGenerated: false,
    payslipPath: null,
    user: u,
    paymentStatus: (Number(yy) < now.getFullYear() || (Number(yy) === now.getFullYear() && Number(mm) < (now.getMonth() + 1))) ? 'DUE' : 'ESTIMATED',
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

  let businessName = 'Thinktech Software';
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
          ${(att.earlyExitMinutes > 0 || att.earlyExitPenalty > 0) ? `<div class="info-row"><strong>Early Exit:</strong> ${att.earlyExitMinutes}m</div>` : ''}
          ${(att.earlyExitPenalty > 0) ? `<div class="info-row"><strong>Early Exit Fine:</strong> ${fmt(att.earlyExitPenalty)}</div>` : ''}
          ${(att.earlyOvertimeMinutes > 0) ? `<div class="info-row"><strong>Early Overtime:</strong> ${att.earlyOvertimeMinutes}m</div>` : ''}
          ${(att.earlyOvertimePay > 0) ? `<div class="info-row"><strong>Early OT Pay:</strong> ${fmt(att.earlyOvertimePay)}</div>` : ''}
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
  computeOvertimeMeta,
  computeEarlyOvertimeMeta,
  computeEarlyExitMeta,
  computeBreakMeta,
  computeLatePenaltyMeta,
  generatePayslipPDF
};
