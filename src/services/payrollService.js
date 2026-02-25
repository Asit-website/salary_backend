const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
  User, StaffProfile, StaffShiftAssignment, ShiftTemplate, SalaryAccess,
  StaffAttendanceAssignment, AttendanceTemplate, StaffSalaryAssignment, SalaryTemplate,
  Attendance, LeaveRequest, WeeklyOffTemplate, StaffWeeklyOffAssignment,
  HolidayTemplate, HolidayDate, StaffHolidayAssignment, PayrollCycle, PayrollLine,
  AppSetting, StaffLoan, OrgAccount // Added StaffLoan and OrgAccount
} = require('../models');

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
      { association: 'orgAccount', required: false }
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
    earnings = (sv.earnings && typeof sv.earnings === 'object') ? sv.earnings : {};
    incentives = (sv.incentives && typeof sv.incentives === 'object') ? sv.incentives : {};
    deductions = (sv.deductions && typeof sv.deductions === 'object') ? sv.deductions : {};
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

  // Weekly off config
  let woConfig = [];
  try {
    if (WeeklyOffTemplate && StaffWeeklyOffAssignment) {
      const asg = await StaffWeeklyOffAssignment.findOne({ where: { userId: u.id, active: true }, order: [['id', 'DESC']] });
      if (asg) {
        const tpl = await WeeklyOffTemplate.findByPk(asg.weeklyOffTemplateId || asg.weekly_off_template_id);
        woConfig = (tpl && Array.isArray(tpl.config)) ? tpl.config : (tpl?.config || []);
      }
    }
  } catch (_) { }

  // Holiday set
  let holidaySet = new Set();
  try {
    const hasg = await StaffHolidayAssignment.findOne({ where: { userId: u.id, active: true }, order: [['id', 'DESC']] });
    if (hasg) {
      const tpl = await HolidayTemplate.findByPk(hasg.holidayTemplateId || hasg.holiday_template_id, {
        include: [{ model: HolidayDate, as: 'holidays' }]
      });
      const hs = Array.isArray(tpl?.holidays) ? tpl.holidays : [];
      holidaySet = new Set(hs.filter(h => h && h.active !== false && String(h.date) >= start && String(h.date) <= endKey).map(h => String(h.date).slice(0, 10)));
    } else {
      const rows = await HolidayDate.findAll({ where: { active: { [Op.not]: false }, date: { [Op.gte]: start, [Op.lte]: endKey } }, attributes: ['date', 'active'] });
      holidaySet = new Set(rows.map(r => String(r.date).slice(0, 10)));
    }
  } catch (_) { }

  // Helper to check weekly off
  const isWeeklyOffForDate = (configArray, jsDate) => {
    if (!Array.isArray(configArray) || configArray.length === 0) return false;
    const dayIndex = jsDate.getDay(); // 0=Sun
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayIndex];
    return configArray.some(c => {
      if (typeof c === 'string') return c.toLowerCase() === dayName;
      if (c && c.day) return String(c.day).toLowerCase() === dayName;
      return false;
    });
  };

  // Classify each calendar day
  let present = 0, half = 0, leave = 0, paidLeaveCount = 0, unpaidLeave = 0, weeklyOffCount = 0, holidaysCount = 0, absent = 0;
  const daysInMonth = end.getDate();

  for (let dnum = 1; dnum <= daysInMonth; dnum++) {
    const dt = new Date(yy, mm - 1, dnum);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dnum).padStart(2, '0')}`;
    const s = attMap[key];

    if (s === 'present') { present += 1; continue; }
    if (s === 'half_day') { half += 1; continue; }
    if (s === 'leave') { leave += 1; if (paidLeaveSet.has(key)) paidLeaveCount += 1; else if (unpaidLeaveSet.has(key)) unpaidLeave += 1; continue; }
    if (s === 'absent') { absent += 1; continue; }

    // No explicit attendance record
    const isWO = isWeeklyOffForDate(woConfig, dt);
    const isH = holidaySet.has(key);
    if (!isWO && !isH) {
      if (paidLeaveSet.has(key)) { leave += 1; paidLeaveCount += 1; }
      else if (unpaidLeaveSet.has(key)) { leave += 1; unpaidLeave += 1; }
      else {
        // Only count as absent if the date is in the past (today or before)
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (dt <= today) { absent += 1; }
      }
    } else {
      if (isH) holidaysCount += 1; else weeklyOffCount += 1;
    }
  }

  const payableUnits = present + (half * 0.5) + weeklyOffCount + holidaysCount + paidLeaveCount;
  const ratio = daysInMonth > 0 ? Math.max(0, Math.min(1, payableUnits / daysInMonth)) : 1;

  const loanDeduction = await calculateLoanDeduction();

  // Re-construct deductions for live compute to include loan
  let liveDeductions = {
    provident_fund: sd.pfDeduction,
    esi: sd.esiDeduction,
    professional_tax: sd.professionalTax,
    income_tax: sd.tdsDeduction,
    other_deductions: sd.otherDeductions,
  };

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
        expenseDate: { [Op.gte]: start, [Op.lte]: endKey }
      }
    });

    for (const exp of settledExpenses) {
      const label = `EXPENSE: ${exp.expenseType || 'Claim'}`;
      finalEarnings[label] = (finalEarnings[label] || 0) + Number(exp.amount || 0);
    }
  } catch (e) {
    console.error('Error fetching expenses for payroll:', e);
  }

  const sumObj = (o) => Object.values(o || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  let proratedEarnings = Math.round(sumObj(finalEarnings) * ratio);
  const totalIncentives = Math.round(sumObj(finalIncentives) * ratio);
  const totalDeductions = Math.round(sumObj(finalDeductions) * ratio);

  // Overtime pay: based on attendance overtime minutes and hourly basic rate
  const overtimeBaseSalary = Number(earnings?.basic_salary || sd.basicSalary || 0) + Number(earnings?.da || sd.da || 0);
  const overtimeMeta = await computeOvertimeMeta({ userId: u.id, monthKey, overtimeBaseSalary });
  if (overtimeMeta.overtimePay > 0) {
    finalEarnings.overtime_pay = overtimeMeta.overtimePay;
    proratedEarnings += overtimeMeta.overtimePay;
  }

  const grossSalary = proratedEarnings + totalIncentives;
  const netSalary = grossSalary - totalDeductions;

  return {
    success: true,
    monthKey,
    totals: {
      totalEarnings: proratedEarnings,
      totalIncentives,
      totalDeductions,
      grossSalary,
      netSalary,
      ratio
    },
    attendanceSummary: {
      present, half, leave, paidLeave: paidLeaveCount, unpaidLeave,
      absent: absent + unpaidLeave, weeklyOff: weeklyOffCount, holidays: holidaysCount, ratio,
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
