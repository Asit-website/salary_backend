const express = require('express');
const bcrypt = require('bcryptjs');

const { sequelize, User, StaffProfile, AppSetting, DocumentType, ShiftTemplate, ShiftBreak, ShiftRotationalSlot, StaffShiftAssignment, SalaryAccess, AttendanceTemplate, StaffAttendanceAssignment, SalaryTemplate, StaffSalaryAssignment, Site, WorkUnit, Route, RouteStop, StaffRouteAssignment, SiteCheckpoint, PatrolLog, LeaveTemplate, LeaveTemplateCategory, StaffLeaveAssignment, LeaveBalance, AIAnomaly, ReliabilityScore, SalaryForecast, Attendance, Client, AssignedJob, SalesTarget, HolidayTemplate, HolidayDate, StaffHolidayAssignment, Subscription, Plan } = require('../models');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { tenantEnforce } = require('../middleware/tenant');
const ai = require('../services/aiProvider');
const { Op } = require('sequelize');

const router = express.Router();

// One-liner org guard
function requireOrg(req, res) {
  const orgId = req.tenantOrgAccountId || null;
  if (!orgId) {
    res.status(403).json({ success: false, message: 'No organization in context' });
    return null;
  }
  return orgId;
}

router.use(authRequired);
router.use(requireRole(['admin', 'superadmin']));
router.use(tenantEnforce);

// Uploads: ensure folder exists and configure multer
const uploadsDir = path.join(process.cwd(), 'uploads', 'claims');
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (_) { }
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${ts}-${safe}`);    
  },
});



// Bulk mark selected payroll lines as paid with provided details (org-scoped)
router.post('/payroll/:cycleId/lines/mark-paid', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { PayrollCycle, PayrollLine } = require('../models');
    const id = Number(req.params.cycleId);
    const cycle = await PayrollCycle.findOne({ where: { id, orgAccountId: orgId } });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    if (cycle.status === 'PAID') return res.status(409).json({ success: false, message: 'Cycle already paid' });
    const body = req.body || {};
    const lineIds = Array.isArray(body.lineIds) ? body.lineIds.map(Number).filter(Number.isFinite) : [];
    if (lineIds.length === 0) return res.status(400).json({ success: false, message: 'lineIds required' });

    const payload = {
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      paidMode: body.paidMode || null,
      paidRef: body.paidRef || null,
      paidAmount: body.paidAmount != null ? Number(body.paidAmount) : null,
      paidBy: req.user?.id || null,
    };

    const rows = await PayrollLine.findAll({ where: { id: lineIds, cycleId: id } });
    for (const r of rows) { 
      const finalPayload = { ...payload };
      // If paidAmount is null, use net salary from totals
      if (payload.paidAmount == null && r.totals && r.totals.netSalary) {
        finalPayload.paidAmount = r.totals.netSalary;
      }
      await r.update(finalPayload); 
    }
    return res.json({ success: true, updated: rows.length });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to mark selected paid' });
  }
});

// Export payroll cycle as CSV (org-scoped)
router.get('/payroll/:cycleId/export', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { PayrollCycle, PayrollLine, User, StaffProfile } = require('../models');
    const id = Number(req.params.cycleId);
    const cycle = await PayrollCycle.findOne({ where: { id, orgAccountId: orgId } });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    const lines = await PayrollLine.findAll({ where: { cycleId: id } });

    // Fetch names for users
    const userIds = [...new Set(lines.map(l => l.userId))];
    const users = await User.findAll({ where: { id: userIds }, include: [{ model: StaffProfile, as: 'profile' }] });
    const nameById = new Map(users.map(u => [u.id, (u.profile?.name || u.phone || `User ${u.id}`)]));

    const header = [
      'user_id','name',
      'total_earnings','total_incentives','total_deductions','gross_salary','net_salary','ratio',
      'present','half','paid_leave','unpaid_leave','weekly_off','holidays','absent'
    ];
    const rows = [header.join(',')];
    for (const l of lines) {
      const t = l.totals || {};
      const s = l.attendanceSummary || {};
      const row = [
        l.userId,
        JSON.stringify(nameById.get(l.userId) || ''),
        Number(t.totalEarnings || 0),
        Number(t.totalIncentives || 0),
        Number(t.totalDeductions || 0),
        Number(t.grossSalary || 0),
        Number(t.netSalary || 0),
        Number(t.ratio || s.ratio || 0),
        Number(s.present || 0),
        Number(s.half || 0),
        Number(s.paidLeave || 0),
        Number(s.unpaidLeave || 0),
        Number(s.weeklyOff || 0),
        Number(s.holidays || 0),
        Number(s.absent || 0),
      ];
      rows.push(row.join(','));
    }
    const csv = rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${cycle.monthKey}.csv"`);
    return res.status(200).send(csv);
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to export CSV' });
  }
});

// Update a payroll line values (earnings/deductions/incentives/adjustments/status/remarks) (org-scoped)
router.put('/payroll/:cycleId/line/:lineId', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { PayrollCycle, PayrollLine } = require('../models');
    const cycleId = Number(req.params.cycleId);
    const lineId = Number(req.params.lineId);
    const cycle = await PayrollCycle.findOne({ where: { id: cycleId, orgAccountId: orgId } });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    if (cycle.status === 'PAID') return res.status(409).json({ success: false, message: 'Cannot edit after cycle is PAID' });
    const line = await PayrollLine.findOne({ where: { id: lineId, cycleId } });
    if (!line) return res.status(404).json({ success: false, message: 'Line not found' });

    const payload = req.body || {};
    const next = {};
    if (payload.earnings && typeof payload.earnings === 'object') next.earnings = payload.earnings;
    if (payload.incentives && typeof payload.incentives === 'object') next.incentives = payload.incentives;
    if (payload.deductions && typeof payload.deductions === 'object') next.deductions = payload.deductions;
    if (payload.adjustments && (Array.isArray(payload.adjustments) || typeof payload.adjustments === 'object')) next.adjustments = payload.adjustments;
    if (payload.totals && typeof payload.totals === 'object') next.totals = payload.totals;
    if (payload.attendanceSummary && typeof payload.attendanceSummary === 'object') next.attendanceSummary = payload.attendanceSummary;
    if (typeof payload.remarks === 'string') next.remarks = payload.remarks;
    if (payload.status && (payload.status === 'INCLUDED' || payload.status === 'EXCLUDED')) next.status = payload.status;

    await line.update(next);
    return res.json({ success: true, line });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update line' });
  }
});

// Compute a single user's salary for a month (attendance-aware), without persisting
router.get('/staff/:id/salary-compute', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const monthKey = String(req.query.monthKey || req.query.month || '').slice(0,7);
    if (!Number.isFinite(userId) || !/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ success: false, message: 'invalid user or monthKey' });
    }
    const { User, Attendance, LeaveRequest, HolidayTemplate, HolidayDate, StaffHolidayAssignment } = require('../models');
    const u = await User.findByPk(userId);
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });
    const [yy, mm] = monthKey.split('-').map(Number);
    const start = `${monthKey}-01`;
    const end = new Date(yy, mm, 0);
    const endKey = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;

    const parseMaybe = (v) => { if (!v) return v; if (typeof v !== 'string') return v; try { v = JSON.parse(v); } catch { return v; } if (typeof v === 'string') { try { v = JSON.parse(v); } catch {} } return v; };
    const sum = (o) => Object.values(o || {}).reduce((s, v) => s + (Number(v) || 0), 0);

    let sv = parseMaybe(u.salaryValues || u.salary_values || null);
    const sd = {
      basicSalary: Number(u.basicSalary || 0), hra: Number(u.hra || 0), da: Number(u.da || 0),
      specialAllowance: Number(u.specialAllowance || 0), conveyanceAllowance: Number(u.conveyanceAllowance || 0),
      medicalAllowance: Number(u.medicalAllowance || 0), telephoneAllowance: Number(u.telephoneAllowance || 0), otherAllowances: Number(u.otherAllowances || 0),
      pfDeduction: Number(u.pfDeduction || 0), esiDeduction: Number(u.esiDeduction || 0), professionalTax: Number(u.professionalTax || 0), tdsDeduction: Number(u.tdsDeduction || 0), otherDeductions: Number(u.otherDeductions || 0),
    };
    const svRootE = (sv && typeof sv === 'object' && sv.earnings && typeof sv.earnings === 'object') ? sv.earnings : null;
    const svRootI = (sv && typeof sv === 'object' && sv.incentives && typeof sv.incentives === 'object') ? sv.incentives : null;
    const svRootD = (sv && typeof sv === 'object' && sv.deductions && typeof sv.deductions === 'object') ? sv.deductions : null;
    const baseE = svRootE || { basic_salary: sd.basicSalary, hra: sd.hra, da: sd.da, special_allowance: sd.specialAllowance, conveyance_allowance: sd.conveyanceAllowance, medical_allowance: sd.medicalAllowance, telephone_allowance: sd.telephoneAllowance, other_allowances: sd.otherAllowances };
    const baseI = svRootI || {};
    const baseD = svRootD || { provident_fund: sd.pfDeduction, esi: sd.esiDeduction, professional_tax: sd.professionalTax, tds: sd.tdsDeduction, other_deductions: sd.otherDeductions };
    const monthStore = (sv && sv.months && typeof sv.months === 'object') ? sv.months[monthKey] : null;
    const e = monthStore?.earnings && typeof monthStore.earnings === 'object' ? monthStore.earnings : baseE;
    const i = monthStore?.incentives && typeof monthStore.incentives === 'object' ? monthStore.incentives : baseI;
    const d = monthStore?.deductions && typeof monthStore.deductions === 'object' ? monthStore.deductions : baseD;

    // Attendance map
    const atts = await Attendance.findAll({ where: { userId: u.id, date: { [Op.gte]: start, [Op.lte]: endKey } }, attributes: ['status','date'] });
    const attMap = {}; for (const a of atts) { attMap[String(a.date).slice(0,10)] = String(a.status || '').toLowerCase(); }

    // Paid/unpaid leave sets from approved requests
    let paidLeaveSet = new Set(); let unpaidLeaveSet = new Set();
    try {
      const lrs = await LeaveRequest.findAll({ where: { userId: u.id, status: 'APPROVED', startDate: { [Op.lte]: endKey }, endDate: { [Op.gte]: start } } });
      for (const lr of (lrs || [])) {
        const lrStart = new Date(Math.max(new Date(String(lr.startDate)), new Date(start)));
        const lrEnd = new Date(Math.min(new Date(String(lr.endDate)), new Date(endKey)));
        let paidRem = Number(lr.paidDays || 0); let unpaidRem = Number(lr.unpaidDays || 0);
        for (let dte = new Date(lrStart); dte <= lrEnd; dte.setDate(dte.getDate() + 1)) {
          const k = `${dte.getFullYear()}-${String(dte.getMonth()+1).padStart(2,'0')}-${String(dte.getDate()).padStart(2,'0')}`;
          if (paidRem > 0) { paidLeaveSet.add(k); paidRem -= 1; } else if (unpaidRem > 0) { unpaidLeaveSet.add(k); unpaidRem -= 1; } else { paidLeaveSet.add(k); }
        }
      }
    } catch (_) {}

    // Weekly off / holidays
    let woConfig = [];
    try {
      const { WeeklyOffTemplate, StaffWeeklyOffAssignment } = sequelize.models;
      if (WeeklyOffTemplate && StaffWeeklyOffAssignment) {
        const asg = await StaffWeeklyOffAssignment.findOne({ where: { userId: u.id, active: true }, order: [['id','DESC']] });
        if (asg) { const tpl = await WeeklyOffTemplate.findByPk(asg.weeklyOffTemplateId || asg.weekly_off_template_id); woConfig = (tpl && Array.isArray(tpl.config)) ? tpl.config : (tpl?.config || []); }
      }
    } catch (_) {}
    let holidaySet = new Set();
    try {
      const hasg = await StaffHolidayAssignment.findOne({ where: { userId: u.id, active: true }, order: [['id','DESC']] });
      if (hasg) {
        const tpl = await HolidayTemplate.findByPk(hasg.holidayTemplateId || hasg.holiday_template_id, { include: [{ model: HolidayDate, as: 'holidays' }] });
        const hs = Array.isArray(tpl?.holidays) ? tpl.holidays : [];
        holidaySet = new Set(hs.filter(h => h && h.active !== false && String(h.date) >= start && String(h.date) <= endKey).map(h => String(h.date).slice(0,10)));
      } else {
        const rows = await HolidayDate.findAll({ where: { active: { [Op.not]: false }, date: { [Op.gte]: start, [Op.lte]: endKey } }, attributes: ['date','active'] });
        holidaySet = new Set(rows.map(r => String(r.date).slice(0,10)));
      }
    } catch (_) {}

    // Classify each calendar day
    let present = 0, half = 0, leave = 0, paidLeave = 0, unpaidLeave = 0, weeklyOff = 0, holidays = 0, absent = 0;
    for (let dnum = 1; dnum <= end.getDate(); dnum++) {
      const dt = new Date(yy, mm - 1, dnum);
      const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dnum).padStart(2,'0')}`;
      const s = attMap[key];
      if (s === 'present') { present += 1; continue; }
      if (s === 'half_day') { half += 1; continue; }
      if (s === 'leave') { leave += 1; if (paidLeaveSet.has(key)) paidLeave += 1; else if (unpaidLeaveSet.has(key)) unpaidLeave += 1; continue; }
      if (s === 'absent') { absent += 1; continue; }
      const isWO = isWeeklyOffForDate(woConfig, dt);
      const isH = holidaySet.has(key);
      if (!isWO && !isH) {
        if (paidLeaveSet.has(key)) { leave += 1; paidLeave += 1; }
        else if (unpaidLeaveSet.has(key)) { leave += 1; unpaidLeave += 1; }
        else { absent += 1; }
      } else { if (isH) holidays += 1; else weeklyOff += 1; }
    }

    const daysInMonth = end.getDate();
    const ratio = daysInMonth > 0 ? Math.max(0, Math.min(1, (present + half*0.5 + weeklyOff + holidays + paidLeave)/daysInMonth)) : 1;
    const totals = {
      totalEarnings: Math.round(sum(e) * ratio),
      totalIncentives: Math.round(sum(i) * ratio),
      totalDeductions: Math.round(sum(d) * ratio),
    };
    totals.grossSalary = totals.totalEarnings + totals.totalIncentives;
    totals.netSalary = totals.grossSalary - totals.totalDeductions;
    const attendanceSummary = { present, half, leave, paidLeave, unpaidLeave, absent: absent + unpaidLeave, weeklyOff, holidays, ratio };
    return res.json({ success: true, monthKey, userId, totals, attendanceSummary, earnings: e, incentives: i, deductions: d });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to compute salary' });
  }
});

// Lock a payroll cycle (org-scoped)
router.post('/payroll/:cycleId/lock', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { PayrollCycle } = require('../models');
    const id = Number(req.params.cycleId);
    const cycle = await PayrollCycle.findOne({ where: { id, orgAccountId: orgId } });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    await cycle.update({ status: 'LOCKED' });
    return res.json({ success: true, cycle });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to lock cycle' });
  }
});

// Unlock a payroll cycle back to DRAFT (org-scoped)
router.post('/payroll/:cycleId/unlock', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { PayrollCycle } = require('../models');
    const id = Number(req.params.cycleId);
    const cycle = await PayrollCycle.findOne({ where: { id, orgAccountId: orgId } });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    await cycle.update({ status: 'DRAFT' });
    return res.json({ success: true, cycle });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to unlock cycle' });
  }
});

// Mark a payroll cycle as PAID (org-scoped)
router.post('/payroll/:cycleId/mark-paid', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { PayrollCycle, PayrollLine } = require('../models');
    const id = Number(req.params.cycleId);
    const cycle = await PayrollCycle.findOne({ where: { id, orgAccountId: orgId } });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    
    // Mark all lines as paid
    const lines = await PayrollLine.findAll({ where: { cycleId: id } });
    const payload = {
      paidAt: new Date(),
      paidMode: 'CASH',
      paidRef: null,
      paidBy: req.user?.id || null,
    };
    
    for (const line of lines) {
      const finalPayload = { ...payload };
      // Use net salary from totals
      if (line.totals && line.totals.netSalary) {
        finalPayload.paidAmount = line.totals.netSalary;
      }
      await line.update(finalPayload);
    }
    
    await cycle.update({ status: 'PAID' });
    return res.json({ success: true, cycle });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to mark paid' });
  }
});
const upload = multer({ storage });

// --- Payroll (admin) --- (org-scoped)
router.get('/payroll', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { PayrollCycle, PayrollLine } = require('../models');
    const monthKey = (req.query?.monthKey || req.query?.month || '').toString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ success: false, message: 'monthKey (YYYY-MM) required' });
    }
    let cycle = await PayrollCycle.findOne({ where: { monthKey, orgAccountId: orgId } });
    if (!cycle) {
      cycle = await PayrollCycle.create({ monthKey, status: 'DRAFT', orgAccountId: orgId });
    }
    const lines = await PayrollLine.findAll({ where: { cycleId: cycle.id } });
    return res.json({ success: true, cycle, lines });
  } catch (e) {
    console.error('Payroll GET error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load payroll', error: e.message });
  }
});

// Get user's payroll payment status (user-accessible)
router.get('/my-payroll-status', async (req, res) => {
  try {
    const userId = requireUser(req, res); if (!userId) return;
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { PayrollCycle, PayrollLine } = require('../models');
    const monthKey = (req.query?.monthKey || req.query?.month || '').toString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ success: false, message: 'monthKey (YYYY-MM) required' });
    }
    
    const cycle = await PayrollCycle.findOne({ where: { monthKey, orgAccountId: orgId } });
    if (!cycle) {
      return res.json({ success: true, paymentStatus: 'DUE', paidAmount: 0 });
    }
    
    const line = await PayrollLine.findOne({ where: { cycleId: cycle.id, userId } });
    if (!line) {
      return res.json({ success: true, paymentStatus: 'DUE', paidAmount: 0 });
    }
    
    if (line.paidAt) {
      return res.json({ 
        success: true, 
        paymentStatus: 'PAID', 
        paidAmount: line.paidAmount || 0 
      });
    } else {
      return res.json({ success: true, paymentStatus: 'DUE', paidAmount: 0 });
    }
  } catch (e) {
    console.error('My payroll status error:', e);
    return res.status(500).json({ success: false, message: 'Failed to get payroll status' });
  }
});

router.post('/payroll/:cycleId/compute', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { PayrollCycle, PayrollLine, User, Attendance, LeaveRequest } = require('../models');
    const cycleId = Number(req.params.cycleId);
    const cycle = await PayrollCycle.findOne({ where: { id: cycleId, orgAccountId: orgId } });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    const monthKey = cycle.monthKey;
    const [yy, mm] = monthKey.split('-').map(Number);
    const start = `${monthKey}-01`;
    const end = new Date(yy, mm, 0); // last day
    const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

    const staff = await User.findAll({ where: { role: 'staff', active: true, orgAccountId: orgId } });

    const parseMaybe = (v) => {
      if (!v) return v;
      if (typeof v !== 'string') return v;
      try { v = JSON.parse(v); } catch { return v; }
      if (typeof v === 'string') { try { v = JSON.parse(v); } catch { /* noop */ } }
      return v;
    };
    const sum = (o) => Object.values(o || {}).reduce((s, v) => s + (Number(v) || 0), 0);

    for (const u of staff) {
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

      // Prefer structured salaryValues root if present (aligns with mobile extractFromUser)
      const svRootE = (sv && typeof sv === 'object' && sv.earnings && typeof sv.earnings === 'object') ? sv.earnings : null;
      const svRootI = (sv && typeof sv === 'object' && sv.incentives && typeof sv.incentives === 'object') ? sv.incentives : null;
      const svRootD = (sv && typeof sv === 'object' && sv.deductions && typeof sv.deductions === 'object') ? sv.deductions : null;

      const baseE = svRootE || {
        basic_salary: sd.basicSalary,
        hra: sd.hra,
        da: sd.da,
        special_allowance: sd.specialAllowance,
        conveyance_allowance: sd.conveyanceAllowance,
        medical_allowance: sd.medicalAllowance,
        telephone_allowance: sd.telephoneAllowance,
        other_allowances: sd.otherAllowances,
      };
      const baseI = svRootI || {};
      const baseD = svRootD || {
        provident_fund: sd.pfDeduction,
        esi: sd.esiDeduction,
        professional_tax: sd.professionalTax,
        tds: sd.tdsDeduction,
        other_deductions: sd.otherDeductions,
      };

      const monthStore = (sv && sv.months && typeof sv.months === 'object') ? sv.months[monthKey] : null;
      const e = monthStore?.earnings && typeof monthStore.earnings === 'object' ? monthStore.earnings : baseE;
      const i = monthStore?.incentives && typeof monthStore.incentives === 'object' ? monthStore.incentives : baseI;
      const d = monthStore?.deductions && typeof monthStore.deductions === 'object' ? monthStore.deductions : baseD;
      const totalsFromMonth = monthStore?.totals && typeof monthStore.totals === 'object' ? monthStore.totals : null;

      // Attendance summary and proration for the month
      const atts = await Attendance.findAll({ where: { userId: u.id, date: { [Op.gte]: start, [Op.lte]: endKey } }, attributes: ['status','date'] });
      const attMap = {};
      for (const a of atts) {
        const key = String(a.date || '').slice(0,10);
        attMap[key] = String(a.status || '').toLowerCase();
      }

      // Build paid/unpaid leave per-day sets from approved leave requests
      let paidLeaveSet = new Set();
      let unpaidLeaveSet = new Set();
      try {
        const lrs = await LeaveRequest.findAll({ where: { userId: u.id, status: 'APPROVED', startDate: { [Op.lte]: endKey }, endDate: { [Op.gte]: start } } });
        for (const lr of (lrs || [])) {
          const lrStart = new Date(Math.max(new Date(String(lr.startDate)), new Date(start)));
          const lrEnd = new Date(Math.min(new Date(String(lr.endDate)), new Date(endKey)));
          let paidRem = Number(lr.paidDays || 0);
          let unpaidRem = Number(lr.unpaidDays || 0);
          for (let d = new Date(lrStart); d <= lrEnd; d.setDate(d.getDate() + 1)) {
            const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            if (paidRem > 0) { paidLeaveSet.add(k); paidRem -= 1; }
            else if (unpaidRem > 0) { unpaidLeaveSet.add(k); unpaidRem -= 1; }
            else {
              // If totals not provided, fall back to treating leaveType/categoryKey: default paid
              paidLeaveSet.add(k);
            }
          }
        }
      } catch (_) { /* ignore */ }

      // Derive weekly off config and holiday set (counts will be computed in the per-day loop)
      let weeklyOff = 0, holidays = 0;
      let woConfig = [];
      try {
        const { WeeklyOffTemplate, StaffWeeklyOffAssignment } = sequelize.models;
        if (WeeklyOffTemplate && StaffWeeklyOffAssignment) {
          const asg = await StaffWeeklyOffAssignment.findOne({ where: { userId: u.id, active: true }, order: [['id','DESC']] });
          if (asg) {
            const tpl = await WeeklyOffTemplate.findByPk(asg.weeklyOffTemplateId || asg.weekly_off_template_id);
            woConfig = (tpl && Array.isArray(tpl.config)) ? tpl.config : (tpl?.config || []);
          }
        }
      } catch (_) { /* ignore */ }

      try {
        let holidayDates = [];
        const hasg = await StaffHolidayAssignment.findOne({ where: { userId: u.id, active: true }, order: [['id','DESC']] });
        if (hasg) {
          const tpl = await HolidayTemplate.findByPk(hasg.holidayTemplateId || hasg.holiday_template_id, { include: [{ model: HolidayDate, as: 'holidays' }] });
          const hs = Array.isArray(tpl?.holidays) ? tpl.holidays : [];
          holidayDates = hs.filter(h => h && h.active !== false && String(h.date) >= start && String(h.date) <= endKey).map(h => String(h.date).slice(0,10));
        } else {
          const rows = await HolidayDate.findAll({ where: { active: { [Op.not]: false }, date: { [Op.gte]: start, [Op.lte]: endKey } }, attributes: ['date','active'] });
          holidayDates = rows.map(r => String(r.date).slice(0,10));
        }
        // Convert to Set for quick checks
        const holidaySet = new Set(holidayDates);
        // We'll count holidays during the per-day classification
        // Store set on scope for category loop
        var _holidaySet = holidaySet;
      } catch (_) { /* ignore */ }

      // Category counts: classify every calendar day into a bucket
      let present = 0, half = 0, leave = 0, absent = 0, paidLeave = 0, unpaidLeave = 0;
      for (let dnum = 1; dnum <= end.getDate(); dnum++) {
        const dt = new Date(yy, mm - 1, dnum);
        const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dnum).padStart(2,'0')}`;
        const s = attMap[key];
        if (s === 'present') { present += 1; continue; }
        if (s === 'half_day') { half += 1; continue; }
        if (s === 'leave') {
          leave += 1;
          if (paidLeaveSet.has(key)) paidLeave += 1; else if (unpaidLeaveSet.has(key)) unpaidLeave += 1;
          continue;
        }
        if (s === 'absent') { absent += 1; continue; }
        // No explicit attendance -> treat as weeklyOff or holiday; else absent
        const isWO = (() => { try { return isWeeklyOffForDate(woConfig, dt); } catch (_) { return false; } })();
        const isH = (typeof _holidaySet !== 'undefined') ? _holidaySet.has(key) : false;
        if (!isWO && !isH) {
          // If covered by leave request but no attendance row, classify via sets
          if (paidLeaveSet.has(key)) { leave += 1; paidLeave += 1; }
          else if (unpaidLeaveSet.has(key)) { leave += 1; unpaidLeave += 1; }
          else { absent += 1; }
        } else {
          // No explicit attendance and day is WO or Holiday -> count them
          if (isH) { holidays += 1; }
          else if (isWO) { weeklyOff += 1; }
        }
      }

      // Proration by payable units: present(1) + half(0.5) + weeklyOff(1) + holidays(1) + paidLeave(1)
      const daysInMonth = end.getDate();
      const payableUnits = present + (half * 0.5) + weeklyOff + holidays + paidLeave;
      const ratio = daysInMonth > 0 ? Math.max(0, Math.min(1, payableUnits / daysInMonth)) : 1;

      const baseTotalE = totalsFromMonth ? Number(totalsFromMonth.totalEarnings || 0) : sum(e);
      const baseTotalI = totalsFromMonth ? Number(totalsFromMonth.totalIncentives || 0) : sum(i);
      const baseTotalD = totalsFromMonth ? Number(totalsFromMonth.totalDeductions || 0) : sum(d);

      const totalEarnings = Math.round(baseTotalE * ratio);
      const totalIncentives = Math.round(baseTotalI * ratio);
      const totalDeductions = Math.round(baseTotalD * ratio);
      const grossSalary = totalEarnings + totalIncentives;
      const netSalary = grossSalary - totalDeductions;

      const totalAbsent = absent + unpaidLeave;
      const attendanceSummary = { present, half, leave, paidLeave, unpaidLeave, absent: totalAbsent, weeklyOff, holidays };
      const totals = { totalEarnings, totalIncentives, totalDeductions, grossSalary, netSalary, ratio };

      const [line, created] = await require('../models').sequelize.models.PayrollLine.findOrCreate({
        where: { cycleId: cycle.id, userId: u.id },
        defaults: { earnings: e, incentives: i, deductions: d, totals, attendanceSummary }
      });
      if (!created) {
        await line.update({ earnings: e, incentives: i, deductions: d, totals, attendanceSummary });
      }
    }

    const lines = await require('../models').sequelize.models.PayrollLine.findAll({ where: { cycleId: cycle.id } });
    return res.json({ success: true, cycle, lines });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to compute payroll' });
  }
});

// Upload business logo (org-scoped)
router.post('/settings/business-info/logo', upload.single('file'), async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    if (!req.file) return res.status(400).json({ success: false, message: 'file is required' });
    const fileUrl = `/uploads/claims/${req.file.filename}`;
    let row = await sequelize.models.OrgBusinessInfo.findOne({ where: { active: true, orgAccountId: orgId } });
    if (!row) row = await sequelize.models.OrgBusinessInfo.create({ active: true, orgAccountId: orgId });
    await row.update({ logoUrl: fileUrl });
    return res.json({ success: true, url: fileUrl });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to upload logo' });
  }
});

// Upcoming holidays for dashboard (org-scoped)
router.get('/dashboard/upcoming-holidays', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayKey = `${yyyy}-${mm}-${dd}`;

    const in90 = new Date();
    in90.setDate(in90.getDate() + 90);
    const y2 = in90.getFullYear();
    const m2 = String(in90.getMonth() + 1).padStart(2, '0');
    const d2 = String(in90.getDate()).padStart(2, '0');
    const untilKey = `${y2}-${m2}-${d2}`;

    // Get org's holiday templates
    const orgTemplateIds = (await HolidayTemplate.findAll({ where: { orgAccountId: orgId }, attributes: ['id'] })).map(t => t.id);

    let rows = await HolidayDate.findAll({
      where: {
        // include rows where active is true or null (treat null as active)
        active: { [Op.not]: false },
        date: { [Op.gte]: todayKey, [Op.lte]: untilKey },
        holidayTemplateId: orgTemplateIds,
      },
      order: [['date', 'ASC']],
      attributes: ['id', 'name', 'date', 'holidayTemplateId'],
    });

    // Fallback: if no direct HolidayDate rows, derive from templates
    if (!rows || rows.length === 0) {
      try {
        const tpls = await HolidayTemplate.findAll({ where: { orgAccountId: orgId }, include: [{ model: HolidayDate, as: 'holidays' }] });
        const list = [];
        for (const tpl of (tpls || [])) {
          const hs = Array.isArray(tpl.holidays) ? tpl.holidays : [];
          for (const h of hs) {
            if (!h || h.active === false || !h.date) continue;
            const d = String(h.date);
            if (d >= todayKey && d <= untilKey) list.push({ id: h.id, name: h.name, date: d });
          }
        }
        list.sort((a, b) => new Date(a.date) - new Date(b.date));
        return res.json({ success: true, holidays: list });
      } catch (_) {
        // ignore and return empty below
      }
    }

    const list = rows
      .filter(r => r && r.date && r.active !== false)
      .map(r => ({ id: r.id, name: r.name, date: r.date }));
    return res.json({ success: true, holidays: list });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load upcoming holidays' });
  }
});

// --- Sales Visits (admin) --- (org-scoped)
router.get('/sales/visits', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { SalesVisit, User } = sequelize.models;
    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const rows = await SalesVisit.findAll({ where: { userId: orgStaffIds }, order: [['id','DESC']], limit: 500 });
    // Resolve user names safely
    const userIds = Array.from(new Set(rows.map(r => (r.userId ?? r.user_id)).filter(v => Number.isFinite(Number(v))))).map(Number);
    const userMap = {};
    if (User && userIds.length > 0) {
      try {
        const users = await User.findAll({ where: { id: userIds }, attributes: ['id','name','phone'] });
        for (const u of users) userMap[u.id] = u.name || u.phone || `User #${u.id}`;
      } catch (_) {}
    }
    const data = rows.map(r => ({
      id: r.id,
      visitDate: r.visitDate || r.createdAt,
      userId: r.userId ?? r.user_id ?? null,
      staffName: (() => { const uid = r.userId ?? r.user_id; return (uid && userMap[uid]) ? userMap[uid] : null; })(),
      clientName: r.clientName || null,
      visitType: r.visitType || null,
      location: r.location || null,
      madeOrder: !!r.madeOrder,
      amount: Number(r.amount || 0),
      verified: !!r.verified,
    }));
    return res.json({ success: true, visits: data });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load visits' });
  }
});

// Update a sales visit's verified flag (org-scoped)
router.put('/sales/visits/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { SalesVisit, User } = sequelize.models;
    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'invalid id' });
    const row = await SalesVisit.findOne({ where: { id, userId: orgStaffIds } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    const { verified } = req.body || {};
    const v = (typeof verified === 'string') ? (verified === 'true' || verified === '1') : !!verified;
    await row.update({ verified: v });
    return res.json({ success: true, visit: { id: row.id, verified: row.verified === true } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update visit' });
  }
});

// --- Sales Orders (admin) --- (org-scoped)
router.get('/sales/orders', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { Order, User, Client, OrderItem } = sequelize.models;
    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const rows = await Order.findAll({ where: { userId: orgStaffIds }, order: [['id','DESC']], limit: 500 });
    const userIds = Array.from(new Set(rows.map(r => (r.userId ?? r.user_id)).filter(v => Number.isFinite(Number(v))))).map(Number);
    const clientIds = Array.from(new Set(rows.map(r => r.clientId).filter(v => Number.isFinite(Number(v))))).map(Number);
    const userMap = {}; const clientMap = {}; const itemsCount = {};
    if (User && userIds.length > 0) {
      try {
        const users = await User.findAll({ where: { id: userIds }, attributes: ['id','name','phone'] });
        for (const u of users) userMap[u.id] = u.name || u.phone || `User #${u.id}`;
      } catch (_) {}
    }
    if (Client && clientIds.length > 0) {
      try {
        const clients = await Client.findAll({ where: { id: clientIds }, attributes: ['id','name','phone','location'] });
        for (const c of clients) clientMap[c.id] = c.name || c.phone || `Client #${c.id}`;
      } catch (_) {}
    }
    if (OrderItem && rows.length > 0) {
      try {
        const orderIds = rows.map(r => r.id);
        // Use snake_case column names as per DB schema
        const [counts] = await sequelize.query(
          `SELECT order_id AS id, COUNT(*) AS cnt FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(',')}) GROUP BY order_id`,
          { replacements: orderIds }
        );
        for (const k of counts) itemsCount[Number(k.id)] = Number(k.cnt) || 0;
      } catch (_) {}
    }
    const data = rows.map(r => ({
      id: r.id,
      orderDate: r.orderDate || r.createdAt,
      userId: r.userId ?? r.user_id ?? null,
      staffName: (() => { const uid = r.userId ?? r.user_id; return (uid && userMap[uid]) ? userMap[uid] : null; })(),
      clientName: (r.clientId && clientMap[r.clientId]) ? clientMap[r.clientId] : null,
      totalAmount: Number(r.totalAmount || r.total_amount || 0),
      items: itemsCount[r.id] || 0,
    }));
    return res.json({ success: true, orders: data });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load orders' });
  }
});

router.put('/sales/targets/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { SalesTarget, User } = sequelize.models;
    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'invalid id' });
    const row = await SalesTarget.findOne({ where: { id, staffUserId: orgStaffIds } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    const { staffUserId, period, periodDate, targetAmount, targetOrders } = req.body || {};
    const patch = {};
    if (staffUserId !== undefined) {
      const sid = Number(staffUserId);
      if (!Number.isFinite(sid)) return res.status(400).json({ success: false, message: 'invalid staffUserId' });
      // Validate staff belongs to org
      if (!orgStaffIds.includes(sid)) return res.status(400).json({ success: false, message: 'Staff not found' });
      patch.staff_user_id = sid; patch.staffUserId = sid;
    }
    if (period !== undefined) patch.period = ['daily','weekly','monthly'].includes(String(period)) ? String(period) : 'monthly';
    if (periodDate !== undefined) { const pd = periodDate ? String(periodDate) : null; patch.period_date = pd; patch.periodDate = pd; }
    if (targetAmount !== undefined) { const ta = Number(targetAmount || 0); patch.target_amount = ta; patch.targetAmount = ta; }
    if (targetOrders !== undefined) { const to = Number(targetOrders || 0); patch.target_orders = to; patch.targetOrders = to; }

    await row.update(patch);
    return res.json({ success: true, target: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update sales target' });
  }
});

router.delete('/sales/targets/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { SalesTarget, User } = sequelize.models;
    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'invalid id' });
    const row = await SalesTarget.findOne({ where: { id, staffUserId: orgStaffIds } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await row.destroy();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete sales target' });
  }
});

router.get('/sales/orders/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { Order, Client, AssignedJob, OrderItem, User } = sequelize.models;
    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const id = Number(req.params.id);
    const row = await Order.findOne({
      where: { id, userId: orgStaffIds },
      include: [
        { model: Client, as: 'client' },
        { model: AssignedJob, as: 'assignedJob' },
        { model: OrderItem, as: 'items' },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    // staff name map
    let staffName = null;
    const uid = row.userId ?? row.user_id;
    if (User && Number.isFinite(Number(uid))) {
      try {
        const u = await User.findOne({ where: { id: Number(uid), orgAccountId: orgId }, attributes: ['id','name','phone'] });
        staffName = u ? (u.name || u.phone || `User #${u.id}`) : null;
      } catch (_) {}
    }

    const out = {
      id: row.id,
      orderDate: row.orderDate || row.createdAt,
      staffName,
      clientName: row.client?.name || null,
      paymentMethod: row.paymentMethod || null,
      remarks: row.remarks || null,
      netAmount: Number(row.netAmount || row.net_amount || 0),
      gstAmount: Number(row.gstAmount || row.gst_amount || 0),
      totalAmount: Number(row.totalAmount || row.total_amount || 0),
      items: Array.isArray(row.items) ? row.items : [],
      client: row.client,
      assignedJob: row.assignedJob,
    };

    return res.json({ success: true, order: out });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load order' });
  }
});

// Clear business logo (org-scoped)
router.delete('/settings/business-info/logo', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await sequelize.models.OrgBusinessInfo.findOne({ where: { active: true, orgAccountId: orgId } });
    if (!row) return res.json({ success: true });
    await row.update({ logoUrl: null });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to clear logo' });
  }
});

// Organization Business Info (state & city) (org-scoped)
router.get('/settings/business-info', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await sequelize.models.OrgBusinessInfo.findOne({ where: { active: true, orgAccountId: orgId }, order: [['updatedAt','DESC']] });
    if (!row) return res.json({ success: true, info: null });
    return res.json({ success: true, info: {
      state: row.state || null,
      city: row.city || null,
      addressLine1: row.addressLine1 || null,
      addressLine2: row.addressLine2 || null,
      pincode: row.pincode || null,
      logoUrl: row.logoUrl || null,
    } });
  } catch (e) {
    console.error('[business-info GET]', e);
    return res.status(500).json({ success: false, message: 'Failed to load business info' });
  }
});

router.put('/settings/business-info', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const state = req.body?.state ? String(req.body.state) : null;
    const city = req.body?.city ? String(req.body.city) : null;
    const addressLine1 = req.body?.addressLine1 ? String(req.body.addressLine1) : null;
    const addressLine2 = req.body?.addressLine2 ? String(req.body.addressLine2) : null;
    const pincode = req.body?.pincode ? String(req.body.pincode) : null;
    const existing = await sequelize.models.OrgBusinessInfo.findOne({ where: { active: true, orgAccountId: orgId } });
    if (existing) {
      await existing.update({ state, city, addressLine1, addressLine2, pincode });
      return res.json({ success: true });
    }
    await sequelize.models.OrgBusinessInfo.create({ state, city, addressLine1, addressLine2, pincode, active: true, orgAccountId: orgId });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to save business info' });
  }
});

// KYB document upload (single file per key)
// Allowed keys -> model fields mapping
const KYB_DOC_KEYS = {
  certificate_incorp: 'docCertificateIncorp',
  company_pan: 'docCompanyPan',
  director_pan: 'docDirectorPan',
  cancelled_cheque: 'docCancelledCheque',
  director_id: 'docDirectorId',
  gstin_certificate: 'docGstinCertificate',
};

router.post('/settings/kyb/doc/:key', upload.single('file'), async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const key = String(req.params.key || '').toLowerCase();
    const field = KYB_DOC_KEYS[key];
    if (!field) return res.status(400).json({ success: false, message: 'Invalid document key' });
    if (!req.file) return res.status(400).json({ success: false, message: 'file is required' });
    const fileUrl = `/uploads/claims/${req.file.filename}`;

    let row = await sequelize.models.OrgKyb.findOne({ where: { active: true, orgAccountId: orgId } });
    if (!row) row = await sequelize.models.OrgKyb.create({ active: true, orgAccountId: orgId });
    await row.update({ [field]: fileUrl });
    return res.json({ success: true, key, url: fileUrl });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
});

// Organization KYB settings (details only, no file uploads) (org-scoped)
router.get('/settings/kyb', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await sequelize.models.OrgKyb.findOne({ where: { active: true, orgAccountId: orgId }, order: [['updatedAt','DESC']] });
    if (!row) return res.json({ success: true, kyb: null });
    return res.json({ success: true, kyb: {
      businessType: row.businessType || null,
      gstin: row.gstin || null,
      businessName: row.businessName || null,
      businessAddress: row.businessAddress || null,
      cin: row.cin || null,
      directorName: row.directorName || null,
      companyPan: row.companyPan || null,
      bankAccountNumber: row.bankAccountNumber || null,
      ifsc: row.ifsc || null,
      docs: {
        certificate_incorp: row.docCertificateIncorp || null,
        company_pan: row.docCompanyPan || null,
        director_pan: row.docDirectorPan || null,
        cancelled_cheque: row.docCancelledCheque || null,
        director_id: row.docDirectorId || null,
        gstin_certificate: row.docGstinCertificate || null,
      }
      // docs will be added later
    }});
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load KYB settings' });
  }
});

router.put('/settings/kyb', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const {
      businessType,
      gstin,
      businessName,
      businessAddress,
      cin,
      directorName,
      companyPan,
      bankAccountNumber,
      ifsc,
    } = req.body || {};

    const payload = {
      businessType: businessType ? String(businessType) : null,
      gstin: gstin ? String(gstin).toUpperCase() : null,
      businessName: businessName ? String(businessName) : null,
      businessAddress: businessAddress ? String(businessAddress) : null,
      cin: cin ? String(cin).toUpperCase() : null,
      directorName: directorName ? String(directorName) : null,
      companyPan: companyPan ? String(companyPan).toUpperCase() : null,
      bankAccountNumber: bankAccountNumber ? String(bankAccountNumber) : null,
      ifsc: ifsc ? String(ifsc).toUpperCase() : null,
    };

    const existing = await sequelize.models.OrgKyb.findOne({ where: { active: true, orgAccountId: orgId } });
    if (existing) {
      await existing.update(payload);
      return res.json({ success: true });
    }
    await sequelize.models.OrgKyb.create({ ...payload, active: true, orgAccountId: orgId });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to save KYB settings' });
  }
});

// Organization business bank account (org-scoped)
router.get('/settings/bank-account', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await sequelize.models.OrgBankAccount.findOne({ where: { active: true, orgAccountId: orgId }, order: [['updatedAt','DESC']] });
    if (!row) return res.json({ success: true, bank: null });
    const masked = row.accountNumber && row.accountNumber.length >= 4
      ? `${'*'.repeat(Math.max(0, row.accountNumber.length - 4))}${row.accountNumber.slice(-4)}`
      : row.accountNumber || null;
    return res.json({ success: true, bank: {
      accountHolderName: row.accountHolderName,
      accountNumber: row.accountNumber,
      ifsc: row.ifsc,
      maskedAccount: masked,
    }});
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load bank account' });
  }
});

router.put('/settings/bank-account', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { accountHolderName, accountNumber, confirmAccountNumber, ifsc } = req.body || {};
    const holder = String(accountHolderName || '').trim();
    const acc = String(accountNumber || '').trim();
    const acc2 = confirmAccountNumber == null ? acc : String(confirmAccountNumber).trim();
    const ifscCode = String(ifsc || '').trim().toUpperCase();
    if (!holder || !acc || !ifscCode) return res.status(400).json({ success: false, message: 'accountHolderName, accountNumber and ifsc are required' });
    if (acc !== acc2) return res.status(400).json({ success: false, message: 'Account number mismatch' });

    // Upsert single active row
    const existing = await sequelize.models.OrgBankAccount.findOne({ where: { active: true, orgAccountId: orgId } });
    if (existing) {
      await existing.update({ accountHolderName: holder, accountNumber: acc, ifsc: ifscCode });
      return res.json({ success: true });
    }
    await sequelize.models.OrgBankAccount.create({ accountHolderName: holder, accountNumber: acc, ifsc: ifscCode, active: true, orgAccountId: orgId });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to save bank account' });
  }
});

// --- Salary Templates (admin scope) --- (org-scoped)
router.get('/salary-templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await SalaryTemplate.findAll({ where: { active: true, orgAccountId: orgId }, order: [['name','ASC']] });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch salary templates' });
  }
});

router.get('/salary-templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await SalaryTemplate.findOne({ where: { id: req.params.id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Salary template not found' });
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch salary template' });
  }
});

router.post('/salary-templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await SalaryTemplate.create({ ...(req.body || {}), orgAccountId: orgId });
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create salary template' });
  }
});

router.put('/salary-templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await SalaryTemplate.findOne({ where: { id: req.params.id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Salary template not found' });
    await row.update(req.body || {});
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update salary template' });
  }
});

router.delete('/salary-templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await SalaryTemplate.findOne({ where: { id: req.params.id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Salary template not found' });
    await row.destroy();   
    return res.json({ success: true, deleted: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete salary template' });
  }
});

// --- Document Types management --- (org-scoped)
// List document types
router.get('/document-types', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await DocumentType.findAll({ where: { orgAccountId: orgId }, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load document types' });
  }
});

// Create document type (org-scoped)
router.post('/document-types', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { key, name, required, allowed_mime, active } = req.body || {};
    if (!key || !name) return res.status(400).json({ success: false, message: 'key and name are required' });
    const row = await DocumentType.create({
      key: String(key).trim(),
      name: String(name).trim(),
      required: !!required,
      allowed_mime: allowed_mime ? String(allowed_mime) : null,
      active: active === undefined ? true : !!active,
      orgAccountId: orgId,
    });
    return res.json({ success: true, type: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create document type' });
  }
});

// Update document type (org-scoped)
router.put('/document-types/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await DocumentType.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const { key, name, required, allowed_mime, active } = req.body || {};
    const patch = {};
    if (key !== undefined) patch.key = String(key).trim();
    if (name !== undefined) patch.name = String(name).trim();
    if (required !== undefined) patch.required = !!required;
    if (allowed_mime !== undefined) patch.allowed_mime = allowed_mime ? String(allowed_mime) : null;
    if (active !== undefined) patch.active = !!active;
    await row.update(patch);
    return res.json({ success: true, type: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update document type' });
  }
});

// --- Weekly Off Templates & Assignments ---
function getMonthWeekNumber(d) {
  const day = d.getDate();
  return Math.floor((day - 1) / 7) + 1; // 1..5
}

function isWeeklyOffForDate(configArray, jsDate) {
  try {
    const dow = jsDate.getDay(); // 0=Sun
    const wk = getMonthWeekNumber(jsDate);
    for (const cfg of Array.isArray(configArray) ? configArray : []) {
      if (cfg && Number(cfg.day) === dow) {
        if (cfg.weeks === 'all') return true;
        if (Array.isArray(cfg.weeks) && cfg.weeks.includes(wk)) return true;
      }
    }
    return false;
  } catch (_) { return false; }
}

// List templates (org-scoped)
router.get('/weekly-off/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await sequelize.models.WeeklyOffTemplate.findAll({ where: { orgAccountId: orgId }, order: [['createdAt', 'DESC']], include: [{ model: sequelize.models.StaffWeeklyOffAssignment, as: 'assignments', attributes: ['id'] }] });
    const data = rows.map(r => ({ id: r.id, name: r.name, config: r.config || [], active: r.active !== false, assignedCount: (r.assignments || []).length }));
    return res.json({ success: true, templates: data });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load weekly off templates' });
  }
});

// Create template (org-scoped)
router.post('/weekly-off/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { name, config, active } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const norm = Array.isArray(config) ? config.filter(x => x && x.day != null).map(x => ({ day: Number(x.day), weeks: x.weeks === 'all' ? 'all' : Array.isArray(x.weeks) ? x.weeks.map(Number) : [] })) : [];
    const row = await sequelize.models.WeeklyOffTemplate.create({ name: String(name), config: norm, active: active === undefined ? true : !!active, orgAccountId: orgId });
    return res.json({ success: true, template: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create weekly off template' });
  }
});

// Update template (org-scoped)
router.put('/weekly-off/templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await sequelize.models.WeeklyOffTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'not found' });
    const { name, config, active } = req.body || {};
    const patch = {};
    if (name !== undefined) patch.name = String(name);
    if (active !== undefined) patch.active = !!active;
    if (config !== undefined) {
      patch.config = Array.isArray(config) ? config.filter(x => x && x.day != null).map(x => ({ day: Number(x.day), weeks: x.weeks === 'all' ? 'all' : Array.isArray(x.weeks) ? x.weeks.map(Number) : [] })) : [];
    }
    await row.update(patch);
    const fresh = await sequelize.models.WeeklyOffTemplate.findByPk(id);
    return res.json({ success: true, template: fresh });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update weekly off template' });
  }
});

// Assign weekly off template to staff (single or multiple) (org-scoped)
router.post('/weekly-off/assign', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { userId, userIds, weeklyOffTemplateId, effectiveFrom, effectiveTo } = req.body || {};
    const tplId = Number(weeklyOffTemplateId);
    if (!Number.isFinite(tplId)) return res.status(400).json({ success: false, message: 'weeklyOffTemplateId required' });
    const tpl = await sequelize.models.WeeklyOffTemplate.findOne({ where: { id: tplId, orgAccountId: orgId } });
    if (!tpl) return res.status(404).json({ success: false, message: 'Weekly off template not found' });
    const users = Array.isArray(userIds) ? userIds : (userId ? [userId] : []);
    if (!users.length) return res.status(400).json({ success: false, message: 'userId(s) required' });
    const from = String(effectiveFrom || '').trim();
    if (!/\d{4}-\d{2}-\d{2}/.test(from)) return res.status(400).json({ success: false, message: 'effectiveFrom YYYY-MM-DD required' });
    const to = effectiveTo && /\d{4}-\d{2}-\d{2}/.test(String(effectiveTo)) ? String(effectiveTo) : null;

    const payload = users.map(uid => ({ userId: Number(uid), weeklyOffTemplateId: tplId, effectiveFrom: from, effectiveTo: to }));
    await sequelize.models.StaffWeeklyOffAssignment.bulkCreate(payload);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to assign weekly off template' });
  }
});

// Compute weekly off dates for a user between start and end (inclusive)
router.get('/weekly-off/user/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { start, end } = req.query || {};
    if (!/\d{4}-\d{2}-\d{2}/.test(String(start)) || !/\d{4}-\d{2}-\d{2}/.test(String(end))) {
      return res.status(400).json({ success: false, message: 'start and end YYYY-MM-DD required' });
    }
    const rows = await sequelize.models.StaffWeeklyOffAssignment.findAll({ where: { userId }, include: [{ model: sequelize.models.WeeklyOffTemplate, as: 'template' }] });
    const offs = [];
    const s = new Date(String(start));
    const e = new Date(String(end));
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      for (const asg of rows) {
        const ef = new Date(asg.effectiveFrom);
        const et = asg.effectiveTo ? new Date(asg.effectiveTo) : null;
        if (d >= ef && (!et || d <= et)) {
          if (isWeeklyOffForDate(asg.template?.config || [], d)) {
            offs.push(dateStr);
            break;
          }
        }
      }
    }
    return res.json({ success: true, dates: offs });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to compute weekly off dates' });
  }
});

// --- Business Functions (lightweight define) ---
let BusinessFunction = sequelize.models.BusinessFunction;
let BusinessFunctionValue = sequelize.models.BusinessFunctionValue;
if (!BusinessFunction || !BusinessFunctionValue) {
  const { DataTypes } = require('sequelize');
  if (!BusinessFunction) {
    BusinessFunction = sequelize.define('BusinessFunction', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(128), allowNull: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, { tableName: 'business_functions', timestamps: true });
  }
  if (!BusinessFunctionValue) {
    BusinessFunctionValue = sequelize.define('BusinessFunctionValue', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      businessFunctionId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'business_function_id' },
      value: { type: DataTypes.STRING(128), allowNull: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: true },
    }, { tableName: 'business_function_values', timestamps: true });
  }
  try {
    BusinessFunction.hasMany(BusinessFunctionValue, { as: 'values', foreignKey: 'businessFunctionId' });
    BusinessFunctionValue.belongsTo(BusinessFunction, { foreignKey: 'businessFunctionId' });
  } catch (_) {}
}

// List all business functions with values (org-scoped)
router.get('/business-functions', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await BusinessFunction.findAll({
      where: { orgAccountId: orgId },
      order: [['createdAt', 'DESC']],
      include: [{ model: BusinessFunctionValue, as: 'values' }],
    });
    const data = rows.map(f => ({
      id: f.id,
      name: f.name,
      active: f.active !== false,
      values: (f.values || [])
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.value).localeCompare(String(b.value)))
        .map(v => ({ id: v.id, value: v.value, active: v.active !== false, sortOrder: v.sortOrder }))
    }));
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load business functions' });
  }
});

// Get a single business function (org-scoped)
router.get('/business-functions/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await BusinessFunction.findOne({ where: { id, orgAccountId: orgId }, include: [{ model: BusinessFunctionValue, as: 'values' }] });
    if (!row) return res.status(404).json({ success: false, message: 'not found' });
    const payload = {
      id: row.id,
      name: row.name,
      active: row.active !== false,
      values: (row.values || [])
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.value).localeCompare(String(b.value)))
        .map(v => ({ id: v.id, value: v.value, active: v.active !== false, sortOrder: v.sortOrder }))
    };
    return res.json({ success: true, function: payload });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load business function' });
  }
});

// Create business function (org-scoped)
router.post('/business-functions', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { name, active, values } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const row = await BusinessFunction.create({ name: String(name), active: active === undefined ? true : !!active, orgAccountId: orgId });
    if (Array.isArray(values) && values.length) {
      const payload = values.filter(x => x && x.value).map((x, idx) => ({
        businessFunctionId: row.id,
        value: String(x.value),
        active: x.active === undefined ? true : !!x.active,
        sortOrder: Number.isFinite(Number(x.sortOrder)) ? Number(x.sortOrder) : idx,
      }));
      if (payload.length) await BusinessFunctionValue.bulkCreate(payload);
    }
    const created = await BusinessFunction.findByPk(row.id, { include: [{ model: BusinessFunctionValue, as: 'values' }] });
    return res.json({ success: true, function: created });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create business function' });
  }
});

// Update business function and replace values if provided (org-scoped)
router.put('/business-functions/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await BusinessFunction.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'not found' });
    const { name, active, values } = req.body || {};
    const patch = {};
    if (name !== undefined) patch.name = String(name);
    if (active !== undefined) patch.active = !!active;
    if (Object.keys(patch).length) await row.update(patch);
    if (Array.isArray(values)) {
      await BusinessFunctionValue.destroy({ where: { businessFunctionId: row.id } });
      const payload = values.filter(x => x && x.value).map((x, idx) => ({
        businessFunctionId: row.id,
        value: String(x.value),
        active: x.active === undefined ? true : !!x.active,
        sortOrder: Number.isFinite(Number(x.sortOrder)) ? Number(x.sortOrder) : idx,
      }));
      if (payload.length) await BusinessFunctionValue.bulkCreate(payload);
    }
    const updated = await BusinessFunction.findByPk(row.id, { include: [{ model: BusinessFunctionValue, as: 'values' }] });
    return res.json({ success: true, function: updated });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update business function' });
  }
});

// Delete a business function (and its values) (org-scoped)
router.delete('/business-functions/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await BusinessFunction.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'not found' });
    await BusinessFunctionValue.destroy({ where: { businessFunctionId: id } });
    await row.destroy();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete business function' });
  }
});

// Effective attendance template for a user
router.get('/settings/attendance-templates/effective/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return res.status(400).json({ success: false, message: 'Invalid userId' });
    const asg = await StaffAttendanceAssignment.findOne({ where: { userId } });
    if (!asg) return res.json({ success: true, template: null });
    const tpl = await AttendanceTemplate.findByPk(asg.attendanceTemplateId);
    if (!tpl) return res.json({ success: true, template: null });
    // Normalize to camelCase keys expected by clients
    const payload = {
      id: tpl.id,
      name: tpl.name,
      attendanceMode: tpl.attendanceMode ?? tpl.attendance_mode ?? null,
      holidaysRule: tpl.holidaysRule ?? tpl.holidays_rule ?? null,
      trackInOutEnabled: tpl.trackInOutEnabled ?? tpl.track_in_out_enabled ?? false,
      requirePunchOut: tpl.requirePunchOut ?? tpl.require_punch_out ?? false,
      allowMultiplePunches: tpl.allowMultiplePunches ?? tpl.allow_multiple_punches ?? false,
      markAbsentPrevDaysEnabled: tpl.markAbsentPrevDaysEnabled ?? tpl.mark_absent_prev_days_enabled ?? false,
      markAbsentRule: tpl.markAbsentRule ?? tpl.mark_absent_rule ?? 'none',
      effectiveHoursRule: tpl.effectiveHoursRule ?? tpl.effective_hours_rule ?? null,
    };
    return res.json({ success: true, template: payload });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load effective attendance template' });
  }
});

// --- Leave Templates & Assignments --- (org-scoped)
// List leave templates with categories and assigned count
router.get('/leave/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await LeaveTemplate.findAll({
      where: { orgAccountId: orgId },
      order: [['createdAt', 'DESC']],
      include: [{ model: LeaveTemplateCategory, as: 'categories' }, { model: StaffLeaveAssignment, as: 'assignments', attributes: ['id'] }],
    });
    return res.json({
      success: true,
      templates: rows.map(t => ({
        id: t.id,
        name: t.name,
        cycle: t.cycle,
        countSandwich: t.countSandwich,
        approvalLevel: t.approvalLevel,
        active: t.active !== false,
        categories: (t.categories || []).map(c => ({ id: c.id, key: c.key, name: c.name, leaveCount: String(c.leaveCount), unusedRule: c.unusedRule, carryLimitDays: c.carryLimitDays, encashLimitDays: c.encashLimitDays })),
        assignedCount: (t.assignments || []).length,
      }))
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load leave templates' });
  }
});

// Create leave template (org-scoped)
router.post('/leave/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { name, cycle, countSandwich, approvalLevel, active, categories } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const row = await LeaveTemplate.create({
      name: String(name),
      cycle: cycle || 'yearly',
      countSandwich: !!countSandwich,
      approvalLevel: Number.isFinite(Number(approvalLevel)) ? Number(approvalLevel) : 1,
      active: active === undefined ? true : !!active,
      orgAccountId: orgId,
    });
    if (Array.isArray(categories) && categories.length) {
      const payload = categories.filter(c => c && c.name && c.key).map(c => ({
        leaveTemplateId: row.id,
        key: String(c.key),
        name: String(c.name),
        leaveCount: Number(c.leaveCount || 0),
        unusedRule: c.unusedRule || 'lapse',
        carryLimitDays: c.carryLimitDays == null ? null : Number(c.carryLimitDays),
        encashLimitDays: c.encashLimitDays == null ? null : Number(c.encashLimitDays),
      }));
      if (payload.length) await LeaveTemplateCategory.bulkCreate(payload);
    }
    const created = await LeaveTemplate.findByPk(row.id, { include: [{ model: LeaveTemplateCategory, as: 'categories' }] });
    return res.json({ success: true, template: created });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create leave template' });
  }
});

// Update leave template (org-scoped)
router.put('/leave/templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'invalid id' });
    const row = await LeaveTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'not found' });

    const { name, cycle, countSandwich, approvalLevel, active, categories } = req.body || {};
    await row.update({
      name: name !== undefined ? String(name) : row.name,
      cycle: cycle !== undefined ? String(cycle) : row.cycle,
      countSandwich: countSandwich !== undefined ? !!countSandwich : row.countSandwich,
      approvalLevel: approvalLevel !== undefined ? Number(approvalLevel) : row.approvalLevel,
      active: active !== undefined ? !!active : row.active,
    });

    if (Array.isArray(categories)) {
      await LeaveTemplateCategory.destroy({ where: { leaveTemplateId: row.id } });
      const payload = categories.filter(c => c && c.name && c.key).map(c => ({
        leaveTemplateId: row.id,
        key: String(c.key),
        name: String(c.name),
        leaveCount: Number(c.leaveCount || 0),
        unusedRule: c.unusedRule || 'lapse',
        carryLimitDays: c.carryLimitDays == null ? null : Number(c.carryLimitDays),
        encashLimitDays: c.encashLimitDays == null ? null : Number(c.encashLimitDays),
      }));
      if (payload.length) await LeaveTemplateCategory.bulkCreate(payload);
    }

    const updated = await LeaveTemplate.findByPk(row.id, { include: [{ model: LeaveTemplateCategory, as: 'categories' }] });
    return res.json({ success: true, template: updated });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update leave template' });
  }
});

// Assign leave template (org-scoped)
router.post('/leave/assign', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { userId, userIds, leaveTemplateId, effectiveFrom, effectiveTo } = req.body || {};
    const tplId = Number(leaveTemplateId);
    if (!Number.isFinite(tplId)) return res.status(400).json({ success: false, message: 'leaveTemplateId required' });
    const tpl = await LeaveTemplate.findOne({ where: { id: tplId, orgAccountId: orgId } });
    if (!tpl) return res.status(404).json({ success: false, message: 'Leave template not found' });
    const users = Array.isArray(userIds) ? userIds : (userId ? [userId] : []);
    if (!users.length) return res.status(400).json({ success: false, message: 'userId(s) required' });
    const from = String(effectiveFrom || '').trim();
    if (!/\d{4}-\d{2}-\d{2}/.test(from)) return res.status(400).json({ success: false, message: 'effectiveFrom YYYY-MM-DD required' });
    const to = effectiveTo && /\d{4}-\d{2}-\d{2}/.test(String(effectiveTo)) ? String(effectiveTo) : null;

    const payload = users.map(uid => ({ userId: Number(uid), leaveTemplateId: tplId, effectiveFrom: from, effectiveTo: to }));
    await StaffLeaveAssignment.bulkCreate(payload);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to assign leave template' });
  }
});

// --- Holiday Templates & Assignments --- (org-scoped)
// List holiday templates with holidays and assigned count
router.get('/holidays/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await HolidayTemplate.findAll({
      where: { orgAccountId: orgId },
      order: [['createdAt', 'DESC']],
      include: [{ model: HolidayDate, as: 'holidays' }, { model: StaffHolidayAssignment, as: 'assignments', attributes: ['id'] }],
    });
    return res.json({
      success: true,
      templates: rows.map(t => ({
        id: t.id,
        name: t.name,
        startMonth: t.startMonth,
        endMonth: t.endMonth,
        active: t.active !== false,
        holidays: (t.holidays || []).map(h => ({ id: h.id, name: h.name, date: h.date, active: h.active !== false })),
        assignedCount: (t.assignments || []).length,
      })),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load holiday templates' });
  }
});

// Create holiday template (org-scoped)
router.post('/holidays/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { name, startMonth, endMonth, active, holidays } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const row = await HolidayTemplate.create({
      name: String(name),
      startMonth: Number.isFinite(Number(startMonth)) ? Number(startMonth) : null,
      endMonth: Number.isFinite(Number(endMonth)) ? Number(endMonth) : null,
      active: active === undefined ? true : !!active,
      orgAccountId: orgId,
    });
    if (Array.isArray(holidays) && holidays.length) {
      const payload = holidays
        .filter(h => h && h.name && h.date)
        .map(h => ({ holidayTemplateId: row.id, name: String(h.name), date: String(h.date), active: h.active === undefined ? true : !!h.active }));
      if (payload.length) await HolidayDate.bulkCreate(payload);
    }
    const created = await HolidayTemplate.findByPk(row.id, { include: [{ model: HolidayDate, as: 'holidays' }] });
    return res.json({ success: true, template: created });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create holiday template' });
  }
});

// Update holiday template (org-scoped)
router.put('/holidays/templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'invalid id' });
    const row = await HolidayTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'not found' });

    const { name, startMonth, endMonth, active, holidays } = req.body || {};
    await row.update({
      name: name !== undefined ? String(name) : row.name,
      startMonth: startMonth !== undefined ? (Number.isFinite(Number(startMonth)) ? Number(startMonth) : null) : row.startMonth,
      endMonth: endMonth !== undefined ? (Number.isFinite(Number(endMonth)) ? Number(endMonth) : null) : row.endMonth,
      active: active !== undefined ? !!active : row.active,
    });

    if (Array.isArray(holidays)) {
      await HolidayDate.destroy({ where: { holidayTemplateId: row.id } });
      const payload = holidays
        .filter(h => h && h.name && h.date)
        .map(h => ({ holidayTemplateId: row.id, name: String(h.name), date: String(h.date), active: h.active === undefined ? true : !!h.active }));
      if (payload.length) await HolidayDate.bulkCreate(payload);
    }

    const updated = await HolidayTemplate.findByPk(row.id, { include: [{ model: HolidayDate, as: 'holidays' }] });
    return res.json({ success: true, template: updated });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update holiday template' });
  }
});

// Assign holiday template to staff (single or multiple) (org-scoped)
router.post('/holidays/assign', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { userId, userIds, holidayTemplateId, effectiveFrom, effectiveTo } = req.body || {};
    const tplId = Number(holidayTemplateId);
    if (!Number.isFinite(tplId)) return res.status(400).json({ success: false, message: 'holidayTemplateId required' });
    const tpl = await HolidayTemplate.findOne({ where: { id: tplId, orgAccountId: orgId } });
    if (!tpl) return res.status(404).json({ success: false, message: 'Holiday template not found' });
    const users = Array.isArray(userIds) ? userIds : (userId ? [userId] : []);
    if (!users.length) return res.status(400).json({ success: false, message: 'userId(s) required' });
    const from = String(effectiveFrom || '').trim();
    if (!/\d{4}-\d{2}-\d{2}/.test(from)) return res.status(400).json({ success: false, message: 'effectiveFrom YYYY-MM-DD required' });
    const to = effectiveTo && /\d{4}-\d{2}-\d{2}/.test(String(effectiveTo)) ? String(effectiveTo) : null;

    const payload = users.map(uid => ({ userId: Number(uid), holidayTemplateId: tplId, effectiveFrom: from, effectiveTo: to }));
    await StaffHolidayAssignment.bulkCreate(payload);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to assign holiday template' });
  }
});

// Staff stats: total, active, newHires (last 7 days), onLeave (today overlaps) (org-scoped)
router.get('/staff/stats', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    // Totals and active
    const users = await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id', 'active', 'createdAt'] });
    const total = users.length;
    const active = users.filter(u => u.active === undefined ? true : !!u.active).length;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newHires = users.filter(u => {
      const c = u.createdAt ? new Date(u.createdAt) : null;
      return c && c >= sevenDaysAgo;
    }).length;

    // On leave today: startDate <= today AND endDate >= today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    let onLeave = 0;
    try {
      const rows = await LeaveRequest.findAll({
        where: {
          startDate: { [Op.lte]: todayStr },
          endDate: { [Op.gte]: todayStr },
        },
        attributes: ['userId'],
      });
      const uniq = new Set(rows.map(r => r.userId));
      onLeave = uniq.size;
    } catch (_) {
      onLeave = 0;
    }

    return res.json({ success: true, data: { total, active, newHires, onLeave } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load staff stats' });
  }
});

// --- Attendance Templates & Assignments --- (org-scoped)
// List templates
router.get('/settings/attendance-templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await AttendanceTemplate.findAll({ where: { orgAccountId: orgId }, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load templates' });
  }
});

// Create template (org-scoped)
router.post('/settings/attendance-templates', async (req, res) => {
  console.log('POST /settings/attendance-templates called', req.body);
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    console.log('orgId:', orgId);
    const b = req.body || {};
    // Accept both snake_case and camelCase, use only camelCase for model
    const payload = {
      name: b.name || 'Template',
      orgAccountId: orgId,
      code: b.code || null,
      attendanceMode: b.attendance_mode || b.attendanceMode || 'manual',
      holidaysRule: b.holidays_rule || b.holidaysRule || 'disallow',
      trackInOutEnabled: !!(b.track_in_out_enabled ?? b.trackInOutEnabled),
      requirePunchOut: !!(b.require_punch_out ?? b.requirePunchOut),
      allowMultiplePunches: !!(b.allow_multiple_punches ?? b.allowMultiplePunches),
      markAbsentPrevDaysEnabled: !!(b.mark_absent_prev_days_enabled ?? b.markAbsentPrevDaysEnabled),
      markAbsentRule: b.mark_absent_rule || b.markAbsentRule || 'none',
      effectiveHoursRule: b.effective_hours_rule || b.effectiveHoursRule || null,
      active: b.active !== false,
    };
    console.log('Creating template with payload:', payload);
    const row = await AttendanceTemplate.create(payload);
    console.log('Template created:', row.id);
    return res.json({ success: true, template: row });
  } catch (e) {
    console.error('Create attendance template error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create template', error: e.message });
  }
});

// Update template (org-scoped)
router.put('/settings/attendance-templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await AttendanceTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Template not found' });
    const b = req.body || {};
    // Build patch in camelCase expected by the model
    const patch = {};
    if (b.name !== undefined) patch.name = b.name;
    if (b.code !== undefined) patch.code = b.code;
    if (b.attendance_mode !== undefined || b.attendanceMode !== undefined) { const v = b.attendance_mode ?? b.attendanceMode; patch.attendanceMode = v; patch.attendance_mode = v; }
    if (b.holidays_rule !== undefined || b.holidaysRule !== undefined) { const v = b.holidays_rule ?? b.holidaysRule; patch.holidaysRule = v; patch.holidays_rule = v; }
    if (b.track_in_out_enabled !== undefined || b.trackInOutEnabled !== undefined) { const v = b.track_in_out_enabled ?? b.trackInOutEnabled; patch.trackInOutEnabled = v; patch.track_in_out_enabled = v; }
    if (b.require_punch_out !== undefined || b.requirePunchOut !== undefined) { const v = b.require_punch_out ?? b.requirePunchOut; patch.requirePunchOut = v; patch.require_punch_out = v; }
    if (b.allow_multiple_punches !== undefined || b.allowMultiplePunches !== undefined) { const v = b.allow_multiple_punches ?? b.allowMultiplePunches; patch.allowMultiplePunches = v; patch.allow_multiple_punches = v; }
    if (b.mark_absent_prev_days_enabled !== undefined || b.markAbsentPrevDaysEnabled !== undefined) { const v = b.mark_absent_prev_days_enabled ?? b.markAbsentPrevDaysEnabled; patch.markAbsentPrevDaysEnabled = v; patch.mark_absent_prev_days_enabled = v; }
    if (b.mark_absent_rule !== undefined || b.markAbsentRule !== undefined) { const v = b.mark_absent_rule ?? b.markAbsentRule; patch.markAbsentRule = v; patch.mark_absent_rule = v; }
    if (b.effective_hours_rule !== undefined || b.effectiveHoursRule !== undefined) { const v = b.effective_hours_rule ?? b.effectiveHoursRule; patch.effectiveHoursRule = v; patch.effective_hours_rule = v; }
    await row.update(patch);
    const fresh = await AttendanceTemplate.findByPk(id);
    return res.json({ success: true, template: fresh });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update template' });
  }
});

// Get assigned staff ids for a template
router.get('/settings/attendance-templates/:id/assignments', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await StaffAttendanceAssignment.findAll({ where: { attendanceTemplateId: id } });
    const staffIds = rows.map(r => r.userId);
    return res.json({ success: true, staffIds });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load assignments' });
  }
});

// Assign staff to a template (replace-all)
router.post('/settings/attendance-templates/:id/assign', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { staffIds } = req.body || {};
    if (!Array.isArray(staffIds)) return res.status(400).json({ success: false, message: 'staffIds array required' });
    await StaffAttendanceAssignment.destroy({ where: { attendanceTemplateId: id } });
    const payload = staffIds
      .map(sid => Number(sid))
      .filter(n => Number.isFinite(n))
      .map(n => ({ attendanceTemplateId: id, userId: n }));
    if (payload.length) await StaffAttendanceAssignment.bulkCreate(payload);
    return res.json({ success: true, assigned: payload.length });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to assign staff' });
  }
});

// Staff list (full details) (org-scoped)
router.get('/staff', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    let rows;
    try {
      [rows] = await sequelize.query(
        `SELECT u.id,
                COALESCE(sp.phone, '') AS phone,
                COALESCE(sp.email, '') AS email,
                COALESCE(u.active, 1) AS active,
                COALESCE(sp.created_at, u.created_at) AS createdAt,
                sp.name,
                sp.staff_id AS staffId,
                COALESCE(sp.department, '') AS department
         FROM users u
         INNER JOIN staff_profiles sp ON sp.user_id = u.id
         WHERE u.org_account_id = :orgId AND u.role = 'staff'`,
        { replacements: { orgId } }
      );
    } catch (eRaw) {
      console.warn('Raw JOIN query failed:', eRaw?.message || eRaw);
      // Fallback via ORM without associations to avoid alias issues
      const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
      const profs = await StaffProfile.findAll({ where: { userId: orgStaffIds }, attributes: ['userId', 'name', 'staffId', 'department', 'phone', 'email', 'createdAt'] });
      rows = profs.map(p => ({ id: p.userId, name: p.name, staffId: p.staffId, department: p.department, phone: p.phone, email: p.email, active: 1, createdAt: p.createdAt }));
    }
    const data = (rows || []).map(r => ({
      id: r.id,
      name: r.name || `Staff ${r.id}`,
      email: r.email || '',
      phone: r.phone || '',
      role: 'staff',
      staffId: r.staffId || '',
      department: r.department || '',
      active: r.active === undefined ? true : !!r.active,
      createdAt: r.createdAt || null,
    }));
    return res.json({ success: true, data, staff: data });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load staff list' });
  }
});
// const upload = multer({ storage });

// Separate storage for staff documents
const docsDir = path.join(process.cwd(), 'uploads', 'staff-docs');
try { fs.mkdirSync(docsDir, { recursive: true }); } catch (_) { }
const docsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, docsDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${ts}-${safe}`);
  },
});
const uploadDoc = multer({ storage: docsStorage });

// Serve uploaded files under /admin/uploads/*
router.get('/uploads/*', (req, res) => {
  const p = req.params[0] ? req.params[0] : req.path.replace(/^\/uploads\//, '');
  const filePath = path.join(process.cwd(), 'uploads', p);
  if (!filePath.startsWith(path.join(process.cwd(), 'uploads'))) return res.status(400).end();
  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) return res.status(404).end();
    res.sendFile(filePath);
  });
});

// --- Loans model and routes ---
let Loan = sequelize.models.Loan;
if (!Loan) {
  const { DataTypes } = require('sequelize');
  Loan = sequelize.define('Loan', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    type: { type: DataTypes.ENUM('loan', 'payment'), allowNull: false, defaultValue: 'loan' },
    description: { type: DataTypes.STRING(500), allowNull: true },
    notifySms: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, { tableName: 'loans' });
}

router.get('/staff/:id/loans', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const user = await User.findOne({ where: { id, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const rows = await Loan.findAll({ where: { userId: id }, order: [['date', 'DESC'], ['createdAt', 'DESC']] });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load loans' });
  }
});

// --- Expense Claims (table: expense_claims) ---
let ExpenseClaim = sequelize.models.ExpenseClaim;
if (!ExpenseClaim) {
  const { DataTypes } = require('sequelize');
  ExpenseClaim = sequelize.define('ExpenseClaim', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    claimId: { type: DataTypes.STRING(50), allowNull: true },
    expenseType: { type: DataTypes.STRING(64), allowNull: true },
    expenseDate: { type: DataTypes.DATEONLY, allowNull: false },
    billNumber: { type: DataTypes.STRING(64), allowNull: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    description: { type: DataTypes.STRING(500), allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'settled'), allowNull: false, defaultValue: 'pending' },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    approvedAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    approvedBy: { type: DataTypes.STRING(100), allowNull: true },
    settledAt: { type: DataTypes.DATE, allowNull: true },
    attachmentUrl: { type: DataTypes.STRING(500), allowNull: true },
  }, { tableName: 'expense_claims', timestamps: true });
}

// List expense claims for a staff (org-scoped)
router.get('/staff/:id/expenses', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const user = await User.findOne({ where: { id, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const rows = await ExpenseClaim.findAll({ where: { userId: id }, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load expense claims' });
  }
});

// --- Staff Documents (lightweight define: staff_documents) ---
let StaffDocument = sequelize.models.StaffDocument;
if (!StaffDocument) {
  const { DataTypes } = require('sequelize');
  StaffDocument = sequelize.define('StaffDocument', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    documentTypeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'document_type_id' },
    fileUrl: { type: DataTypes.STRING(500), allowNull: false, field: 'file_url' },
    fileName: { type: DataTypes.STRING(255), allowNull: true, field: 'file_name' },
    status: { type: DataTypes.STRING(32), allowNull: true, defaultValue: 'SUBMITTED' },
    expiresAt: { type: DataTypes.DATEONLY, allowNull: true, field: 'expires_at' },
    notes: { type: DataTypes.STRING(500), allowNull: true, field: 'notes' },
  }, { tableName: 'staff_documents', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
}

// List staff documents (org-scoped)
router.get('/staff/:id/documents', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const user = await User.findOne({ where: { id, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const rows = await StaffDocument.findAll({ where: { userId: id }, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load documents' });
  }
});

// Create/upload document (org-scoped)
router.post('/staff/:id/documents', uploadDoc.single('file'), async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const { docType, title, expiresAt, notes } = req.body || {};
    const user = await User.findOne({ where: { id, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
    const rel = path.join('uploads', 'staff-docs', req.file.filename).replace(/\\/g, '/');
    const row = await StaffDocument.create({
      userId: id,
      documentTypeId: docType ? Number(docType) : null,
      fileUrl: `/admin/${rel}`,
      fileName: title || req.file.originalname || null,
      expiresAt: expiresAt || null,
      notes: notes || null,
      status: 'SUBMITTED',
    });
    return res.json({ success: true, document: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
});

// Update document metadata or replace file
router.put('/documents/:docId', uploadDoc.single('file'), async (req, res) => {
  try {
    const id = Number(req.params.docId);
    const row = await StaffDocument.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: 'Document not found' });
    const patch = {};
    const { docType, title, expiresAt, notes, status } = req.body || {};
    if (docType !== undefined) patch.documentTypeId = docType ? Number(docType) : null;
    if (title !== undefined) patch.fileName = title || null;
    if (expiresAt !== undefined) patch.expiresAt = expiresAt || null;
    if (notes !== undefined) patch.notes = notes || null;
    if (status !== undefined) patch.status = status || null;
    if (req.file) {
      const rel = path.join('uploads', 'staff-docs', req.file.filename).replace(/\\/g, '/');
      patch.fileUrl = `/admin/${rel}`;
      if (!patch.fileName) patch.fileName = req.file.originalname;
    }
    await row.update(patch);
    return res.json({ success: true, document: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update document' });
  }
});

// Delete document
router.delete('/documents/:docId', async (req, res) => {
  try {
    const id = Number(req.params.docId);
    const row = await StaffDocument.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: 'Document not found' });
    await row.destroy();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
});

// Admin: upload once and assign to all staff (org-scoped)
router.post('/documents/assign-all', uploadDoc.single('file'), async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { docType, title, expiresAt, notes } = req.body || {};
    if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
    const rel = path.join('uploads', 'staff-docs', req.file.filename).replace(/\\/g, '/');
    const fileUrl = `/admin/${rel}`;

    // Fetch all staff user IDs for this org
    const staffUsers = await User.findAll({ where: { role: 'staff', orgAccountId: orgId }, attributes: ['id'] });
    if (!staffUsers.length) return res.json({ success: true, assigned: 0, fileUrl });

    // Prepare bulk insert payload
    const payload = staffUsers.map(u => ({
      userId: u.id,
      documentTypeId: docType ? Number(docType) : null,
      fileUrl,
      fileName: title || req.file.originalname || null,
      expiresAt: expiresAt || null,
      notes: notes || null,
      status: 'SUBMITTED',
    }));

    await StaffDocument.bulkCreate(payload);
    return res.json({ success: true, assigned: payload.length, fileUrl });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to assign document to all staff' });
  }
});

// Admin: list recent staff documents (for Manage Documents page) (org-scoped)
router.get('/documents/recent', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const rows = await StaffDocument.findAll({ where: { userId: orgStaffIds }, order: [['createdAt', 'DESC']], limit: 100 });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load documents' });
  }
});


// Create expense claim (org-scoped)
router.post('/staff/:id/expenses', upload.single('attachment'), async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const { expenseType, expenseDate, billNumber, amount, description } = req.body || {};
    const user = await User.findOne({ where: { id, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });
    let attachmentUrl = null;
    if (req.file) {
      const rel = path.join('uploads', 'claims', req.file.filename).replace(/\\/g, '/');
      attachmentUrl = `/${rel}`;
    }
    const row = await ExpenseClaim.create({
      userId: id,
      claimId: `EC-${Date.now()}`,
      expenseType: expenseType || null,
      expenseDate: expenseDate || new Date().toISOString().slice(0, 10),
      billNumber: billNumber || null,
      amount: amt,
      description: description || null,
      attachmentUrl,
      status: 'pending',
    });
    return res.json({ success: true, claim: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create expense claim' });
  }
});



// Approve/Reject/Settle expense claim (org-scoped)
router.put('/expenses/:claimId/status', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.claimId);
    const { status, approvedAmount, approvedBy } = req.body || {};
    const s = String(status || '').toLowerCase();
    if (!['approved', 'rejected', 'pending', 'settled'].includes(s)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    // Verify claim belongs to org staff
    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const row = await ExpenseClaim.findOne({ where: { id, userId: orgStaffIds } });
    if (!row) return res.status(404).json({ success: false, message: 'Claim not found' });
    const patch = { status: s };
    if (s === 'approved') {
      patch.approvedAt = new Date();
      if (approvedAmount !== undefined) patch.approvedAmount = Number(approvedAmount);
      if (approvedBy) patch.approvedBy = String(approvedBy);
    }
    if (s === 'settled') patch.settledAt = new Date();
    await row.update(patch);
    return res.json({ success: true, claim: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update claim status' });
  }
});

router.get('/staff/:id/loans/summary', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const user = await User.findOne({ where: { id, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const rows = await Loan.findAll({ where: { userId: id } });
    let totalLoan = 0, totalPayment = 0;
    rows.forEach(r => {
      const amt = Number(r.amount || 0);
      if (String(r.type) === 'payment') totalPayment += amt; else totalLoan += amt;
    });
    const balance = totalLoan - totalPayment;
    return res.json({ success: true, totalLoan, totalPayment, balance });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load loan summary' });
  }
});

router.post('/staff/:id/loans', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const { date, amount, description, type, notifySms } = req.body || {};
    const user = await User.findOne({ where: { id, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const t = ['loan', 'payment'].includes(String(type)) ? String(type) : 'loan';
    const dt = date || new Date().toISOString().slice(0, 10);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });
    const row = await Loan.create({ userId: id, date: dt, amount: amt, description: description ? String(description) : null, type: t, notifySms: !!notifySms });
    return res.json({ success: true, loan: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create loan' });
  }
});

// Helper: convert number to Indian currency words (simple, integer part)
function numberToINRWords(n) {
  n = Math.round(Number(n) || 0);
  if (n === 0) return 'Zero Rupees';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const segment = (num) => {
    if (num < 20) return a[num];
    const tens = Math.floor(num / 10), ones = num % 10;
    return b[tens] + (ones ? ' ' + a[ones] : '');
  };
  let words = '';
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = Math.floor(n / 100); n %= 100;
  if (crore) words += segment(Math.floor(crore / 1)) + ' Crore ';
  if (lakh) words += segment(Math.floor(lakh / 1)) + ' Lakh ';
  if (thousand) words += segment(Math.floor(thousand / 1)) + ' Thousand ';
  if (hundred) words += a[hundred] + ' Hundred ';
  if (n) words += (words ? 'and ' : '') + segment(n) + ' ';
  return (words.trim() + 'Rupees').replace(/\s+/g, ' ');
}

// --- Leave Requests (use existing table: leave_request) ---
let LeaveRequest = sequelize.models.LeaveRequest;
if (!LeaveRequest) {
  const { DataTypes } = require('sequelize');
  LeaveRequest = sequelize.define('LeaveRequest', {
    id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    type: { type: DataTypes.STRING(32) },
    reason: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
  }, { tableName: 'leave_request', timestamps: true });
}

// List leaves for a staff (org-scoped)
router.get('/staff/:id/leaves', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const user = await User.findOne({ where: { id, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const rows = await LeaveRequest.findAll({ where: { userId: id }, order: [['createdAt', 'DESC']] });
    const data = rows.map((r) => {
      const o = r.get ? r.get({ plain: true }) : r;
      // Normalize type from possible legacy columns
      o.type = o.type || o.leaveType || o.category || null;
      return o;
    });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load leaves' });
  }
});

// Approve/Reject a leave (org-scoped)
router.put('/leaves/:leaveId/status', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.leaveId);
    const { status } = req.body || {};
    const s = String(status || '').toLowerCase();
    if (!['approved', 'rejected', 'pending'].includes(s)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    // Verify leave belongs to org staff
    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const row = await LeaveRequest.findOne({ where: { id, userId: orgStaffIds } });
    if (!row) return res.status(404).json({ success: false, message: 'Leave not found' });
    await row.update({ status: s });
    return res.json({ success: true, leave: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update leave status' });
  }
});

function getPrevCycleRange(cycle, forDate /* Date */) {
  const d = forDate instanceof Date ? forDate : new Date(forDate);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (cycle === 'yearly') {
    const start = new Date(y - 1, 0, 1);
    const end = new Date(y - 1, 11, 31);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  if (cycle === 'quarterly') {
    const q = Math.floor(m / 3);
    const prevQ = (q + 3 - 1) % 4;
    const yy = q === 0 ? y - 1 : y;
    const sm = prevQ * 3;
    const em = sm + 2;
    const start = new Date(yy, sm, 1);
    const end = new Date(yy, em + 1, 0);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  // monthly
  const prev = new Date(y, m - 1, 1);
  const start = new Date(prev.getFullYear(), prev.getMonth(), 1);
  const end = new Date(prev.getFullYear(), prev.getMonth() + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function getCycleRange(cycle, forDate /* Date */) {
  const d = forDate instanceof Date ? forDate : new Date(forDate);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (cycle === 'yearly') {
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  if (cycle === 'quarterly') {
    const q = Math.floor(m / 3);
    const sm = q * 3;
    const em = sm + 2;
    const start = new Date(y, sm, 1);
    const end = new Date(y, em + 1, 0);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  // monthly default
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

// Helper: compute amount for a line item
function computeItemAmount(item, ctx) {
  const t = String(item?.type || 'fixed').toLowerCase();
  const val = Number(item?.valueNumber || 0);
  let amt = 0;
  if (t === 'percent') {
    const baseKey = String(item?.base || 'gross');
    let baseVal = 0;
    switch (true) {
      case baseKey === 'gross':
        baseVal = Number(ctx.grossBase || 0);
        break;
      case baseKey === 'earnings':
        baseVal = Number(ctx.earningsBase || 0);
        break;
      case baseKey === 'basic':
        baseVal = Number(ctx.basic || 0);
        break;
      case baseKey.startsWith('custom:'):
        baseVal = Number(ctx.custom[baseKey.slice(7)] || 0);
        break;
      default:
        baseVal = Number(ctx.earningsBase || 0);
    }

    // Fallback/override: map explicit salaryValues from request regardless of template
    const ev = (salaryValues && salaryValues.earnings) || {};
    const dv = (salaryValues && salaryValues.deductions) || {};
    const num = (v) => (v === undefined || v === null || v === '' ? 0 : parseFloat(v));

    // Known earnings keys
    const earningKeys = [
      'basic_salary',
      'hra',
      'da',
      'special_allowance',
      'conveyance_allowance',
      'medical_allowance',
      'telephone_allowance',
      'other_allowances'
    ];
    let totalEarningsFallback = 0;
    earningKeys.forEach(k => {
      if (ev[k] !== undefined) {
        userData[k] = num(ev[k]);
      }
      if (userData[k] !== undefined) {
        totalEarningsFallback += num(userData[k]);
      }
    });

    // Update staff salaryValues JSON (merge with existing, accept arrays or objects, coerce to numbers)
    router.put('/staff/:id/salary', async (req, res) => {
      try {
        const { id } = req.params;
        const { salaryValues } = req.body || {};
        if (!salaryValues || typeof salaryValues !== 'object') {
          return res.status(400).json({ success: false, message: 'salaryValues object required' });
        }
        const user = await User.findByPk(id);
        if (!user || user.role !== 'staff') {
          return res.status(404).json({ success: false, message: 'Staff not found' });
        }

        // Parse existing JSON if string
        let current = user.salaryValues || user.salary_values || {};
        const tryParse = (v) => {
          if (typeof v !== 'string') return v;
          try { const p = JSON.parse(v); return p; } catch { return v; }
        };
        current = tryParse(current);
        // Handle double-encoded case: string that parses to a JSON string again
        if (typeof current === 'string') {              
          current = tryParse(current);
        }
        if (!current || typeof current !== 'object') current = {};
    const isEmptyObj = (o) => !o || Object.keys(o).length === 0;
    if (isEmptyObj(current) || (isEmptyObj(current.earnings) && isEmptyObj(current.deductions) && isEmptyObj(current.incentives))) {
      // Build baseline from numeric columns
      const baseE = {
        basic_salary: Number(user.basicSalary || user.basic_salary || 0),
        hra: Number(user.hra || user.hra_amount || 0),
        da: Number(user.da || user.da_amount || 0),
        special_allowance: Number(user.specialAllowance || user.special_allowance || 0),
        conveyance_allowance: Number(user.conveyanceAllowance || user.conveyance_allowance || 0),
        medical_allowance: Number(user.medicalAllowance || user.medical_allowance || 0),
        telephone_allowance: Number(user.telephoneAllowance || user.telephone_allowance || 0),
        other_allowances: Number(user.otherAllowances || user.other_allowances || 0),
      };
      const baseD = {
        provident_fund: Number(user.pfDeduction || user.provident_fund || 0),
        esi: Number(user.esiDeduction || user.esi || 0),
        professional_tax: Number(user.professionalTax || user.professional_tax || 0),
        income_tax: Number(user.tdsDeduction || user.income_tax || 0),
        loan_deduction: Number(user.loanDeduction || user.loan_deduction || 0),
        other_deductions: Number(user.otherDeductions || user.other_deductions || 0),
      };
      current = { earnings: baseE, incentives: {}, deductions: baseD };
    }

        // Normalize incoming format: allow arrays [{name,amount}] or objects {key:value}
        const normalize = (src) => {
          if (Array.isArray(src)) {
            const out = {};
            src.forEach((it) => {
              const k = (it?.name || it?.key || '').toString().trim();
              if (!k) return;
              const n = it?.amount ?? it?.valueNumber ?? it?.value;
              const v = n === undefined || n === null || n === '' ? 0 : parseFloat(n);
              out[k] = Number.isFinite(v) ? v : 0;
            });
            return out;
          }
          if (src && typeof src === 'object') {
            const out = {};
            Object.keys(src).forEach((k) => {
              const n = src[k];
              const v = n === undefined || n === null || n === '' ? 0 : parseFloat(n);
              out[k] = Number.isFinite(v) ? v : 0;
            });
            return out;
          }
          return {};
        };

        const incomingE = normalize(salaryValues.earnings || {});
        const incomingD = normalize(salaryValues.deductions || {});

        // Merge: preserve existing keys not sent in payload, override those provided
        const merged = {
          earnings: { ...(current.earnings || {}), ...incomingE },
          deductions: { ...(current.deductions || {}), ...incomingD },
        };

        await user.update({ salaryValues: merged, salary_values: merged });
        return res.json({ success: true, user: { id: user.id, salaryValues: merged } });
      } catch (e) {
        console.error('Update staff salaryValues error:', e);
        return res.status(500).json({ success: false, message: 'Failed to update salary values' });
      }
    });

    // Activate/Deactivate using query param id
    router.put('/staff/active', async (req, res) => {
      try {
        const id = Number(req.query?.id);
        const { active } = req.body || {};
        if (!Number.isFinite(id)) {
          return res.status(400).json({ success: false, message: 'id required' });
        }
        if (typeof active !== 'boolean') {
          return res.status(400).json({ success: false, message: 'active boolean required' });
        }
        const user = await User.findByPk(id);
        if (!user || user.role !== 'staff') {
          return res.status(404).json({ success: false, message: 'Staff not found' });
        }
        await user.update({ active });
        return res.json({ success: true, active: user.active });
      } catch (e) {
        console.error('Toggle staff active (query) error:', e);
        return res.status(500).json({ success: false, message: 'Failed to update status' });
      }
    });

    // Activate/Deactivate a staff user
    router.put('/staff/:id/active', async (req, res) => {
      try {
        const id = req.params.id;
        const { active } = req.body || {};
        if (typeof active !== 'boolean') {
          return res.status(400).json({ success: false, message: 'active boolean required' });
        }
        const user = await User.findByPk(id);
        if (!user || user.role !== 'staff') {
          return res.status(404).json({ success: false, message: 'Staff not found' });
        }
        await user.update({ active });
        return res.json({ success: true, active: user.active });
      } catch (e) {
        console.error('Toggle staff active error:', e);
        return res.status(500).json({ success: false, message: 'Failed to update status' });
      }
    });

    // Alternate month attendance endpoint using query params
    router.get('/attendance/month', async (req, res) => {
      try {
        const { staffId, month } = req.query || {};
        if (!staffId) return res.status(400).json({ success: false, message: 'staffId required' });
        if (!month || !/^\d{4}-\d{2}$/.test(String(month))) {
          return res.status(400).json({ success: false, message: 'month (YYYY-MM) required' });
        }
        const user = await User.findByPk(Number(staffId));
        if (!user || user.role !== 'staff') {
          return res.status(404).json({ success: false, message: 'Staff not found' });
        }

        const first = new Date(`${month}-01T00:00:00.000Z`);
        const last = new Date(first);
        last.setMonth(first.getMonth() + 1);
        last.setDate(0);
        const fromDate = `${month}-01`;
        const toDate = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;

        const rows = await Attendance.findAll({
          where: { userId: Number(staffId), date: { [Op.between]: [fromDate, toDate] } },
          order: [['date', 'ASC']],
          include: [
            { model: User, as: 'user', attributes: ['id'], include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'staffId', 'department'] }] }
          ]
        });

        const toTime = (dt) => (dt ? new Date(dt).toTimeString().slice(0, 8) : null);
        const data = rows.map(r => {
          let status = r.status || 'absent';
          const isLeave = Number(r.breakTotalSeconds) === -1;
          const isHalfSentinel = Number(r.breakTotalSeconds) === -2;
          if (isLeave) status = 'leave';
          else if (isHalfSentinel) status = 'half_day';
          else if (r.punchedInAt && r.punchedOutAt) {
            const durMs = new Date(r.punchedOutAt) - new Date(r.punchedInAt);
            const durH = durMs / (1000 * 60 * 60);
            status = durH >= 4 ? 'present' : 'half_day';
          } else if (r.punchedInAt || r.punchedOutAt) status = 'half_day';
          return {
            id: r.id,
            date: r.date,
            checkIn: toTime(r.punchedInAt),
            checkOut: toTime(r.punchedOutAt),
            status,
            user: { name: r.user?.profile?.name || null },
            staffProfile: { staffId: r.user?.profile?.staffId || null, department: r.user?.profile?.department || null }
          };
        });

        return res.json({ success: true, data });
      } catch (e) {
        console.error('Attendance month error:', e);
        return res.status(500).json({ success: false, message: 'Failed to load attendance' });
      }
    });
    // Month-wise attendance for a staff member (org-scoped)
    router.get('/staff/:id/attendance', async (req, res) => {
      try {
        const orgId = requireOrg(req, res); if (!orgId) return;
        const { id } = req.params;
        const { month } = req.query; // YYYY-MM
        if (!month || !/^\d{4}-\d{2}$/.test(String(month))) {
          return res.status(400).json({ success: false, message: 'month (YYYY-MM) required' });
        }
        const user = await User.findOne({ where: { id: Number(id), orgAccountId: orgId, role: 'staff' } });
        if (!user) {
          return res.status(404).json({ success: false, message: 'Staff not found' });
        }

        const first = new Date(`${month}-01T00:00:00.000Z`);
        const last = new Date(first);
        last.setMonth(first.getMonth() + 1);
        last.setDate(0); // last day of previous month after increment
        const fromDate = `${month}-01`;
        const toDate = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;

        const rows = await Attendance.findAll({
          where: { userId: Number(id), date: { [Op.between]: [fromDate, toDate] } },
          order: [['date', 'ASC']],
          include: [
            { model: User, as: 'user', attributes: ['id'], include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'staffId', 'department'] }] }
          ]
        });

        const toTime = (dt) => (dt ? new Date(dt).toTimeString().slice(0, 8) : null);
        const data = rows.map(r => {
          let status = r.status || 'absent';
          if (!r.status) {
            if (Number(r.breakTotalSeconds) === -1) status = 'leave';
            else if (Number(r.breakTotalSeconds) === -2) status = 'half_day';
            else if (r.punchedInAt && r.punchedOutAt) {
              const durMs = new Date(r.punchedOutAt) - new Date(r.punchedInAt);
              const durH = durMs / (1000 * 60 * 60);
              status = durH >= 4 ? 'present' : 'half_day';
            } else if (r.punchedInAt || r.punchedOutAt) status = 'half_day';
          }
          return {
            id: r.id,
            date: r.date,
            checkIn: toTime(r.punchedInAt),
            checkOut: toTime(r.punchedOutAt),
            status,
            user: { name: r.user?.profile?.name || null },
            staffProfile: { staffId: r.user?.profile?.staffId || null, department: r.user?.profile?.department || null }
          };
        });

        return res.json({ success: true, data });
      } catch (e) {
        console.error('Staff month attendance error:', e);
        return res.status(500).json({ success: false, message: 'Failed to load attendance' });
      }
    });




    // Known deductions keys
    const deductionKeys = [
      'provident_fund',
      'esi',
      'professional_tax',
      'income_tax',
      'loan_deduction',
      'other_deductions'
    ];
    let totalDeductionsFallback = 0;
    deductionKeys.forEach(k => {
      if (dv[k] !== undefined) {
        userData[k] = num(dv[k]);
      }
      if (userData[k] !== undefined) {
        totalDeductionsFallback += num(userData[k]);
      }
    });

    // Apply totals if not set by template logic
    if (userData.total_earnings === undefined) userData.total_earnings = totalEarningsFallback;
    if (userData.total_deductions === undefined) userData.total_deductions = totalDeductionsFallback;
    const grossSalaryFallback = num(userData.total_earnings) + num(userData.total_incentives || 0);
    const netSalaryFallback = grossSalaryFallback - num(userData.total_deductions);
    if (userData.gross_salary === undefined) userData.gross_salary = grossSalaryFallback;
    if (userData.net_salary === undefined) userData.net_salary = netSalaryFallback;
    if (!userData.salary_last_calculated) userData.salary_last_calculated = new Date();
    amt = (baseVal * val) / 100;
  } else {
    amt = val;
  }

  // caps / mins
  if (Number.isFinite(item?.capAmount)) amt = Math.min(amt, Number(item.capAmount));
  if (Number.isFinite(item?.minAmount)) amt = Math.max(amt, Number(item.minAmount));

  // rounding
  const r = String(item?.rounding || (t === 'percent' ? 'round' : 'none')).toLowerCase();
  if (r === 'round') amt = Math.round(amt);
  else if (r === 'floor') amt = Math.floor(amt);
  else if (r === 'ceil') amt = Math.ceil(amt);

  return amt;
}

function toIsoDateOnly(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeTime(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  // Accept HH:mm or HH:mm:ss
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(s)) return null;
  return s.length === 5 ? `${s}:00` : s;
}

// --- Salary Settings helpers ---
function getDefaultSalarySettings() {
  return {
    payableDaysMode: 'calendar_month',
    weeklyOffs: [0], // 0 = Sunday ... 6 = Saturday
    hoursPerDay: 8,
  };
}

function coerceSalarySettings(input) {
  const def = getDefaultSalarySettings();
  const modes = ['calendar_month', 'every_30', 'every_28', 'every_26', 'exclude_weekly_offs'];
  const mode = input?.payableDaysMode && modes.includes(String(input.payableDaysMode))
    ? String(input.payableDaysMode)
    : def.payableDaysMode;

  let weeklyOffs = Array.isArray(input?.weeklyOffs) ? input.weeklyOffs.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6) : def.weeklyOffs;
  if (weeklyOffs.length === 0) weeklyOffs = def.weeklyOffs;
  const hoursPerDay = Number(input?.hoursPerDay || def.hoursPerDay);
  const hp = Number.isFinite(hoursPerDay) && hoursPerDay > 0 && hoursPerDay <= 24 ? hoursPerDay : def.hoursPerDay;
  return { payableDaysMode: mode, weeklyOffs, hoursPerDay: hp };
}

function daysInMonth(year, month /* 1-12 */) {
  return new Date(year, month, 0).getDate();
}

function computePayableDays(settings, year, month /* 1-12 */) {
  const s = coerceSalarySettings(settings);
  const dim = daysInMonth(year, month);
  switch (s.payableDaysMode) {
    case 'every_30':
      return 30;
    case 'every_28':
      return 28;
    case 'every_26':
      return 26;
    case 'exclude_weekly_offs': {
      // Count all days in the month excluding specified weekly offs
      let count = 0;
      for (let d = 1; d <= dim; d += 1) {
        const wd = new Date(year, month - 1, d).getDay(); // 0-6
        if (!s.weeklyOffs.includes(wd)) count += 1;
      }
      return count;
    }
    case 'calendar_month':
    default:
      return dim;
  }
}

router.get('/settings/work-hours', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const s = await AppSetting.findOne({ where: { key: 'required_work_hours', orgAccountId: orgId } });
    return res.json({ success: true, value: s ? s.value : null });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load work hours setting' });
  }
});
// Top 5 users needing review today based on anomaly counts (org-scoped)
router.get('/ai/anomalies/top-today', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const today = new Date().toISOString().slice(0, 10);
    const rows = await AIAnomaly.findAll({
      where: { date: today },
      attributes: [
        'userId',
        [sequelize.fn('COUNT', sequelize.col('AIAnomaly.id')), 'count']
      ],
      group: ['userId'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 5,
      include: [{ model: User, as: 'user', where: { orgAccountId: orgId }, attributes: ['id', 'phone'], include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'staffId'] }] }],
    });
    // Normalize output
    const items = rows.map((r) => ({
      userId: r.userId,
      count: Number(r.get('count')) || 0,
      name: r.user?.profile?.name || null,
      staffId: r.user?.profile?.staffId || null,
      phone: r.user?.phone || null,
    }));
    return res.json({ success: true, date: today, items });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load top anomalies' });
  }
});

// List salary templates (org-scoped)
router.get('/salary-templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const templates = await SalaryTemplate.findAll({
      where: { orgAccountId: orgId },
      attributes: ['id', 'name']
    });
    return res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Get salary templates error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load salary templates' });
  }
});

// List attendance templates (org-scoped)
router.get('/attendance-templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const templates = await AttendanceTemplate.findAll({
      where: { orgAccountId: orgId },
      attributes: ['id', 'name']
    });
    return res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Get attendance templates error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load attendance templates' });
  }
});

// Smart Geo-Fence Logic settings (stored in AppSetting: key 'smart_geo_fence') (org-scoped)
router.get('/settings/geo-fence', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await AppSetting.findOne({ where: { key: 'smart_geo_fence', orgAccountId: orgId } });
    const value = row?.value ? JSON.parse(row.value) : { dynamicRoutes: true, tempLocations: true, multiSiteShifts: true, timeRules: true };
    return res.json({ success: true, settings: value });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load geo-fence settings' });
  }
});

router.put('/settings/geo-fence', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const body = req.body || {};
    const next = {
      dynamicRoutes: !!body.dynamicRoutes,
      tempLocations: !!body.tempLocations,
      multiSiteShifts: !!body.multiSiteShifts,
      timeRules: !!body.timeRules,
    };
    const payload = JSON.stringify(next);
    const [row] = await AppSetting.findOrCreate({ where: { key: 'smart_geo_fence', orgAccountId: orgId }, defaults: { value: payload, orgAccountId: orgId } });
    if (row.value !== payload) await row.update({ value: payload });
    return res.json({ success: true, settings: next });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to save geo-fence settings' });
  }
});

// AI Attendance Anomaly: list recent and compute stub (org-scoped)
router.get('/ai/anomalies', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const userId = req.query.userId ? Number(req.query.userId) : null;
    const where = userId ? { userId } : { userId: orgStaffIds };
    const rows = await AIAnomaly.findAll({ where, order: [['date', 'DESC'], ['createdAt', 'DESC']], limit: 200 });
    return res.json({ success: true, anomalies: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load anomalies' });
  }
});

router.post('/ai/anomalies/compute', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const dateIso = String(req.body?.date || new Date().toISOString().slice(0, 10));
    const att = await Attendance.findAll({ where: { date: dateIso, userId: orgStaffIds }, order: [['userId', 'ASC'], ['createdAt', 'ASC']] });

    // Try AI provider first
    let created = 0;
    try {
      const aiOut = await ai.analyzeAnomalies({ date: dateIso, attendance: att });
      if (Array.isArray(aiOut) && aiOut.length) {
        for (const a of aiOut) {
          const type = String(a.type || 'ai_flag');
          const severity = String(a.severity || 'medium');
          const details = a.details || {};
          const uid = Number(a.userId);
          if (!Number.isFinite(uid)) continue;
          await AIAnomaly.create({ userId: uid, date: dateIso, type, severity, details });
          created += 1;
        }
        return res.json({ success: true, created, source: 'ai' });
      }
    } catch (_) {
      // fall through to heuristics
    }

    // Fallback heuristic: same-location quick repeats within 2 minutes
    const byUser = new Map();
    for (const a of att) {
      if (!byUser.has(a.userId)) byUser.set(a.userId, []);
      byUser.get(a.userId).push(a);
    }
    for (const [uid, list] of byUser) {
      for (let i = 1; i < list.length; i += 1) {
        const p = list[i - 1];
        const c = list[i];
        const dt = Math.abs(new Date(c.createdAt) - new Date(p.createdAt)) / 60000; // minutes
        if (dt <= 2 && p.lat && p.lng && c.lat === p.lat && c.lng === p.lng) {
          await AIAnomaly.create({ userId: uid, date: dateIso, type: 'same_location_quick', severity: 'low', details: { aId: p.id, bId: c.id } });
          created += 1;
        }
      }
    }
    return res.json({ success: true, created, source: 'heuristic' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to compute anomalies' });
  }
});

// Reliability Score: list top N and compute stub
router.get('/ai/reliability', async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const where = Number.isFinite(month) && Number.isFinite(year) ? { month, year } : {};
    const rows = await ReliabilityScore.findAll({ where, order: [['score', 'DESC']], limit: 100 });
    return res.json({ success: true, scores: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load scores' });
  }
});

router.post('/ai/reliability/compute', async (req, res) => {
  try {
    const month = Number(req.body?.month ?? new Date().getMonth() + 1);
    const year = Number(req.body?.year ?? new Date().getFullYear());
    const users = await User.findAll({ where: { role: 'staff' }, limit: 1000 });
    let computed = 0;
    // Try AI provider
    try {
      const aiItems = await ai.scoreReliability({ month, year, users });
      if (Array.isArray(aiItems) && aiItems.length) {
        for (const it of aiItems) {
          const uid = Number(it.userId);
          if (!Number.isFinite(uid)) continue;
          const score = Number(it.score);
          const breakdown = it.breakdown || {};
          const [row] = await ReliabilityScore.findOrCreate({ where: { userId: uid, month, year }, defaults: { score, breakdown } });
          if (row.score !== score) await row.update({ score, breakdown });
          computed += 1;
        }
        return res.json({ success: true, month, year, computed, source: 'ai' });
      }
    } catch (_) {
      // ignore and fallback
    }

    // Fallback random-ish scoring
    for (const u of users) {
      const score = Math.round((Math.random() * 40 + 60) * 100) / 100; // 60-100
      const breakdown = { attendanceConsistency: 0.35, punctuality: 0.25, tasks: 0.2, locationAccuracy: 0.2 };
      const [row] = await ReliabilityScore.findOrCreate({ where: { userId: u.id, month, year }, defaults: { score, breakdown } });
      if (row.score !== score) await row.update({ score, breakdown });
      computed += 1;
    }
    return res.json({ success: true, month, year, computed, source: 'heuristic' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to compute reliability' });
  }
});

// Salary Forecast: list and compute stub
router.get('/ai/salary-forecast', async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const where = Number.isFinite(month) && Number.isFinite(year) ? { month, year } : {};
    const rows = await SalaryForecast.findAll({ where, order: [['updatedAt', 'DESC']], limit: 200 });
    return res.json({ success: true, items: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load salary forecasts' });
  }
});

router.post('/ai/salary-forecast/compute', async (req, res) => {
  try {
    const month = Number(req.body?.month ?? new Date().getMonth() + 1);
    const year = Number(req.body?.year ?? new Date().getFullYear());
    const users = await User.findAll({ where: { role: 'staff' }, limit: 1000 });
    let computed = 0;
    // Try AI provider
    try {
      const aiItems = await ai.forecastSalary({ month, year, users });
      if (Array.isArray(aiItems) && aiItems.length) {
        for (const it of aiItems) {
          const uid = Number(it.userId);
          if (!Number.isFinite(uid)) continue;
          const forecastNetPay = Number(it.forecastNetPay);
          const assumptions = it.assumptions || {};
          const [row] = await SalaryForecast.findOrCreate({ where: { userId: uid, month, year }, defaults: { forecastNetPay, assumptions } });
          if (Number(row.forecastNetPay) !== forecastNetPay) await row.update({ forecastNetPay, assumptions });
          computed += 1;
        }
        return res.json({ success: true, month, year, computed, source: 'ai' });
      }
    } catch (_) {
      // ignore and fallback
    }

    // Fallback quick baseline
    for (const u of users) {
      const base = 20000; // placeholder
      const variance = Math.round((Math.random() * 5000));
      const forecastNetPay = base + variance;
      const assumptions = { payableDays: 26, expectedIncentives: 1500 };
      const [row] = await SalaryForecast.findOrCreate({ where: { userId: u.id, month, year }, defaults: { forecastNetPay, assumptions } });
      if (Number(row.forecastNetPay) !== forecastNetPay) await row.update({ forecastNetPay, assumptions });
      computed += 1;
    }
    return res.json({ success: true, month, year, computed, source: 'heuristic' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to compute salary forecast' });
  }
});

// Allocate leave balances for a given date's cycle (idempotent)
router.post('/leave/allocate', async (req, res) => {
  try {
    const dateIso = String(req.body?.date || req.query?.date || new Date().toISOString().slice(0, 10));
    const onDate = new Date(`${dateIso}T00:00:00`);
    if (Number.isNaN(onDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid date' });

    // Load all active assignments
    const assigns = await StaffLeaveAssignment.findAll({
      include: [{ model: LeaveTemplate, as: 'template', include: [{ model: LeaveTemplateCategory, as: 'categories' }] }],
    });

    let allocatedCount = 0;
    for (const a of assigns) {
      const ef = a.effectiveFrom;
      const et = a.effectiveTo;
      const dateStr = dateIso;
      if (dateStr < ef) continue;
      if (et && dateStr > et) continue;
      const tpl = a.template;
      if (!tpl || !Array.isArray(tpl.categories)) continue;
      const cyc = tpl.cycle || 'monthly';
      const { start, end } = getCycleRange(cyc, onDate);
      const prev = getPrevCycleRange(cyc, onDate);

      for (const c of tpl.categories) {
        const key = String(c.key).toLowerCase();
        // Check if balance already exists for this cycle
        const existing = await LeaveBalance.findOne({ where: { userId: a.userId, categoryKey: key, cycleStart: start, cycleEnd: end } });
        if (existing) continue;

        // Carry forward from previous cycle based on rule
        let carry = 0; let encash = 0;
        const prevBal = await LeaveBalance.findOne({ where: { userId: a.userId, categoryKey: key, cycleStart: prev.start, cycleEnd: prev.end } });
        if (prevBal) {
          const rem = Number(prevBal.remaining || 0);
          const rule = String(c.unusedRule || 'lapse');
          if (rule === 'carry_forward') {
            const cap = c.carryLimitDays === null || c.carryLimitDays === undefined ? rem : Math.min(rem, Number(c.carryLimitDays));
            carry = cap;
          } else if (rule === 'encash') {
            const cap = c.encashLimitDays === null || c.encashLimitDays === undefined ? rem : Math.min(rem, Number(c.encashLimitDays));
            encash = cap;
          }
        }

        const allocated = Number(c.leaveCount || 0) + carry;
        const remaining = allocated; // used/encashed will reduce later
        await LeaveBalance.create({
          userId: a.userId,
          categoryKey: key,
          cycleStart: start,
          cycleEnd: end,
          allocated,
          carriedForward: carry,
          used: 0,
          encashed: encash,
          remaining,
        });
        allocatedCount += 1;
      }
    }

    return res.json({ success: true, allocatedCount });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to allocate balances' });
  }
});

// --- Leave Templates CRUD --- (org-scoped duplicate block)
router.get('/leave/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await LeaveTemplate.findAll({ where: { orgAccountId: orgId }, include: [{ model: LeaveTemplateCategory, as: 'categories' }], order: [['createdAt', 'DESC']] });
    return res.json({ success: true, templates: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load leave templates' });
  }
});

router.post('/leave/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { name, cycle, countSandwich, approvalLevel, categories } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const cyc = ['monthly', 'quarterly', 'yearly'].includes(String(cycle)) ? String(cycle) : 'monthly';
    const lvl = [1, 2, 3].includes(Number(approvalLevel)) ? Number(approvalLevel) : 1;
    const tpl = await LeaveTemplate.create({ name: String(name), cycle: cyc, countSandwich: !!countSandwich, approvalLevel: lvl, active: true, orgAccountId: orgId });
    if (Array.isArray(categories)) {
      for (const c of categories) {
        await LeaveTemplateCategory.create({
          leaveTemplateId: tpl.id,
          key: String(c.key || c.name || 'GEN').toLowerCase(),
          name: String(c.name || c.key || 'General'),
          leaveCount: Number(c.leaveCount || 0),
          unusedRule: ['lapse', 'carry_forward', 'encash'].includes(String(c.unusedRule)) ? String(c.unusedRule) : 'lapse',
          carryLimitDays: c.carryLimitDays === undefined || c.carryLimitDays === null || c.carryLimitDays === '' ? null : Number(c.carryLimitDays),
          encashLimitDays: c.encashLimitDays === undefined || c.encashLimitDays === null || c.encashLimitDays === '' ? null : Number(c.encashLimitDays),
        });
      }
    }
    const out = await LeaveTemplate.findByPk(tpl.id, { include: [{ model: LeaveTemplateCategory, as: 'categories' }] });
    return res.json({ success: true, template: out });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create leave template' });
  }
});

router.put('/leave/templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await LeaveTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Template not found' });
    const { name, cycle, countSandwich, approvalLevel, active } = req.body || {};
    await row.update({
      name: name !== undefined ? String(name) : row.name,
      cycle: cycle !== undefined ? (['monthly', 'quarterly', 'yearly'].includes(String(cycle)) ? String(cycle) : row.cycle) : row.cycle,
      countSandwich: countSandwich !== undefined ? !!countSandwich : row.countSandwich,
      approvalLevel: approvalLevel !== undefined ? ([1, 2, 3].includes(Number(approvalLevel)) ? Number(approvalLevel) : row.approvalLevel) : row.approvalLevel,
      active: active !== undefined ? !!active : row.active,
    });
    const out = await LeaveTemplate.findByPk(id, { include: [{ model: LeaveTemplateCategory, as: 'categories' }] });
    return res.json({ success: true, template: out });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update leave template' });
  }
});

router.post('/leave/templates/:id/categories-bulk', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const tpl = await LeaveTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!tpl) return res.status(404).json({ success: false, message: 'Template not found' });
    const items = Array.isArray(req.body?.categories) ? req.body.categories : [];
    await LeaveTemplateCategory.destroy({ where: { leaveTemplateId: id } });
    for (const c of items) {
      await LeaveTemplateCategory.create({
        leaveTemplateId: id,
        key: String(c.key || c.name || 'GEN').toLowerCase(),
        name: String(c.name || c.key || 'General'),
        leaveCount: Number(c.leaveCount || 0),
        unusedRule: ['lapse', 'carry_forward', 'encash'].includes(String(c.unusedRule)) ? String(c.unusedRule) : 'lapse',
        carryLimitDays: c.carryLimitDays === undefined || c.carryLimitDays === null || c.carryLimitDays === '' ? null : Number(c.carryLimitDays),
        encashLimitDays: c.encashLimitDays === undefined || c.encashLimitDays === null || c.encashLimitDays === '' ? null : Number(c.encashLimitDays),
      });
    }
    const out = await LeaveTemplate.findByPk(id, { include: [{ model: LeaveTemplateCategory, as: 'categories' }] });
    return res.json({ success: true, template: out });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to save categories' });
  }
});

router.post('/leave/assign', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const userId = Number(req.body?.userId);
    const templateId = Number(req.body?.leaveTemplateId || req.body?.templateId);
    const effectiveFrom = String(req.body?.effectiveFrom || '').slice(0, 10);
    const effectiveTo = req.body?.effectiveTo ? String(req.body.effectiveTo).slice(0, 10) : null;
    if (!Number.isFinite(userId) || !Number.isFinite(templateId) || !effectiveFrom) {
      return res.status(400).json({ success: false, message: 'userId, leaveTemplateId, effectiveFrom required' });
    }
    const user = await User.findOne({ where: { id: userId, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const tpl = await LeaveTemplate.findOne({ where: { id: templateId, orgAccountId: orgId } });
    if (!tpl) return res.status(404).json({ success: false, message: 'Leave template not found' });
    const row = await StaffLeaveAssignment.create({ userId, leaveTemplateId: templateId, effectiveFrom, effectiveTo });
    return res.json({ success: true, assignment: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to assign leave template' });
  }
});

// --- Site Checkpoints CRUD (Security) (org-scoped)
router.get('/sites/:siteId/checkpoints', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const siteId = Number(req.params.siteId);
    const site = await Site.findOne({ where: { id: siteId, orgAccountId: orgId } });
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });
    const rows = await SiteCheckpoint.findAll({ where: { siteId }, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, checkpoints: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load checkpoints' });
  }
});

router.post('/sites/:siteId/checkpoints', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const siteId = Number(req.params.siteId);
    const site = await Site.findOne({ where: { id: siteId, orgAccountId: orgId } });
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });
    const { name, qrCode, lat, lng, radiusM, active } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const created = await SiteCheckpoint.create({
      siteId,
      name: String(name),
      qrCode: qrCode ? String(qrCode) : null,
      lat: lat !== undefined && lat !== null && lat !== '' ? Number(lat) : null,
      lng: lng !== undefined && lng !== null && lng !== '' ? Number(lng) : null,
      radiusM: radiusM !== undefined && radiusM !== null && radiusM !== '' ? Number(radiusM) : null,
      active: active === undefined ? true : !!active,
    });
    return res.json({ success: true, checkpoint: created });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create checkpoint' });
  }
});

router.put('/sites/:siteId/checkpoints/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const siteId = Number(req.params.siteId);
    const site = await Site.findOne({ where: { id: siteId, orgAccountId: orgId } });
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });
    const id = Number(req.params.id);
    const row = await SiteCheckpoint.findOne({ where: { id, siteId } });
    if (!row) return res.status(404).json({ success: false, message: 'Checkpoint not found' });
    const { name, qrCode, lat, lng, radiusM, active } = req.body || {};
    await row.update({
      name: name !== undefined ? String(name) : row.name,
      qrCode: qrCode !== undefined ? (qrCode ? String(qrCode) : null) : row.qrCode,
      lat: lat !== undefined ? (lat === null || lat === '' ? null : Number(lat)) : row.lat,
      lng: lng !== undefined ? (lng === null || lng === '' ? null : Number(lng)) : row.lng,
      radiusM: radiusM !== undefined ? (radiusM === null || radiusM === '' ? null : Number(radiusM)) : row.radiusM,
      active: active !== undefined ? !!active : row.active,
    });
    return res.json({ success: true, checkpoint: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update checkpoint' });
  }
});

router.delete('/sites/:siteId/checkpoints/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const siteId = Number(req.params.siteId);
    const site = await Site.findOne({ where: { id: siteId, orgAccountId: orgId } });
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });
    const id = Number(req.params.id);
    const row = await SiteCheckpoint.findOne({ where: { id, siteId } });
    if (!row) return res.status(404).json({ success: false, message: 'Checkpoint not found' });
    await row.update({ active: false });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete checkpoint' });
  }
});

// Patrol verification & adjustments
router.post('/security/patrol/:id/verify', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await PatrolLog.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: 'Patrol log not found' });
    if (row.supervisorVerified) return res.json({ success: true, patrol: row });
    await row.update({ supervisorVerified: true });
    return res.json({ success: true, patrol: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to verify patrol' });
  }
});

router.post('/security/patrol/:id/client-confirm', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await PatrolLog.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: 'Patrol log not found' });
    if (row.clientConfirmed) return res.json({ success: true, patrol: row });
    await row.update({ clientConfirmed: true });
    return res.json({ success: true, patrol: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to confirm patrol' });
  }
});

router.patch('/security/patrol/:id/adjust', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await PatrolLog.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: 'Patrol log not found' });
    const { penaltyAmount, incentiveAmount, penaltyReason } = req.body || {};
    await row.update({
      penaltyAmount: penaltyAmount !== undefined ? Number(penaltyAmount) : row.penaltyAmount,
      incentiveAmount: incentiveAmount !== undefined ? Number(incentiveAmount) : row.incentiveAmount,
      penaltyReason: penaltyReason !== undefined ? (penaltyReason ? String(penaltyReason) : null) : row.penaltyReason,
    });
    return res.json({ success: true, patrol: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to adjust patrol' });
  }
});

// --- Routes CRUD (Logistics) (org-scoped)
router.get('/routes', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await Route.findAll({ where: { orgAccountId: orgId }, include: [{ model: RouteStop, as: 'stops', order: [['seqNo', 'ASC']] }], order: [['createdAt', 'DESC']] });
    return res.json({ success: true, routes: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load routes' });
  }
});

router.post('/routes', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { name, code, active } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const created = await Route.create({ name: String(name), code: code ? String(code) : null, active: active === undefined ? true : !!active, orgAccountId: orgId });
    return res.json({ success: true, route: created });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create route' });
  }
});

router.post('/routes/:id/stops-bulk', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const route = await Route.findOne({ where: { id, orgAccountId: orgId } });
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    const stops = Array.isArray(req.body?.stops) ? req.body.stops : [];
    if (stops.length === 0) return res.status(400).json({ success: false, message: 'stops required' });
    // Remove existing stops
    await RouteStop.destroy({ where: { routeId: id } });
    // Create new stops in order
    for (const s of stops) {
      await RouteStop.create({
        routeId: id,
        seqNo: Number(s.seqNo),
        name: String(s.name),
        lat: s.lat === undefined || s.lat === null || s.lat === '' ? null : Number(s.lat),
        lng: s.lng === undefined || s.lng === null || s.lng === '' ? null : Number(s.lng),
        radiusM: s.radiusM === undefined || s.radiusM === null || s.radiusM === '' ? null : Number(s.radiusM),
        plannedTime: s.plannedTime || null,
        active: s.active === undefined ? true : !!s.active,
      });
    }
    const out = await Route.findByPk(id, { include: [{ model: RouteStop, as: 'stops', order: [['seqNo', 'ASC']] }] });
    return res.json({ success: true, route: out });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to save stops' });
  }
});

router.post('/routes/assign', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const userId = Number(req.body?.userId);
    const routeId = Number(req.body?.routeId);
    const effectiveDate = String(req.body?.effectiveDate || '').slice(0, 10);
    if (!Number.isFinite(userId) || !Number.isFinite(routeId) || !effectiveDate) {
      return res.status(400).json({ success: false, message: 'userId, routeId, effectiveDate required' });
    }
    const user = await User.findByPk(userId);
    if (!user || user.role !== 'staff') return res.status(404).json({ success: false, message: 'Staff not found' });
    const route = await Route.findByPk(routeId);
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    const row = await StaffRouteAssignment.create({ userId, routeId, effectiveDate });
    return res.json({ success: true, assignment: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to assign route' });
  }
});

// --- Sites CRUD (Construction) (org-scoped)
router.get('/sites', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await Site.findAll({ where: { orgAccountId: orgId }, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, sites: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load sites' });
  }
});

router.post('/sites', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { name, address, lat, lng, geofenceRadiusM, active } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const created = await Site.create({
      name: String(name),
      address: address ? String(address) : null,
      lat: lat !== undefined && lat !== null && lat !== '' ? Number(lat) : null,
      lng: lng !== undefined && lng !== null && lng !== '' ? Number(lng) : null,
      geofenceRadiusM: geofenceRadiusM !== undefined && geofenceRadiusM !== null && geofenceRadiusM !== '' ? Number(geofenceRadiusM) : null,
      active: active === undefined ? true : !!active,
      orgAccountId: orgId,
    });
    return res.json({ success: true, site: created });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create site' });
  }
});

router.put('/sites/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await Site.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Site not found' });
    const { name, address, lat, lng, geofenceRadiusM, active } = req.body || {};
    await row.update({
      name: name !== undefined ? String(name) : row.name,
      address: address !== undefined ? (address ? String(address) : null) : row.address,
      lat: lat !== undefined ? (lat === null || lat === '' ? null : Number(lat)) : row.lat,
      lng: lng !== undefined ? (lng === null || lng === '' ? null : Number(lng)) : row.lng,
      geofenceRadiusM: geofenceRadiusM !== undefined ? (geofenceRadiusM === null || geofenceRadiusM === '' ? null : Number(geofenceRadiusM)) : row.geofenceRadiusM,
      active: active !== undefined ? !!active : row.active,
    });
    return res.json({ success: true, site: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update site' });
  }
});

router.delete('/sites/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await Site.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Site not found' });
    await row.update({ active: false });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete site' });
  }
});

// Supervisor verification for Work Units
router.post('/construction/work-units/:id/verify', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await WorkUnit.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: 'Work unit not found' });
    if (row.supervisorVerified) return res.json({ success: true, workUnit: row });
    await row.update({ supervisorVerified: true, verifiedAt: new Date() });
    return res.json({ success: true, workUnit: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to verify work unit' });
  }
});

// Organization/tenant configuration: industryType and feature flags (org-scoped)
router.get('/settings/org', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await AppSetting.findOne({ where: { key: 'org_config', orgAccountId: orgId } });
    let config = { industryType: 'field_sales', features: {} };
    if (row?.value) {
      try { config = JSON.parse(row.value); } catch (_) { }
    }
    return res.json({ success: true, config });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load org config' });
  }
});

router.put('/settings/org', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const allowedIndustries = ['field_sales', 'construction', 'logistics', 'security'];
    const body = req.body || {};
    const industryType = allowedIndustries.includes(String(body.industryType)) ? String(body.industryType) : 'field_sales';
    const features = body.features && typeof body.features === 'object' ? body.features : {};
    const payload = JSON.stringify({ industryType, features });

    const [row] = await AppSetting.findOrCreate({ where: { key: 'org_config', orgAccountId: orgId }, defaults: { value: payload, orgAccountId: orgId } });
    if (row.value !== payload) await row.update({ value: payload });
    return res.json({ success: true, config: { industryType, features } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to save org config' });
  }
});

// Get current active salary template assignment (latest) for a staff with template included
router.get('/salary/assignment/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return res.status(400).json({ success: false, message: 'userId is required' });
    const assign = await StaffSalaryAssignment.findOne({
      where: { userId },
      order: [['effectiveFrom', 'DESC']],
      include: [{ model: SalaryTemplate, as: 'template' }],
    });
    return res.json({ success: true, assignment: assign });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load assignment' });
  }
});

// Compute simple monthly salary totals from assigned template
router.get('/salary/compute/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const month = Number(req.query?.month); // 0-11
    const year = Number(req.query?.year);
    if (!Number.isFinite(userId) || !Number.isFinite(month) || !Number.isFinite(year)) {
      return res.status(400).json({ success: false, message: 'userId, month, year are required' });
    }
    const assign = await StaffSalaryAssignment.findOne({
      where: { userId },
      order: [['effectiveFrom', 'DESC']],
      include: [{ model: SalaryTemplate, as: 'template' }],
    });
    if (!assign || !assign.template) return res.status(404).json({ success: false, message: 'No template assigned' });

    const tpl = assign.template;

    const ctx = { basic: 0, earningsBase: 0, grossBase: 0, custom: {} };
    // Compute earnings first (single pass; supports percent of basic or custom computed before)
    const earningsArr = Array.isArray(tpl.earnings) ? tpl.earnings : [];
    let earningsTotal = 0;
    for (const it of earningsArr) {
      // Preload known bases
      ctx.earningsBase = earningsTotal;
      ctx.grossBase = earningsTotal; // incentives not added yet
      const amt = computeItemAmount(it, ctx);
      earningsTotal += amt;
      ctx.custom[it.key] = amt;
      if (String(it.key).toLowerCase() === 'basic') ctx.basic = amt;
    }

    // Incentives next
    const incentivesArr = Array.isArray(tpl.incentives) ? tpl.incentives : [];
    let incentivesTotal = 0;
    for (const it of incentivesArr) {
      ctx.earningsBase = earningsTotal;
      ctx.grossBase = earningsTotal + incentivesTotal;
      const amt = computeItemAmount(it, ctx);
      incentivesTotal += amt;
      ctx.custom[it.key] = amt;
    }

    const gross = earningsTotal + incentivesTotal;
    ctx.grossBase = gross;

    // Deductions (can depend on gross/basic/earnings/custom)
    const deductionsArr = Array.isArray(tpl.deductions) ? tpl.deductions : [];
    let deductionsTotal = 0;
    for (const it of deductionsArr) {
      ctx.earningsBase = earningsTotal;
      ctx.grossBase = gross;
      const amt = computeItemAmount(it, ctx);
      deductionsTotal += amt;
      ctx.custom[it.key] = amt;
    }

    const net = gross - deductionsTotal;
    const netInWords = numberToINRWords(net);
    return res.json({
      success: true,
      month,
      year,
      totals: {
        earnings: earningsTotal,
        incentives: incentivesTotal,
        totalDeductions: deductionsTotal,
        grossSalary: gross,
        netPay: net,
        netPayInWords: netInWords,
      },
      template: tpl,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to compute salary' });
  }
});

// --- Salary Templates CRUD --- (org-scoped)
router.get('/salary/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await SalaryTemplate.findAll({ where: { orgAccountId: orgId }, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, templates: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load salary templates' });
  }
});

router.post('/salary/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const payload = {
      name: String(req.body?.name || '').trim(),
      code: req.body?.code ? String(req.body.code).trim() : null,
      payableDaysMode: req.body?.payableDaysMode || 'calendar_month',
      weeklyOffs: Array.isArray(req.body?.weeklyOffs) ? req.body.weeklyOffs : null,
      hoursPerDay: Number(req.body?.hoursPerDay || 8),
      active: req.body?.active === undefined ? true : !!req.body.active,
      earnings: Array.isArray(req.body?.earnings) ? req.body.earnings : [],
      incentives: Array.isArray(req.body?.incentives) ? req.body.incentives : [],
      deductions: Array.isArray(req.body?.deductions) ? req.body.deductions : [],
      metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : null,
      orgAccountId: orgId,
    };
    if (!payload.name) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!Number.isFinite(payload.hoursPerDay) || payload.hoursPerDay <= 0 || payload.hoursPerDay > 24) payload.hoursPerDay = 8;
    const row = await SalaryTemplate.create(payload);
    return res.json({ success: true, template: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create salary template' });
  }
});

router.put('/salary/templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await SalaryTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Salary template not found' });
    const updates = {
      name: req.body?.name !== undefined ? String(req.body.name).trim() : row.name,
      code: req.body?.code !== undefined ? (req.body.code ? String(req.body.code).trim() : null) : row.code,
      payableDaysMode: req.body?.payableDaysMode ?? row.payableDaysMode,
      weeklyOffs: req.body?.weeklyOffs === undefined ? row.weeklyOffs : (Array.isArray(req.body.weeklyOffs) ? req.body.weeklyOffs : null),
      hoursPerDay: req.body?.hoursPerDay === undefined ? row.hoursPerDay : Number(req.body.hoursPerDay),
      active: req.body?.active === undefined ? row.active : !!req.body.active,
      earnings: req.body?.earnings === undefined ? row.earnings : (Array.isArray(req.body.earnings) ? req.body.earnings : []),
      incentives: req.body?.incentives === undefined ? row.incentives : (Array.isArray(req.body.incentives) ? req.body.incentives : []),
      deductions: req.body?.deductions === undefined ? row.deductions : (Array.isArray(req.body.deductions) ? req.body.deductions : []),
      metadata: req.body?.metadata === undefined ? row.metadata : (req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : null),
    };
    if (!Number.isFinite(updates.hoursPerDay) || updates.hoursPerDay <= 0 || updates.hoursPerDay > 24) updates.hoursPerDay = row.hoursPerDay;
    await row.update(updates);
    return res.json({ success: true, template: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update salary template' });
  }
});

router.delete('/salary/templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await SalaryTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Salary template not found' });
    await row.destroy();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete salary template' });
  }
});

// Assign salary template to a staff (org-scoped)
router.post('/salary/assign', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const userId = Number(req.body?.userId);
    const templateId = Number(req.body?.salaryTemplateId || req.body?.templateId);
    const effectiveFrom = String(req.body?.effectiveFrom || '').slice(0, 10);
    const effectiveTo = req.body?.effectiveTo ? String(req.body.effectiveTo).slice(0, 10) : null;
    if (!Number.isFinite(userId) || !Number.isFinite(templateId) || !effectiveFrom) {
      return res.status(400).json({ success: false, message: 'userId, salaryTemplateId, effectiveFrom are required' });
    }
    const user = await User.findOne({ where: { id: userId, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const tpl = await SalaryTemplate.findOne({ where: { id: templateId, orgAccountId: orgId } });
    if (!tpl) return res.status(404).json({ success: false, message: 'Salary template not found' });

    const row = await StaffSalaryAssignment.create({ userId, salaryTemplateId: templateId, effectiveFrom, effectiveTo });
    return res.json({ success: true, assignment: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to assign salary template' });
  }
});

// --- Attendance Templates CRUD --- (org-scoped)
router.get('/attendance/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await AttendanceTemplate.findAll({ where: { orgAccountId: orgId }, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, templates: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load templates' });
  }
});

router.post('/attendance/templates', async (req, res) => {
  console.log('POST /attendance/templates called', req.body);
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    console.log('orgId:', orgId);
    // Map frontend values to model ENUM values
    const modeMap = { 'mark_present': 'mark_present_by_default', 'manual': 'manual', 'location': 'location_based', 'selfie': 'selfie_location' };
    const rawMode = req.body?.attendanceMode || 'manual';
    const attendanceMode = modeMap[rawMode] || rawMode;
    
    const payload = {
      name: String(req.body?.name || '').trim(),
      code: req.body?.code ? String(req.body.code).trim() : null,
      attendanceMode,
      holidaysRule: req.body?.holidaysRule || 'disallow',
      trackInOutEnabled: !!req.body?.trackInOutEnabled,
      requirePunchOut: !!req.body?.requirePunchOut,
      allowMultiplePunches: !!req.body?.allowMultiplePunches,
      markAbsentPrevDaysEnabled: !!req.body?.markAbsentPrevDaysEnabled,
      markAbsentRule: req.body?.markAbsentRule || 'none',
      effectiveHoursRule: req.body?.effectiveHoursRule || null,
      active: req.body?.active === undefined ? true : !!req.body.active,
      orgAccountId: orgId,
    };
    if (!payload.name) return res.status(400).json({ success: false, message: 'Name is required' });
    const row = await AttendanceTemplate.create(payload);
    return res.json({ success: true, template: row });
  } catch (e) {
    console.error('Create attendance template error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create template', error: e.message, stack: e.stack });
  }
});

router.put('/attendance/templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await AttendanceTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Template not found' });
    const updates = {
      name: req.body?.name !== undefined ? String(req.body.name).trim() : row.name,
      code: req.body?.code !== undefined ? (req.body.code ? String(req.body.code).trim() : null) : row.code,
      attendanceMode: req.body?.attendanceMode ?? row.attendanceMode,
      holidaysRule: req.body?.holidaysRule ?? row.holidaysRule,
      trackInOutEnabled: req.body?.trackInOutEnabled === undefined ? row.trackInOutEnabled : !!req.body.trackInOutEnabled,
      requirePunchOut: req.body?.requirePunchOut === undefined ? row.requirePunchOut : !!req.body.requirePunchOut,
      allowMultiplePunches: req.body?.allowMultiplePunches === undefined ? row.allowMultiplePunches : !!req.body.allowMultiplePunches,
      markAbsentPrevDaysEnabled: req.body?.markAbsentPrevDaysEnabled === undefined ? row.markAbsentPrevDaysEnabled : !!req.body.markAbsentPrevDaysEnabled,
      markAbsentRule: req.body?.markAbsentRule ?? row.markAbsentRule,
      effectiveHoursRule: req.body?.effectiveHoursRule === undefined ? row.effectiveHoursRule : (req.body.effectiveHoursRule || null),
      active: req.body?.active === undefined ? row.active : !!req.body.active,
    };
    await row.update(updates);
    return res.json({ success: true, template: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update template' });
  }
});

router.delete('/attendance/templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await AttendanceTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Template not found' });
    await row.destroy();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
});

// Assign attendance template to a staff (org-scoped)
router.post('/attendance/assign', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const userId = Number(req.body?.userId);
    const templateId = Number(req.body?.attendanceTemplateId || req.body?.templateId);
    const effectiveFrom = String(req.body?.effectiveFrom || '').slice(0, 10);
    const effectiveTo = req.body?.effectiveTo ? String(req.body.effectiveTo).slice(0, 10) : null;
    if (!Number.isFinite(userId) || !Number.isFinite(templateId) || !effectiveFrom) {
      return res.status(400).json({ success: false, message: 'userId, attendanceTemplateId, effectiveFrom are required' });
    }
    const user = await User.findOne({ where: { id: userId, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const tpl = await AttendanceTemplate.findOne({ where: { id: templateId, orgAccountId: orgId } });
    if (!tpl) return res.status(404).json({ success: false, message: 'Template not found' });

    const row = await StaffAttendanceAssignment.create({ userId, attendanceTemplateId: templateId, effectiveFrom, effectiveTo });
    return res.json({ success: true, assignment: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to assign template' });
  }
});

// --- Salary details access to staff --- (org-scoped)
router.get('/salary/access', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const staff = await User.findAll({
      where: { role: 'staff', orgAccountId: orgId },
      include: [
        { model: StaffProfile, as: 'profile' },
        { model: SalaryAccess, as: 'salaryAccess' },
      ],
      order: [['createdAt', 'DESC']],
    });

    const rows = staff.map((u) => ({
      userId: u.id,
      staffId: u.profile?.staffId || null,
      name: u.profile?.name || null,
      phone: u.phone,
      allowCurrentCycle: !!u.salaryAccess?.allowCurrentCycle,
    }));
    return res.json({ success: true, items: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load salary access list' });
  }
});

router.put('/salary/access/:userId', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ success: false, message: 'Invalid userId' });
    const allow = !!req.body?.allowCurrentCycle;

    const user = await User.findOne({ where: { id: userId, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });

    if (allow) {
      const [row] = await SalaryAccess.findOrCreate({ where: { userId }, defaults: { allowCurrentCycle: true, active: true } });
      if (!row.allowCurrentCycle) await row.update({ allowCurrentCycle: true });
      return res.json({ success: true, userId, allowCurrentCycle: true });
    } else {
      await SalaryAccess.destroy({ where: { userId } });
      return res.json({ success: true, userId, allowCurrentCycle: false });
    }
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update salary access' });
  }
});

router.put('/salary/access-bulk', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : [];
    const allow = !!req.body?.allowCurrentCycle;
    if (userIds.length === 0) return res.status(400).json({ success: false, message: 'userIds required' });

    const staff = await User.findAll({ where: { id: userIds, role: 'staff', orgAccountId: orgId } });
    const updated = [];
    if (allow) {
      for (const u of staff) {
        const [row] = await SalaryAccess.findOrCreate({ where: { userId: u.id }, defaults: { allowCurrentCycle: true, active: true } });
        if (!row.allowCurrentCycle) await row.update({ allowCurrentCycle: true });
        updated.push({ userId: u.id, allowCurrentCycle: true });
      }
    } else {
      await SalaryAccess.destroy({ where: { userId: userIds } });
      for (const u of staff) updated.push({ userId: u.id, allowCurrentCycle: false });
    }
    return res.json({ success: true, updated });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to bulk update salary access' });
  }
});

// Salary calculation settings (org-scoped)
router.get('/settings/salary', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await AppSetting.findOne({ where: { key: 'salary_settings', orgAccountId: orgId } });
    const value = row?.value ? JSON.parse(row.value) : getDefaultSalarySettings();
    return res.json({ success: true, settings: coerceSalarySettings(value) });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load salary settings' });
  }
});

router.put('/settings/salary', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const settings = coerceSalarySettings(req.body || {});
    const payload = JSON.stringify(settings);

    // Check if record exists first
    let row = await AppSetting.findOne({ where: { key: 'salary_settings', orgAccountId: orgId } });
    if (row) {
      await row.update({ value: payload });
    } else {
      row = await AppSetting.create({ key: 'salary_settings', value: payload, orgAccountId: orgId });
    }
    return res.json({ success: true, settings });
  } catch (e) {
    console.error('Save salary settings error:', e);
    return res.status(500).json({ success: false, message: 'Failed to save salary settings' });
  }
});

// Organization brand name setting
function getDefaultBrandSettings() {
  return { displayName: 'ThinkTech' };
}

router.get('/settings/brand', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await sequelize.models.OrgBrand.findOne({ where: { active: true, orgAccountId: orgId }, order: [['updatedAt','DESC']] });
    const name = row?.displayName || getDefaultBrandSettings().displayName;
    return res.json({ success: true, brand: { displayName: String(name) } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load brand settings' });
  }
});

router.put('/settings/brand', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const displayName = String(req.body?.displayName || '').trim();
    if (!displayName) return res.status(400).json({ success: false, message: 'displayName required' });
    const existing = await sequelize.models.OrgBrand.findOne({ where: { active: true, orgAccountId: orgId } });
    if (existing) {
      await existing.update({ displayName });
      return res.json({ success: true, brand: { displayName } });
    }
    const created = await sequelize.models.OrgBrand.create({ displayName, active: true, orgAccountId: orgId });
    return res.json({ success: true, brand: { displayName: created.displayName } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to save brand settings' });
  }
});

// Helper: compute payable days for a given month using saved settings (org-scoped)
router.get('/salary/payable-days', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'year and month required (e.g., year=2026&month=1)' });
    }
    const row = await AppSetting.findOne({ where: { key: 'salary_settings', orgAccountId: orgId } });
    const settings = row?.value ? JSON.parse(row.value) : getDefaultSalarySettings();
    const payableDays = computePayableDays(settings, year, month);
    return res.json({ success: true, payableDays, settings: coerceSalarySettings(settings) });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to compute payable days' });
  }
});

router.get('/shifts/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await ShiftTemplate.findAll({ where: { orgAccountId: orgId }, order: [['createdAt', 'DESC']], include: [{ model: ShiftBreak, as: 'breaks' }] });
    return res.json({
      success: true,
      templates: rows.map((t) => (
        {
          id: t.id,
          shiftType: t.shiftType,
          name: t.name,
          code: t.code,
          startTime: t.startTime,
          endTime: t.endTime,
          workMinutes: t.workMinutes,
          bufferMinutes: t.bufferMinutes,
          earliestPunchInTime: t.earliestPunchInTime,
          latestPunchOutTime: t.latestPunchOutTime,
          minPunchOutAfterMinutes: t.minPunchOutAfterMinutes,
          maxPunchOutAfterMinutes: t.maxPunchOutAfterMinutes,
          active: t.active !== false,
          breaks: (t.breaks || []).map((b) => ({
            id: b.id,
            category: b.category,
            name: b.name,
            payType: b.payType,
            breakType: b.breakType,
            durationMinutes: b.durationMinutes,
            startTime: b.startTime,
            endTime: b.endTime,
            active: b.active !== false,
          }
          )),
        })),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load shift templates' });
  }
});

router.post('/shifts/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const {
      shiftType,
      name,
      code,
      startTime,
      endTime,
      workMinutes,
      bufferMinutes,
      earliestPunchInTime,
      latestPunchOutTime,
      minPunchOutAfterMinutes,
      maxPunchOutAfterMinutes,
      active,
      breaks,
    } = req.body || {};

    if (!name) return res.status(400).json({ success: false, message: 'name required' });

    const st = shiftType ? String(shiftType) : 'fixed';
    if (!['fixed', 'open', 'rotational'].includes(st)) {
      return res.status(400).json({ success: false, message: 'shiftType invalid' });
    }

    const start = normalizeTime(startTime);
    const end = normalizeTime(endTime);
    const wm = workMinutes === undefined || workMinutes === null || workMinutes === '' ? null : Number(workMinutes);
    const bm = bufferMinutes === undefined || bufferMinutes === null || bufferMinutes === '' ? 0 : Number(bufferMinutes);

    if (st === 'fixed' || st === 'rotational') {
      if (!start || !end) {
        return res.status(400).json({ success: false, message: 'startTime and endTime required for this shiftType' });
      }
    }

    if (st === 'open') {
      if (!Number.isFinite(wm) || wm <= 0) {
        return res.status(400).json({ success: false, message: 'workMinutes required for open shift' });
      }
    }

    if (!Number.isFinite(bm) || bm < 0 || bm > 1440) {
      return res.status(400).json({ success: false, message: 'bufferMinutes must be between 0 and 1440' });
    }

    if (code) {
      const existing = await ShiftTemplate.findOne({ where: { code: String(code) } });
      if (existing) return res.status(409).json({ success: false, message: 'code already exists' });
    }

    const created = await ShiftTemplate.create({
      shiftType: st,
      name: String(name),
      code: code ? String(code) : null,
      startTime: start,
      endTime: end,
      workMinutes: st === 'open' ? wm : null,
      bufferMinutes: bm,
      earliestPunchInTime: earliestPunchInTime ? normalizeTime(earliestPunchInTime) : null,
      latestPunchOutTime: latestPunchOutTime ? normalizeTime(latestPunchOutTime) : null,
      minPunchOutAfterMinutes: minPunchOutAfterMinutes != null ? Number(minPunchOutAfterMinutes) : null,
      maxPunchOutAfterMinutes: maxPunchOutAfterMinutes != null ? Number(maxPunchOutAfterMinutes) : null,
      active: active === undefined ? true : !!active,
      orgAccountId: orgId,
    });

    if (Array.isArray(breaks) && breaks.length > 0) {
      const payload = breaks.map((b) => ({
        shiftTemplateId: created.id,
        category: b.category ? String(b.category) : null,
        name: b.name ? String(b.name) : null,
        payType: ['paid', 'unpaid'].includes(String(b.payType)) ? String(b.payType) : 'unpaid',
        breakType: ['duration', 'fixed_window'].includes(String(b.breakType)) ? String(b.breakType) : 'duration',
        durationMinutes: b.durationMinutes != null ? Number(b.durationMinutes) : null,
        startTime: b.startTime ? normalizeTime(b.startTime) : null,
        endTime: b.endTime ? normalizeTime(b.endTime) : null,
        active: b.active === undefined ? true : !!b.active,
      }));
      await ShiftBreak.bulkCreate(payload);
    }

    return res.json({ success: true, template: created });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create shift template' });
  }
});

router.put('/shifts/templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await ShiftTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    const {
      shiftType,
      name,
      code,
      startTime,
      endTime,
      workMinutes,
      bufferMinutes,
      earliestPunchInTime,
      latestPunchOutTime,
      minPunchOutAfterMinutes,
      maxPunchOutAfterMinutes,
      active,
      breaks,
    } = req.body || {};

    const st = shiftType !== undefined ? String(shiftType) : row.shiftType;
    if (!['fixed', 'open', 'rotational'].includes(st)) {
      return res.status(400).json({ success: false, message: 'shiftType invalid' });
    }

    const start = startTime !== undefined ? normalizeTime(startTime) : row.startTime;
    const end = endTime !== undefined ? normalizeTime(endTime) : row.endTime;
    const wm = workMinutes !== undefined ? (workMinutes === null || workMinutes === '' ? null : Number(workMinutes)) : row.workMinutes;
    const bm = bufferMinutes !== undefined ? Number(bufferMinutes) : row.bufferMinutes;

    if (st === 'fixed' || st === 'rotational') {
      if (!start || !end) {
        return res.status(400).json({ success: false, message: 'startTime and endTime required for this shiftType' });
      }
    }

    if (st === 'open') {
      if (!Number.isFinite(wm) || wm <= 0) {
        return res.status(400).json({ success: false, message: 'workMinutes required for open shift' });
      }
    }

    if (!Number.isFinite(bm) || bm < 0 || bm > 1440) {
      return res.status(400).json({ success: false, message: 'bufferMinutes must be between 0 and 1440' });
    }

    if (code !== undefined) {
      const nextCode = code ? String(code) : null;
      if (nextCode && nextCode !== row.code) {
        const existing = await ShiftTemplate.findOne({ where: { code: nextCode } });
        if (existing) return res.status(409).json({ success: false, message: 'code already exists' });
      }
    }

    await row.update({
      shiftType: st,
      name: name !== undefined ? String(name) : row.name,
      code: code !== undefined ? (code ? String(code) : null) : row.code,
      startTime: st === 'open' ? null : start,
      endTime: st === 'open' ? null : end,
      workMinutes: st === 'open' ? wm : null,
      bufferMinutes: bm,
      earliestPunchInTime: earliestPunchInTime !== undefined
        ? (earliestPunchInTime ? normalizeTime(earliestPunchInTime) : null)
        : row.earliestPunchInTime,
      latestPunchOutTime: latestPunchOutTime !== undefined
        ? (latestPunchOutTime ? normalizeTime(latestPunchOutTime) : null)
        : row.latestPunchOutTime,
      minPunchOutAfterMinutes: minPunchOutAfterMinutes !== undefined ? (minPunchOutAfterMinutes == null ? null : Number(minPunchOutAfterMinutes)) : row.minPunchOutAfterMinutes,
      maxPunchOutAfterMinutes: maxPunchOutAfterMinutes !== undefined ? (maxPunchOutAfterMinutes == null ? null : Number(maxPunchOutAfterMinutes)) : row.maxPunchOutAfterMinutes,
      active: active !== undefined ? !!active : row.active,
    });

    if (Array.isArray(breaks)) {
      await ShiftBreak.destroy({ where: { shiftTemplateId: row.id } });
      if (breaks.length > 0) {
        const payload = breaks.map((b) => ({
          shiftTemplateId: row.id,
          category: b.category ? String(b.category) : null,
          name: b.name ? String(b.name) : null,
          payType: ['paid', 'unpaid'].includes(String(b.payType)) ? String(b.payType) : 'unpaid',
          breakType: ['duration', 'fixed_window'].includes(String(b.breakType)) ? String(b.breakType) : 'duration',
          durationMinutes: b.durationMinutes != null ? Number(b.durationMinutes) : null,
          startTime: b.startTime ? normalizeTime(b.startTime) : null,
          endTime: b.endTime ? normalizeTime(b.endTime) : null,
          active: b.active === undefined ? true : !!b.active,
        }));
        await ShiftBreak.bulkCreate(payload);
      }
    }

    return res.json({ success: true, template: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update shift template' });
  }
});

router.delete('/shifts/templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await ShiftTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await row.update({ active: false });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete shift template' });
  }
});

router.post('/shifts/assign', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { userId, shiftTemplateId, effectiveFrom, effectiveTo } = req.body || {};
    const uid = Number(userId);
    const tid = Number(shiftTemplateId);
    if (!Number.isFinite(uid) || uid <= 0) return res.status(400).json({ success: false, message: 'userId required' });
    if (!Number.isFinite(tid) || tid <= 0) return res.status(400).json({ success: false, message: 'shiftTemplateId required' });

    const ef = toIsoDateOnly(effectiveFrom || new Date());
    if (!ef) return res.status(400).json({ success: false, message: 'effectiveFrom invalid' });
    const et = effectiveTo !== undefined ? toIsoDateOnly(effectiveTo) : null;
    if (effectiveTo !== undefined && effectiveTo !== null && !et) {
      return res.status(400).json({ success: false, message: 'effectiveTo invalid' });
    }

    const user = await User.findOne({ where: { id: uid, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const template = await ShiftTemplate.findOne({ where: { id: tid, orgAccountId: orgId, active: true } });
    if (!template) return res.status(404).json({ success: false, message: 'Shift template not found' });

    const created = await StaffShiftAssignment.create({
      userId: uid,
      shiftTemplateId: tid,
      effectiveFrom: ef,
      effectiveTo: et,
    });

    return res.json({ success: true, assignment: created });
  } catch (e) {
    const msg = String(e?.original?.sqlMessage || e?.message || e);
    const dup = /duplicate/i.test(msg);
    if (dup) {
      return res.status(409).json({ success: false, message: 'Assignment already exists for this effectiveFrom date' });
    }
    return res.status(500).json({ success: false, message: 'Failed to assign shift' });
  }
});

router.get('/document-types', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await DocumentType.findAll({ where: { orgAccountId: orgId }, order: [['createdAt', 'DESC']] });
    return res.json({
      success: true,
      documentTypes: rows.map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        required: !!r.required,
        active: r.active !== false,
        allowedMime: r.allowedMime || null,
      })),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load document types' });
  }
});

router.post('/document-types', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { key, name, required, active, allowedMime } = req.body || {};
    if (!key || !name) {
      return res.status(400).json({ success: false, message: 'key and name required' });
    }

    const existing = await DocumentType.findOne({ where: { key: String(key), orgAccountId: orgId } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Key already exists' });
    }

    const created = await DocumentType.create({
      key: String(key),
      orgAccountId: orgId,
      name: String(name),
      required: !!required,
      active: active === undefined ? true : !!active,
      allowedMime: allowedMime ? String(allowedMime) : null,
    });

    return res.json({ success: true, documentType: created });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create document type' });
  }
});

router.put('/document-types/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await DocumentType.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    const { name, required, active, allowedMime } = req.body || {};
    await row.update({
      name: name !== undefined ? String(name) : row.name,
      required: required !== undefined ? !!required : row.required,
      active: active !== undefined ? !!active : row.active,
      allowedMime: allowedMime !== undefined ? (allowedMime ? String(allowedMime) : null) : row.allowedMime,
    });

    return res.json({ success: true, documentType: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update document type' });
  }
});

router.delete('/document-types/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await DocumentType.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await row.update({ active: false });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete document type' });
  }
});

router.put('/settings/work-hours', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const v = Number(req.body?.requiredWorkHours);
    if (!Number.isFinite(v) || v <= 0 || v > 24) {
      return res.status(400).json({ success: false, message: 'requiredWorkHours must be between 1 and 24' });
    }

    const [row] = await AppSetting.findOrCreate({
      where: { key: 'required_work_hours', orgAccountId: orgId },
      defaults: { value: String(v), orgAccountId: orgId },
    });

    if (String(row.value) !== String(v)) {
      await row.update({ value: String(v) });
    }

    return res.json({ success: true, requiredWorkHours: v });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to save setting' });
  }
});

router.get('/admins', async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const admins = await User.findAll({
    where: { role: 'admin' },
    include: [{ model: StaffProfile, as: 'profile' }],
    order: [['createdAt', 'DESC']],
  });

  return res.json({
    success: true,
    admins: admins.map((u) => ({
      id: u.id,
      phone: u.phone,
      active: u.active !== false,
      name: u.profile?.name || null,
      email: u.profile?.email || null,
    })),
  });
});

router.get('/staff', async (req, res) => {
  const orgId = requireOrg(req, res); if (!orgId) return;
  const staff = await User.findAll({
    where: { role: 'staff', orgAccountId: orgId },
    include: [{ model: StaffProfile, as: 'profile' }],
    order: [['createdAt', 'DESC']],
  });

  return res.json({
    success: true,
    staff: staff.map((u) => ({
      id: u.id,
      active: u.active === true,
      createdAt: u.createdAt,
      staffId: u.profile?.staffId || null,
      phone: u.phone,
      name: u.profile?.name || null,
      email: u.profile?.email || null,
      department: u.profile?.department || null,
    })),
  });
});

// Fetch a single staff with full profile details (org-scoped)
router.get('/staff/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const user = await User.findOne({
      where: { id, orgAccountId: orgId, role: 'staff' },
      include: [{ model: StaffProfile, as: 'profile' }]
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }
    // Safe salaryValues extraction (handles JSON and double-encoded JSON strings)
    const pickSalaryValues = (u) => {
      let v = u.salaryValues || u.salary_values || null;
      if (v && typeof v === 'string') {
        try { v = JSON.parse(v); } catch { /* ignore */ }
        if (typeof v === 'string') {
          try { v = JSON.parse(v); } catch { /* ignore */ }
        }
      }
      return v;
    };

    return res.json({
      success: true,
      staff: {
        id: user.id,
        phone: user.phone,
        active: user.active,
        salaryTemplateId: user.salaryTemplateId,
        salaryValues: pickSalaryValues(user),
        // Provide snake_case fields for Admin UI fallback parsing
        basic_salary: user.basicSalary ?? user.basic_salary ?? 0,
        hra: user.hra ?? user.hra_amount ?? 0,
        da: user.da ?? user.da_amount ?? 0,
        special_allowance: user.specialAllowance ?? user.special_allowance ?? 0,
        conveyance_allowance: user.conveyanceAllowance ?? user.conveyance_allowance ?? 0,
        medical_allowance: user.medicalAllowance ?? user.medical_allowance ?? 0,
        telephone_allowance: user.telephoneAllowance ?? user.telephone_allowance ?? 0,
        other_allowances: user.otherAllowances ?? user.other_allowances ?? 0,
        provident_fund: user.pfDeduction ?? user.provident_fund ?? 0,
        esi: user.esiDeduction ?? user.esi ?? 0,
        professional_tax: user.professionalTax ?? user.professional_tax ?? 0,
        income_tax: user.tdsDeduction ?? user.income_tax ?? 0,
        loan_deduction: user.loanDeduction ?? user.loan_deduction ?? 0,
        other_deductions: user.otherDeductions ?? user.other_deductions ?? 0,
        profile: user.profile || null,
      }
    });
  } catch (e) {
    console.error('Get staff by id error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch staff' });
  }
});

// Update StaffProfile fields for a staff (org-scoped)
router.put('/staff/:id/profile', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = req.params.id;
    const user = await User.findOne({ where: { id: Number(id), orgAccountId: orgId, role: 'staff' } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }
    const profile = await StaffProfile.findOne({ where: { userId: id } });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Staff profile not found' });
    }

    // Whitelist updatable fields from StaffProfile
    const allowed = [
      'name', 'email', 'phone', 'designation', 'department', 'staffType', 'dateOfJoining',
      'dob', 'gender', 'maritalStatus', 'bloodGroup', 'emergencyContact', 'currentAddress', 'permanentAddress',
      'addressLine1', 'addressLine2', 'city', 'state', 'postalCode',
      'attendanceSettingTemplate', 'salaryCycleDate', 'shiftSelection', 'openingBalance', 'salaryDetailAccess', 'allowCurrentCycleSalaryAccess',
      'bankAccountHolderName', 'bankAccountNumber', 'bankIfsc', 'bankName', 'bankBranch', 'upiId'
    ];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    await profile.update(updates);

    return res.json({ success: true, profile });
  } catch (e) {
    console.error('Update staff profile error:', e);
    return res.status(500).json({ success: false, message: 'Failed to update staff profile' });
  }
});

// Attendance list for a given date and optional staff filter (org-scoped)
router.get('/attendance', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { date, staffId } = req.query || {};
    if (!date) return res.status(400).json({ success: false, message: 'date required' });

    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const where = { date: String(date), userId: orgStaffIds };
    if (staffId && Number(staffId) > 0) where.userId = Number(staffId);

    const rows = await Attendance.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id'], include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'staffId', 'department'] }] }
      ]
    });

    const toTime = (dt) => (dt ? new Date(dt).toTimeString().slice(0, 8) : null);
    const data = rows.map(r => {
      let status = r.status || 'absent';
      if (!r.status) {
        if (Number(r.breakTotalSeconds) === -1) status = 'leave';
        else if (Number(r.breakTotalSeconds) === -2) status = 'half_day';
        else if (r.punchedInAt && r.punchedOutAt) status = 'present';
        else if (r.punchedInAt || r.punchedOutAt) status = 'half_day';
      }
      return {
        id: r.id,
        date: r.date,
        checkIn: toTime(r.punchedInAt),
        checkOut: toTime(r.punchedOutAt),
        status,
        user: { name: r.user?.profile?.name || null },
        staffProfile: { staffId: r.user?.profile?.staffId || null, department: r.user?.profile?.department || null }
      };
    });

    return res.json({ success: true, data });
  } catch (e) {
    console.error('Attendance list error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load attendance' });
  }
});

// Attendance export as CSV (org-scoped)
router.get('/attendance/export', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { date, staffId } = req.query || {};
    if (!date) return res.status(400).json({ success: false, message: 'date required' });

    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const where = { date: String(date), userId: orgStaffIds };
    if (staffId && Number(staffId) > 0) where.userId = Number(staffId);

    const rows = await Attendance.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id'], include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'staffId'] }] }
      ]
    });

    const header = ['Staff Name', 'Staff ID', 'Date', 'Check In', 'Check Out', 'Status'];
    const lines = [header.join(',')];
    const toTime = (dt) => (dt ? new Date(dt).toTimeString().slice(0, 8) : '');
    rows.forEach(r => {
      let status = r.status || 'absent';
      const isLeave = Number(r.breakTotalSeconds) === -1;
      const isHalfSentinel = Number(r.breakTotalSeconds) === -2;
      if (isLeave) status = 'leave';
      else if (isHalfSentinel) status = 'half_day';
      else if (r.punchedInAt && r.punchedOutAt) {
        const durMs = new Date(r.punchedOutAt) - new Date(r.punchedInAt);
        const durH = durMs / (1000 * 60 * 60);
        status = durH >= 4 ? 'present' : 'half_day';
      } else if (r.punchedInAt || r.punchedOutAt) status = 'half_day';
      const line = [
        (r.user?.profile?.name || '').replace(/,/g, ' '),
        (r.user?.profile?.staffId || '').toString(),
        r.date,
        toTime(r.punchedInAt),
        toTime(r.punchedOutAt),
        status
      ].join(',');
      lines.push(line);
    });

    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${String(date)}.csv`);
    return res.send(csv);
  } catch (e) {
    console.error('Attendance export error:', e);
    return res.status(500).json({ success: false, message: 'Failed to export attendance' });
  }
});

// Create/Update attendance record for a staff on a given date (org-scoped)
router.post('/attendance', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const body = req.body || {};
    const uid = Number(body.userId || body.staffId);
    const dateIso = toIsoDateOnly(body.date || body.dateIso || body.onDate);
    const statusRaw = String(body.status || '').toLowerCase();
    const status = ['present', 'absent', 'half_day', 'leave'].includes(statusRaw) ? statusRaw : 'present';
    const checkIn = normalizeTime(body.checkIn);
    const checkOut = normalizeTime(body.checkOut);

    if (!Number.isFinite(uid)) {
      return res.status(400).json({ success: false, message: 'userId (or staffId) required' });
    }
    if (!dateIso) {
      return res.status(400).json({ success: false, message: 'Valid date required' });
    }

    const user = await User.findOne({ where: { id: uid, orgAccountId: orgId, role: 'staff' } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    // Prepare fields for model (punchedInAt/punchedOutAt), and encode leave as sentinel
    const joinDateTime = (t) => (t ? new Date(`${dateIso}T${normalizeTime(t)}`) : null);
    let payload = {
      punchedInAt: joinDateTime(checkIn),
      punchedOutAt: joinDateTime(checkOut),
      status
    };
    if (status === 'leave') {
      payload = { punchedInAt: null, punchedOutAt: null, breakTotalSeconds: -1, status };
    } else if (status === 'absent') {
      payload = { punchedInAt: null, punchedOutAt: null, breakTotalSeconds: 0, status };
    } else if (status === 'half_day') {
      // keep provided times, but mark half-day explicitly via sentinel
      payload.breakTotalSeconds = -2;
    }

    const [row, created] = await Attendance.findOrCreate({
      where: { userId: uid, date: dateIso },
      defaults: payload
    });
    if (!created) {
      await row.update(payload);
    }
    return res.json({ success: true, attendance: row });
  } catch (e) {
    console.error('Save attendance error:', e);
    return res.status(500).json({ success: false, message: 'Failed to save attendance' });
  }
});

// Get salary template fields for staff creation (org-scoped)
router.get('/salary-template-fields/:templateId', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { templateId } = req.params;

    const template = await SalaryTemplate.findOne({ where: { id: Number(templateId), orgAccountId: orgId } });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Salary template not found' });
    }

    // Parse template fields
    const earnings = typeof template.earnings === 'string' ? JSON.parse(template.earnings) : template.earnings;
    const incentives = typeof template.incentives === 'string' ? JSON.parse(template.incentives) : template.incentives;
    const deductions = typeof template.deductions === 'string' ? JSON.parse(template.deductions) : template.deductions;

    // Return template structure with default values
    const templateFields = {
      name: template.name,
      code: template.code,
      earnings: Array.isArray(earnings) ? earnings.map(item => ({
        key: item.key,
        label: item.label,
        type: item.type,
        defaultValue: item.valueNumber || 0,
        meta: item.meta || {}
      })) : [],
      incentives: Array.isArray(incentives) ? incentives.map(item => ({
        key: item.key,
        label: item.label,
        type: item.type,
        defaultValue: item.valueNumber || 0,
        meta: item.meta || {}
      })) : [],
      deductions: Array.isArray(deductions) ? deductions.map(item => ({
        key: item.key,
        label: item.label,
        type: item.type,
        defaultValue: item.valueNumber || 0,
        meta: item.meta || {}
      })) : []
    };

    res.json({ success: true, data: templateFields });
  } catch (error) {
    console.error('Get salary template fields error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/staff', async (req, res) => {
  try {
    // Debug: log incoming body once (can be removed later)
    // eslint-disable-next-line no-console
    console.log('POST /admin/staff payload:', req.body);

    const {
      staffId,
      phone,
      name,
      email,
      password,
      salaryTemplateId,
      salaryValues,
      // Additional fields from form
      department,
      designation,
      attendanceSettingTemplate,
      salaryCycleDate,
      staffType,
      shiftSelection,
      openingBalance,
      salaryDetailAccess,
      allowCurrentCycleSalaryAccess,
      active
    } = req.body || {};

    // Accept phone under different common keys just in case
    const phoneInput = phone ?? req.body?.phoneNumber ?? req.body?.mobile ?? req.body?.contact;
    if (!phoneInput) {
      return res.status(400).json({ success: false, message: 'phone required' });
    }

    const existingUser = await User.findOne({ where: { phone: String(phoneInput) } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Phone already exists' });
    }

    if (staffId) {
      const existingStaffId = await StaffProfile.findOne({ where: { staffId: String(staffId) } });
      if (existingStaffId) {
        return res.status(409).json({ success: false, message: 'Staff ID already exists' });
      }
    }

    // Validate salary template if provided
    let template = null;
    if (salaryTemplateId) {
      template = await SalaryTemplate.findByPk(salaryTemplateId);
      if (!template) {
        return res.status(400).json({ success: false, message: 'Invalid salary template' });
      }
    }

    // Tenancy & staff limit enforcement
    const orgId = req.tenantOrgAccountId || null;
    if (!orgId) {
      return res.status(403).json({ success: false, message: 'No organization in context' });
    }
    const activeSub = req.activeSubscription || null;
    if (!activeSub || !activeSub.plan) {
      return res.status(402).json({ success: false, message: 'Active subscription required' });
    }
    const currentActiveStaff = await User.count({ where: { role: 'staff', orgAccountId: orgId, active: true } });
    const staffLimit = Number(((activeSub && (activeSub.staffLimit ?? (activeSub.meta ? activeSub.meta.staffLimit : undefined))) ?? (activeSub.plan ? activeSub.plan.staffLimit : 0)) || 0);
    if (staffLimit > 0 && currentActiveStaff >= staffLimit) {
      return res.status(403).json({ success: false, message: `Staff limit reached (${staffLimit}). Upgrade plan to add more staff.` });
    }

    const passwordHash = await bcrypt.hash(String(password || '123456'), 10);

    // Helper to map request keys to User model attributes
    const toUserAttr = (key) => ({
      // earnings
      basic_salary: 'basicSalary',
      hra: 'hra',
      da: 'da',
      special_allowance: 'specialAllowance',
      conveyance_allowance: 'conveyanceAllowance',
      medical_allowance: 'medicalAllowance',
      telephone_allowance: 'telephoneAllowance',
      other_allowances: 'otherAllowances',
      // deductions
      provident_fund: 'pfDeduction',
      esi: 'esiDeduction',
      professional_tax: 'professionalTax',
      income_tax: 'tdsDeduction',
      loan_deduction: 'otherDeductions',
      other_deductions: 'otherDeductions',
    })[key];

    // Prepare user data with salary fields
    const userData = {
      role: 'staff',
      phone: String(phoneInput),
      passwordHash,
      active: active !== false, // Default to true if not specified
      salaryTemplateId: salaryTemplateId || null,
      orgAccountId: orgId
    };

    // Persist full salaryValues JSON sent from the form (including dynamic fields)
    if (salaryValues && typeof salaryValues === 'object') {
      userData.salaryValues = salaryValues;
    }

    // Add additional fields to userData for User table
    if (department) userData.department = department;
    if (designation) userData.designation = designation;
    if (attendanceSettingTemplate) userData.attendanceSettingTemplate = attendanceSettingTemplate;
    if (salaryCycleDate) userData.salaryCycleDate = salaryCycleDate;
    if (staffType) userData.staffType = staffType;
    if (shiftSelection) userData.shiftSelection = shiftSelection;
    if (openingBalance) userData.openingBalance = openingBalance;
    if (salaryDetailAccess !== undefined) userData.salaryDetailAccess = salaryDetailAccess;
    if (allowCurrentCycleSalaryAccess !== undefined) userData.allowCurrentCycleSalaryAccess = allowCurrentCycleSalaryAccess;

    // If template is provided, populate salary fields
    if (template) {
      // Parse template fields
      const earnings = typeof template.earnings === 'string' ? JSON.parse(template.earnings) : template.earnings;
      const incentives = typeof template.incentives === 'string' ? JSON.parse(template.incentives) : template.incentives;
      const deductions = typeof template.deductions === 'string' ? JSON.parse(template.deductions) : template.deductions;

      // Process earnings - use provided values or template defaults
      let totalEarnings = 0;
      if (Array.isArray(earnings)) {
        earnings.forEach(item => {
          const fieldName = item.key;
          const fieldValue = salaryValues?.earnings?.[fieldName] || item.valueNumber || 0;
          const attr = toUserAttr(fieldName);
          if (attr) userData[attr] = parseFloat(fieldValue);
          totalEarnings += parseFloat(fieldValue);
        });
      }
      userData.totalEarnings = totalEarnings;

      // Process incentives - use provided values or template defaults
      let totalIncentives = 0;
      if (Array.isArray(incentives)) {
        incentives.forEach(item => {
          const fieldName = item.key;
          const fieldValue = salaryValues?.incentives?.[fieldName] || item.valueNumber || 0;
          const attr = toUserAttr(fieldName);
          if (attr) userData[attr] = parseFloat(fieldValue);
          totalIncentives += parseFloat(fieldValue);
        });
      }
      userData.totalIncentives = totalIncentives;

      // Process deductions - use provided values or template defaults
      let totalDeductions = 0;
      if (Array.isArray(deductions)) {
        deductions.forEach(item => {
          const fieldName = item.key;
          const fieldValue = salaryValues?.deductions?.[fieldName] || item.valueNumber || 0;
          const attr = toUserAttr(fieldName);
          if (attr) userData[attr] = parseFloat(fieldValue);
          totalDeductions += parseFloat(fieldValue);
        });
      }
      userData.totalDeductions = totalDeductions;

      // Calculate gross and net salary
      const grossSalary = totalEarnings + totalIncentives;
      const netSalary = grossSalary - totalDeductions;
      userData.grossSalary = grossSalary;
      userData.netSalary = netSalary;
      userData.salaryLastCalculated = new Date();
    }

    // Explicit override with values sent from the form (ensure user's entries win over template defaults)
    if (salaryValues && (salaryValues.earnings || salaryValues.deductions)) {
      const ev = salaryValues.earnings || {};
      const dv = salaryValues.deductions || {};
      const toNum = (v) => (v === undefined || v === null || v === '' ? 0 : parseFloat(v));

      const earningKeys = [
        'basic_salary',
        'hra',
        'da',
        'special_allowance',
        'conveyance_allowance',
        'medical_allowance',
        'telephone_allowance',
        'other_allowances'
      ];
      let totalEarningsOverride = 0;
      earningKeys.forEach(k => {
        const attr = toUserAttr(k);
        if (ev[k] !== undefined && attr) {
          userData[attr] = toNum(ev[k]);
        }
        if (attr && userData[attr] !== undefined) totalEarningsOverride += toNum(userData[attr]);
      });

      const deductionKeys = [
        'provident_fund',
        'esi',
        'professional_tax',
        'income_tax',
        'loan_deduction',
        'other_deductions'
      ];
      let totalDeductionsOverride = 0;
      deductionKeys.forEach(k => {
        const attr = toUserAttr(k);
        if (dv[k] !== undefined && attr) {
          userData[attr] = toNum(dv[k]);
        }
        if (attr && userData[attr] !== undefined) totalDeductionsOverride += toNum(userData[attr]);
      });

      userData.totalEarnings = totalEarningsOverride;
      userData.totalDeductions = totalDeductionsOverride;
      const grossOverride = toNum(userData.totalEarnings) + toNum(userData.totalIncentives || 0);
      const netOverride = grossOverride - toNum(userData.totalDeductions);
      userData.grossSalary = grossOverride;
      userData.netSalary = netOverride;
      userData.salaryLastCalculated = new Date();
    }

    // Final guard: ensure basicSalary is set from payload if provided
    if (salaryValues?.earnings?.basic_salary !== undefined) {
      const n = parseFloat(salaryValues.earnings.basic_salary);
      if (!Number.isNaN(n)) userData.basicSalary = n;
    }

    // Debug log to verify what will be saved
    console.log('Creating User with salary fields:', {
      basicSalary: userData.basicSalary,
      hra: userData.hra,
      da: userData.da,
      totalEarnings: userData.totalEarnings,
      totalDeductions: userData.totalDeductions,
      grossSalary: userData.grossSalary,
      netSalary: userData.netSalary,
    });

    const staffUser = await User.create(userData);

    await StaffProfile.create({
      userId: staffUser.id,
      staffId: staffId ? String(staffId) : null,
      phone: String(phoneInput),
      name: name ? String(name) : null,
      email: email ? String(email) : null,
      department: department ? String(department) : null,
      designation: designation ? String(designation) : null,
      staffType: staffType ? String(staffType) : 'regular',
      attendanceSettingTemplate: attendanceSettingTemplate ? String(attendanceSettingTemplate) : null,
      salaryCycleDate: salaryCycleDate || null,
      shiftSelection: shiftSelection ? String(shiftSelection) : null,
      openingBalance: openingBalance || null,
      salaryDetailAccess: salaryDetailAccess !== undefined ? Boolean(salaryDetailAccess) : false,
      allowCurrentCycleSalaryAccess: allowCurrentCycleSalaryAccess !== undefined ? Boolean(allowCurrentCycleSalaryAccess) : false,
    });

    // Note: Do not auto-recalculate from template here; preserve values sent from the form

    return res.json({
      success: true,
      staff: {
        id: staffUser.id,
        staffId: String(staffId),
        phone: staffUser.phone,
        active: staffUser.active,
        salaryTemplateId,
        department,
        designation,
        staffType
      },
    });
  } catch (e) {
    console.error('Staff creation error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create staff' });
  }
});

// Update staff (org-scoped)
router.put('/staff/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const staffId = req.params.id;
    const { staffId: newStaffId, phone, name, email, active } = req.body || {};

    const staff = await User.findOne({ where: { id: Number(staffId), orgAccountId: orgId, role: 'staff' } });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    // Check if phone is being changed and if it already exists
    if (phone && phone !== staff.phone) {
      const existingUser = await User.findOne({ where: { phone: String(phone) } });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'Phone already exists' });
      }
    }

    // Check if staffId is being changed and if it already exists
    if (newStaffId && newStaffId !== staffId) {
      const existingStaffId = await StaffProfile.findOne({ where: { staffId: String(newStaffId) } });
      if (existingStaffId) {
        return res.status(409).json({ success: false, message: 'Staff ID already exists' });
      }
    }

    // Update user
    await staff.update({
      phone: phone ? String(phone) : staff.phone,
      active: active !== undefined ? !!active : staff.active,
    });

    // Update profile
    const profile = await StaffProfile.findOne({ where: { userId: staffId } });
    if (profile) {
      await profile.update({
        staffId: newStaffId ? String(newStaffId) : profile.staffId,
        phone: phone ? String(phone) : profile.phone,
        name: name !== undefined ? (name ? String(name) : null) : profile.name,
        email: email !== undefined ? (email ? String(email) : null) : profile.email,
      });
    }

    return res.json({
      success: true,
      staff: {
        id: staff.id,
        staffId: newStaffId || profile.staffId,
        phone: staff.phone,
        active: staff.active
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update staff' });
  }
});

// Delete staff (org-scoped)
router.delete('/staff/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const staffId = req.params.id;

    const staff = await User.findOne({ where: { id: Number(staffId), orgAccountId: orgId, role: 'staff' } });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    // Delete staff profile first (due to foreign key constraint)
    await StaffProfile.destroy({ where: { userId: staffId } });

    // Delete user
    await staff.destroy();

    return res.json({ success: true, message: 'Staff deleted successfully' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete staff' });
  }
});

// Dashboard endpoints (org-scoped)
router.get('/dashboard/stats', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const totalStaff = await User.count({ where: { role: 'staff', orgAccountId: orgId } });
    const activeStaff = await User.count({ where: { role: 'staff', active: true, orgAccountId: orgId } });

    // Get today's attendance
    const today = new Date().toISOString().slice(0, 10);
    const presentToday = await Attendance.count({
      where: { date: today, punchedInAt: { [Op.ne]: null } }
    });

    // Get total salary for active staff
    const staffWithSalary = await User.findAll({
      where: { role: 'staff', active: true, orgAccountId: orgId },
      attributes: ['gross_salary']
    });
    const totalSalary = staffWithSalary.reduce((sum, staff) => sum + (staff.gross_salary || 0), 0);

    return res.json({
      success: true,
      data: {
        totalStaff,
        presentToday,
        absentToday: totalStaff - presentToday,
        totalSalary,
        activeStaff
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

router.get('/dashboard/attendance-chart', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    // Get last 7 days attendance data
    const attendanceData = [];
    const orgStaffIds = (await User.findAll({ where: { role: 'staff', orgAccountId: orgId }, attributes: ['id'] })).map(u => u.id);
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const present = await Attendance.count({
        where: { date: dateStr, punchedInAt: { [Op.ne]: null }, userId: orgStaffIds }
      });
      const absent = orgStaffIds.length - present;

      attendanceData.push({
        day: dayName,
        present,
        absent,
        total: present + absent
      });
    }

    return res.json({
      success: true,
      data: attendanceData
    });
  } catch (error) {
    console.error('Attendance chart error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance data' });
  }
});

router.get('/dashboard/salary-chart', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    // Get salary distribution by department
    const staffWithDept = await User.findAll({
      where: { role: 'staff', active: true, orgAccountId: orgId },
      include: [{ model: StaffProfile, as: 'profile', attributes: ['department'] }],
      attributes: ['gross_salary']
    });

    const salaryByDept = {};
    staffWithDept.forEach(staff => {
      const dept = staff.profile?.department || 'General';
      if (!salaryByDept[dept]) {
        salaryByDept[dept] = { department: dept, totalSalary: 0, count: 0 };
      }
      salaryByDept[dept].totalSalary += staff.gross_salary || 0;
      salaryByDept[dept].count += 1;
    });

    const salaryData = Object.values(salaryByDept).map(item => ({
      ...item,
      avgSalary: item.count > 0 ? Math.round(item.totalSalary / item.count) : 0
    }));

    return res.json({
      success: true,
      data: salaryData
    });
  } catch (error) {
    console.error('Salary chart error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch salary data' });
  }
});

router.get('/dashboard/late-arrivals', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const today = new Date().toISOString().slice(0, 10);

    // Get today's attendance with late arrivals (after 11:00 AM)
    const todayAttendance = await Attendance.findAll({
      where: { date: today },
      include: [{ model: User, as: 'user', where: { role: 'staff', orgAccountId: orgId } }]
    });

    const totalStaff = await User.count({ where: { role: 'staff', active: true, orgAccountId: orgId } });

    // Count late arrivals (punched in after 11:00 AM)
    const lateArrivals = todayAttendance.filter(att => {
      if (!att.punchedInAt) return false;
      const punchInTime = new Date(att.punchedInAt);
      const punchInHour = punchInTime.getHours();
      const punchInMinute = punchInTime.getMinutes();
      // Consider late if after 11:00 AM (11:00)
      return punchInHour > 11 || (punchInHour === 11 && punchInMinute > 0);
    }).length;

    const lateArrivalPercentage = totalStaff > 0 ? Math.round((lateArrivals / totalStaff) * 100) : 0;

    return res.json({
      success: true,
      data: {
        lateArrivals,
        totalStaff,
        percentage: lateArrivalPercentage
      }
    });
  } catch (error) {
    console.error('Late arrivals error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch late arrivals data' });
  }
});

router.get('/dashboard/department-distribution', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    
    // Get all business function values for "department" type
    const { BusinessFunction, BusinessFunctionValue } = sequelize.models;
    let deptFunction = null;
    if (BusinessFunction) {
      deptFunction = await BusinessFunction.findOne({ 
        where: { name: { [Op.like]: '%department%' }, orgAccountId: orgId },
        include: [{ model: BusinessFunctionValue, as: 'values' }]
      });
    }
    const validDepts = deptFunction?.values?.map(v => v.value) || [];
    
    // Get staff distribution by department from profile
    const staffByDept = await User.findAll({
      where: { role: 'staff', active: true, orgAccountId: orgId },
      include: [{ model: StaffProfile, as: 'profile', attributes: ['department'] }],
      attributes: ['id']
    });

    const deptCounts = {};
    // Initialize counts for all defined departments
    validDepts.forEach(d => { deptCounts[d] = 0; });
    
    staffByDept.forEach(staff => {
      const dept = staff.profile?.department || 'General';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const totalStaff = staffByDept.length;
    const departmentData = Object.entries(deptCounts).map(([dept, count]) => ({
      department: dept,
      count,
      percentage: totalStaff > 0 ? Math.round((count / totalStaff) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    return res.json({
      success: true,
      data: {
        departments: departmentData,
        totalStaff
      }
    });
  } catch (error) {
    console.error('Department distribution error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch department distribution' });
  }
});

// Update staff salary template (org-scoped)
router.put('/staff/:id/salary-template', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { salaryTemplateId } = req.body || {};
    const staffId = req.params.id;

    const staff = await User.findOne({ where: { id: Number(staffId), orgAccountId: orgId, role: 'staff' } });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    // Validate salary template if provided
    if (salaryTemplateId) {
      const template = await SalaryTemplate.findOne({ where: { id: salaryTemplateId, orgAccountId: orgId } });
      if (!template) {
        return res.status(400).json({ success: false, message: 'Invalid salary template' });
      }
    }

    await staff.update({ salaryTemplateId: salaryTemplateId || null });

    // Recalculate salary if template is assigned
    if (salaryTemplateId) {
      try {
        await staff.calculateSalaryFromTemplate({
          workingDays: 26,
          presentDays: 26
        });
      } catch (error) {
        console.error('Error calculating salary for staff:', error);
        // Don't fail the update if salary calculation fails
      }
    } else {
      // Clear salary fields if template is removed
      await staff.update({
        basicSalary: 0,
        hra: 0,
        da: 0,
        specialAllowance: 0,
        conveyanceAllowance: 0,
        medicalAllowance: 0,
        telephoneAllowance: 0,
        otherAllowances: 0,
        totalEarnings: 0,
        pfDeduction: 0,
        esiDeduction: 0,
        professionalTax: 0,
        tdsDeduction: 0,
        otherDeductions: 0,
        totalDeductions: 0,
        grossSalary: 0,
        netSalary: 0,
        salaryLastCalculated: null
      });
    }

    return res.json({
      success: true,
      message: 'Salary template updated successfully',
      salaryTemplateId
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update salary template' });
  }
});

// Get staff with salary details (org-scoped)
router.get('/staff/:id/salary-details', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const staffId = req.params.id;

    const staff = await User.findOne({
      where: { id: Number(staffId), orgAccountId: orgId, role: 'staff' },
      include: [
        {
          model: StaffProfile,
          as: 'profile'
        },
        {
          model: SalaryTemplate,
          as: 'salaryTemplate'
        }
      ]
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    return res.json({
      success: true,
      staff: {
        id: staff.id,
        staffId: staff.profile?.staffId,
        phone: staff.phone,
        name: staff.profile?.name,
        email: staff.profile?.email,
        active: staff.active,
        salaryTemplateId: staff.salaryTemplateId,
        salaryTemplate: staff.salaryTemplate,
        salaryDetails: {
          basicSalary: staff.basicSalary,
          hra: staff.hra,
          da: staff.da,
          specialAllowance: staff.specialAllowance,
          conveyanceAllowance: staff.conveyanceAllowance,
          medicalAllowance: staff.medicalAllowance,
          telephoneAllowance: staff.telephoneAllowance,
          otherAllowances: staff.otherAllowances,
          totalEarnings: staff.totalEarnings,
          pfDeduction: staff.pfDeduction,
          esiDeduction: staff.esiDeduction,
          professionalTax: staff.professionalTax,
          tdsDeduction: staff.tdsDeduction,
          otherDeductions: staff.otherDeductions,
          totalDeductions: staff.totalDeductions,
          grossSalary: staff.grossSalary,
          netSalary: staff.netSalary,
          salaryLastCalculated: staff.salaryLastCalculated
        }
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch staff salary details' });
  }
});

// Recalculate staff salary (org-scoped)
router.post('/staff/:id/recalculate-salary', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const staffId = req.params.id;
    const { workingDays = 26, presentDays = 26 } = req.body || {};

    const staff = await User.findOne({
      where: { id: Number(staffId), orgAccountId: orgId, role: 'staff' }
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    if (!staff.salaryTemplateId) {
      return res.status(400).json({ success: false, message: 'No salary template assigned to staff' });
    }

    const salaryCalculation = await staff.calculateSalaryFromTemplate({
      workingDays,
      presentDays
    });

    return res.json({
      success: true,
      message: 'Salary recalculated successfully',
      salaryCalculation
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to recalculate salary' });
  }
});

// Create client (org-scoped)
router.post('/clients', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { name, phone, clientType, location, extra } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const client = await Client.create({ name, phone: phone || null, clientType: clientType || null, location: location || null, extra: extra || null, createdBy: req.user.id, orgAccountId: orgId });
    return res.json({ success: true, client });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create client' });
  }
});

// Update client (org-scoped)
router.put('/clients/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const client = await Client.findOne({ where: { id: Number(req.params.id), orgAccountId: orgId } });
    if (!client) return res.status(404).json({ success: false, message: 'Not found' });
    const { name, phone, clientType, location, extra } = req.body || {};
    await client.update({
      name: name ?? client.name,
      phone: phone ?? client.phone,
      clientType: clientType ?? client.clientType,
      location: location ?? client.location,
      extra: extra ?? client.extra,
    });
    return res.json({ success: true, client });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update client' });
  }
});

// Create assignment (org-scoped)
router.post('/assignments', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { clientId, staffUserId, title, description, dueDate } = req.body || {};
    if (!clientId || !staffUserId) return res.status(400).json({ success: false, message: 'clientId and staffUserId required' });
    // Verify client and staff belong to org
    const client = await Client.findOne({ where: { id: clientId, orgAccountId: orgId } });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const staff = await User.findOne({ where: { id: staffUserId, orgAccountId: orgId, role: 'staff' } });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    const job = await AssignedJob.create({ clientId, staffUserId, title: title || null, description: description || null, status: 'pending', assignedOn: new Date(), dueDate: dueDate ? new Date(dueDate) : null, orgAccountId: orgId });
    const withClient = await AssignedJob.findByPk(job.id, { include: [{ model: Client, as: 'client' }] });
    return res.json({ success: true, job: withClient });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create assignment' });
  }
});

// Update assignment (org-scoped)
router.put('/assignments/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const job = await AssignedJob.findOne({ where: { id: Number(req.params.id), orgAccountId: orgId } });
    if (!job) return res.status(404).json({ success: false, message: 'Not found' });
    const { title, description, status, dueDate } = req.body || {};
    await job.update({
      title: title ?? job.title,
      description: description ?? job.description,
      status: status ?? job.status,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : job.dueDate,
    });
    const withClient = await AssignedJob.findByPk(job.id, { include: [{ model: Client, as: 'client' }] });
    return res.json({ success: true, job: withClient });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update assignment' });
  }
});

// Create target (org-scoped)
router.post('/targets', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { staffUserId, period, periodDate, targetAmount, targetOrders } = req.body || {};
    if (!staffUserId || !period || !periodDate) return res.status(400).json({ success: false, message: 'staffUserId, period, periodDate required' });
    const staff = await User.findOne({ where: { id: staffUserId, orgAccountId: orgId, role: 'staff' } });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    const tgt = await SalesTarget.create({ staffUserId, period, periodDate, targetAmount: Number(targetAmount || 0) || 0, targetOrders: targetOrders ? Number(targetOrders) : null, orgAccountId: orgId });
    return res.json({ success: true, target: tgt });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to set target' });
  }
});

// List targets (org-scoped)
router.get('/targets', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { staffUserId, period, periodDate } = req.query || {};
    const where = { orgAccountId: orgId };
    if (staffUserId) where.staffUserId = Number(staffUserId);
    if (period) where.period = String(period);
    if (periodDate) where.periodDate = String(periodDate);
    const rows = await SalesTarget.findAll({ where });
    return res.json({ success: true, targets: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load targets' });
  }
});
// Incentive targets CRUD (org-scoped)
router.post('/incentives', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { staffUserId, period, periodDate, ordersThreshold, rewardAmount, title, note, active } = req.body || {};
    if (!staffUserId || !period || !periodDate || !ordersThreshold) {
      return res.status(400).json({ success: false, message: 'staffUserId, period, periodDate, ordersThreshold required' });
    }
    const staff = await User.findOne({ where: { id: staffUserId, orgAccountId: orgId, role: 'staff' } });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    const row = await IncentiveTarget.create({
      staffUserId,
      period,
      periodDate,
      ordersThreshold: Number(ordersThreshold),
      rewardAmount: Number(rewardAmount || 0) || 0,
      title: title || null,
      note: note || null,
      active: active !== undefined ? !!active : true,
      orgAccountId: orgId,
    });
    return res.json({ success: true, incentive: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create incentive' });
  }
});

router.put('/incentives/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const row = await IncentiveTarget.findOne({ where: { id: Number(req.params.id), orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const { staffUserId, period, periodDate, ordersThreshold, rewardAmount, title, note, active } = req.body || {};
    await row.update({
      staffUserId: staffUserId ?? row.staffUserId,
      period: period ?? row.period,
      periodDate: periodDate ?? row.periodDate,
      ordersThreshold: ordersThreshold !== undefined ? Number(ordersThreshold) : row.ordersThreshold,
      rewardAmount: rewardAmount !== undefined ? (Number(rewardAmount) || 0) : row.rewardAmount,
      title: title ?? row.title,
      note: note ?? row.note,
      active: active !== undefined ? !!active : row.active,
    });
    return res.json({ success: true, incentive: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update incentive' });
  }
});

router.get('/incentives', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const where = { orgAccountId: orgId };
    const { staffUserId, period, active } = req.query || {};
    if (staffUserId) where.staffUserId = Number(staffUserId);
    if (period) where.period = String(period);
    if (active !== undefined) where.active = String(active) === 'true' || String(active) === '1';
    const rows = await IncentiveTarget.findAll({ where, order: [['updatedAt', 'DESC']] });
    return res.json({ success: true, incentives: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to list incentives' });
  }
});

// --- Geofence Templates & Assignments ---
function num(x, d = null) { const n = Number(x); return Number.isFinite(n) ? n : d; }

// List templates with sites (org-scoped)
router.get('/geofence/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { GeofenceTemplate, GeofenceSite } = sequelize.models;
    const list = await GeofenceTemplate.findAll({
      where: { orgAccountId: orgId },
      include: [{ model: GeofenceSite, as: 'sites' }],
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: list });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load geofence templates' });
  }
});

// Create template (+ optional sites) (org-scoped)
router.post('/geofence/templates', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { GeofenceTemplate, GeofenceSite } = sequelize.models;
    const { name, approvalRequired, active, sites } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });

    const tpl = await GeofenceTemplate.create({
      name: String(name).trim(),
      approvalRequired: !!approvalRequired,                                      
      active: active !== false,
      orgAccountId: orgId,
    });

    if (Array.isArray(sites)) {
      for (const s of sites) {
        const lat = num(s.latitude);
        const lng = num(s.longitude);
        const r = num(s.radiusMeters, 100);
        if (lat != null && lng != null) {
          await GeofenceSite.create({
            geofenceTemplateId: tpl.id,
            name: s.name || 'Site',
            address: s.address || null,
            latitude: lat,
            longitude: lng,
            radiusMeters: r,
            active: s.active !== false,
          });
        }
      }
    }

    const created = await GeofenceTemplate.findByPk(tpl.id, { include: [{ model: GeofenceSite, as: 'sites' }] });
    return res.json({ success: true, template: created });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create geofence template' });
  }
});

// Update template and replace/update sites (org-scoped)
router.put('/geofence/templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { GeofenceTemplate, GeofenceSite } = sequelize.models;
    const id = Number(req.params.id);
    const row = await GeofenceTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    const { name, approvalRequired, active, sites } = req.body || {};
    await row.update({
      name: name ?? row.name,
      approvalRequired: typeof approvalRequired === 'boolean' ? approvalRequired : row.approvalRequired,
      active: typeof active === 'boolean' ? active : row.active,
    });

    if (Array.isArray(sites)) {
      const existing = await GeofenceSite.findAll({ where: { geofenceTemplateId: row.id } });
      const keep = new Set();

      for (const s of sites) {
        const lat = num(s.latitude);
        const lng = num(s.longitude);
        const r = num(s.radiusMeters, 100);

        if (s.id) {
          const ex = existing.find(x => x.id === Number(s.id));
          if (ex) {
            await ex.update({
              name: s.name ?? ex.name,
              address: s.address ?? ex.address,
              latitude: lat ?? ex.latitude,
              longitude: lng ?? ex.longitude,
              radiusMeters: r ?? ex.radiusMeters,
              active: typeof s.active === 'boolean' ? s.active : ex.active,
            });
            keep.add(ex.id);
          }
        } else if (lat != null && lng != null) {
          const c = await GeofenceSite.create({
            geofenceTemplateId: row.id,
            name: s.name || 'Site',
            address: s.address || null,
            latitude: lat,
            longitude: lng,
            radiusMeters: r,
            active: s.active !== false,
          });
          keep.add(c.id);
        }
      }

      for (const ex of existing) {
        if (!keep.has(ex.id)) await ex.destroy();
      }
    }

    const updated = await GeofenceTemplate.findByPk(row.id, { include: [{ model: GeofenceSite, as: 'sites' }] });
    return res.json({ success: true, template: updated });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update geofence template' });
  }
});

// Delete template (and its sites) (org-scoped)
router.delete('/geofence/templates/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { GeofenceTemplate, GeofenceSite } = sequelize.models;
    const id = Number(req.params.id);
    const row = await GeofenceTemplate.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await GeofenceSite.destroy({ where: { geofenceTemplateId: row.id } });
    await row.destroy();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete geofence template' });
  }
});

// Assign geofence template to a staff (org-scoped)
router.post('/geofence/assign', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { StaffGeofenceAssignment, GeofenceTemplate } = sequelize.models;
    const { userId, geofenceTemplateId, effectiveFrom, effectiveTo } = req.body || {};
    if (!Number(userId) || !Number(geofenceTemplateId)) {
      return res.status(400).json({ success: false, message: 'userId & geofenceTemplateId required' });
    }
    // Verify staff and template belong to org
    const staff = await User.findOne({ where: { id: Number(userId), orgAccountId: orgId, role: 'staff' } });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    const tpl = await GeofenceTemplate.findOne({ where: { id: Number(geofenceTemplateId), orgAccountId: orgId } });
    if (!tpl) return res.status(404).json({ success: false, message: 'Geofence template not found' });
    const row = await StaffGeofenceAssignment.create({
      userId: Number(userId),
      geofenceTemplateId: Number(geofenceTemplateId),
      effectiveFrom: effectiveFrom || null,
      effectiveTo: effectiveTo || null,
      active: true,
    });
    return res.json({ success: true, assignment: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to assign geofence' });
  }
});

// List assignments for a user (with template and sites) (org-scoped)
router.get('/geofence/assignments/:userId', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { StaffGeofenceAssignment, GeofenceTemplate, GeofenceSite } = sequelize.models;
    const userId = Number(req.params.userId);
    // Verify staff belongs to org
    const staff = await User.findOne({ where: { id: userId, orgAccountId: orgId, role: 'staff' } });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    const rows = await StaffGeofenceAssignment.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [{ model: GeofenceTemplate, as: 'template', include: [{ model: GeofenceSite, as: 'sites' }] }],
    });
    return res.json({ success: true, assignments: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load assignments' });
  }
});

// --- Sales: Clients CRUD --- (org-scoped)
router.get('/sales/clients', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const rows = await sequelize.models.Client.findAll({ where: { orgAccountId: orgId }, order: [['createdAt','DESC']] });
    const data = rows.map(r => {
      return {
        id: r.id,
        name: r.name,
        phone: r.phone,
        clientType: r.client_type || r.clientType || null,
        location: r.location || null,
        extra: r.extra || null,
        active: r.active !== false,
        createdAt: r.createdAt,
      };
    });
    return res.json({ success: true, clients: data });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load clients' });
  }
});

router.post('/sales/clients', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { name, phone, clientType, location, extra } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    let baseExtra = (extra && typeof extra === 'object') ? extra : {};
    if (typeof extra === 'string') {
      try { baseExtra = JSON.parse(extra); } catch (_) { baseExtra = {}; }
    }
    const row = await sequelize.models.Client.create({
      name: String(name),
      phone: phone ? String(phone) : null,
      client_type: clientType ? String(clientType) : null,
      location: location ? String(location) : null,
      extra: JSON.stringify({ ...baseExtra, active: true }),
      orgAccountId: orgId,
      created_by: req.user?.id || null,
    });
    return res.json({ success: true, client: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create client' });
  }
});

router.put('/sales/clients/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await sequelize.models.Client.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const { name, phone, clientType, location, extra, active } = req.body || {};
    const updateData = {};
    if (name !== undefined) updateData.name = String(name);
    if (phone !== undefined) updateData.phone = String(phone);
    if (clientType !== undefined) updateData.clientType = String(clientType);
    if (location !== undefined) updateData.location = String(location);
    if (active !== undefined) updateData.active = !!active;
    if (extra !== undefined) {
      let current = row.extra || {};
      if (typeof current === 'string') { try { current = JSON.parse(current); } catch (_) { current = {}; } }
      let incoming = (extra && typeof extra === 'object') ? extra : {};
      if (typeof extra === 'string') { try { incoming = JSON.parse(extra); } catch (_) { incoming = {}; } }
      updateData.extra = { ...current, ...incoming };
    }
    if (Object.keys(updateData).length) await row.update(updateData);
    return res.json({ success: true, client: row });
  } catch (e) {
    console.error('Update client error:', e);
    return res.status(500).json({ success: false, message: 'Failed to update client' });
  }
});

router.delete('/sales/clients/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const id = Number(req.params.id);
    const row = await sequelize.models.Client.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await row.destroy();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete client' });
  }
});

// List assigned jobs with client and staff info (org-scoped)
router.get('/sales/assignments', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { AssignedJob, Client, User } = sequelize.models;
    const rows = await AssignedJob.findAll({
      where: { orgAccountId: orgId },
      order: [['createdAt','DESC']],
      include: [
        { model: Client, as: 'client', required: false },
        { model: User, as: 'staff', required: false },
      ],
    });
    const data = rows.map(r => ({
      id: r.id,
      clientId: r.client_id ?? r.clientId ?? null,
      clientName: r.client?.name || null,
      staffUserId: r.staff_user_id ?? r.staffUserId ?? null,
      staffName: r.staff ? (r.staff.name || r.staff.phone || `User #${r.staff.id}`) : null,
      title: r.title || null,
      description: r.description || null,
      status: r.status || 'pending',
      assignedOn: r.assigned_on || r.assignedOn || null,
      dueDate: r.due_date || r.dueDate || null,
      startedAt: r.started_at || r.startedAt || null,
      finishedAt: r.finished_at || r.finishedAt || null,
    }));
    return res.json({ success: true, assignments: data });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load assignments' });
  }
});

router.post('/sales/assignments', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { AssignedJob } = sequelize.models;
    const { clientId, staffUserId, title, description, status, assignedOn, dueDate } = req.body || {};
    const payload = {
      clientId: Number(clientId) || null,
      staffUserId: Number(staffUserId) || null,
      title: title ? String(title) : null,
      description: description ? String(description) : null,
      status: status ? String(status) : 'pending',
      assignedOn: assignedOn ? new Date(assignedOn) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      orgAccountId: orgId,
    };
    const row = await AssignedJob.create(payload);
    return res.json({ success: true, assignment: row });
  } catch (e) {
    console.error('Create assignment error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create assignment' });
  }
});

router.put('/sales/assignments/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { AssignedJob } = sequelize.models;
    const id = Number(req.params.id);
    const row = await AssignedJob.findOne({ where: { id, orgAccountId: orgId } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const { clientId, staffUserId, title, description, status, assignedOn, dueDate } = req.body || {};
    const patch = {};
    if (clientId !== undefined) patch.clientId = Number(clientId) || null;
    if (staffUserId !== undefined) patch.staffUserId = Number(staffUserId) || null;
    if (title !== undefined) patch.title = title ? String(title) : null;
    if (description !== undefined) patch.description = description ? String(description) : null;
    if (status !== undefined) patch.status = status ? String(status) : 'pending';
    if (assignedOn !== undefined) patch.assignedOn = assignedOn ? new Date(assignedOn) : null;
    if (dueDate !== undefined) patch.dueDate = dueDate ? new Date(dueDate) : null;
    await row.update(patch);
    return res.json({ success: true, assignment: row });
  } catch (e) {
    console.error('Update assignment error:', e);
    return res.status(500).json({ success: false, message: 'Failed to update assignment' });
  }
});

// --- Sales Targets (admin) --- (org-scoped)
router.get('/sales/targets', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { SalesTarget, User } = sequelize.models;
    const orgStaffIds = (await User.findAll({ where: { orgAccountId: orgId, role: 'staff' }, attributes: ['id'] })).map(u => u.id);
    const rows = await SalesTarget.findAll({ where: { staffUserId: orgStaffIds }, order: [['id','DESC']], limit: 1000 });

    // Build staff map safely (no joins)
    const staffIds = Array.from(new Set(rows
      .map(r => (r.staffUserId ?? r.staff_user_id))
      .filter((v) => Number.isFinite(Number(v)))
    )).map(Number);
    const staffMap = {};
    if (staffIds.length > 0) {
      // Try ORM first
      if (User) {
        try {
          const users = await User.findAll({ where: { id: staffIds }, attributes: ['id','name','phone'] });
          for (const u of users) {
            staffMap[u.id] = u.name || u.phone || `User #${u.id}`;
          }
        } catch (_) { /* fall through */ }
      }
      // Raw SQL fallback (common table name 'users')
      if (Object.keys(staffMap).length === 0) {
        try {
          const [rowsRaw] = await sequelize.query(
            `SELECT id, name, phone FROM users WHERE id IN (${staffIds.map(() => '?').join(',')})`,
            { replacements: staffIds }
          );
          for (const u of rowsRaw) {
            const id = Number(u.id);
            if (Number.isFinite(id)) {
              staffMap[id] = u.name || u.phone || `User #${id}`;
            }
          }
        } catch (_) { /* ignore */ }
      }
    }

    const data = rows.map(r => {
      const sid = r.staffUserId ?? r.staff_user_id ?? null;
      return {
        id: r.id,
        staffUserId: sid,
        staffName: (sid && staffMap[sid]) ? staffMap[sid] : null,
        period: r.period || 'monthly',
        periodDate: r.periodDate ?? r.period_date ?? null,
        targetAmount: r.targetAmount ?? r.target_amount ?? 0,
        targetOrders: r.targetOrders ?? r.target_orders ?? 0,
        achievedAmount: r.achievedAmount ?? 0,
        achievedOrders: r.achievedOrders ?? 0,
      };
    });
    return res.json({ success: true, targets: data });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load sales targets' });
  }
});

router.post('/sales/targets', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { SalesTarget, User } = sequelize.models;
    const { staffUserId, period, periodDate, targetAmount, targetOrders } = req.body || {};
    const sid = Number(staffUserId);
    if (!Number.isFinite(sid)) return res.status(400).json({ success: false, message: 'staffUserId required' });
    // Validate staff belongs to org
    const staff = await User.findOne({ where: { id: sid, orgAccountId: orgId, role: 'staff' } });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    const p = ['daily','weekly','monthly'].includes(String(period)) ? String(period) : 'monthly';
    const pd = periodDate ? String(periodDate) : null;
    const ta = Number(targetAmount || 0);
    const to = Number(targetOrders || 0);
    const row = await SalesTarget.create({
      // write both snake_case and camelCase to satisfy model mappings
      staff_user_id: sid,
      staffUserId: sid,
      period: p,
      period_date: pd,
      periodDate: pd,
      target_amount: ta,
      targetAmount: ta,
      target_orders: to,
      targetOrders: to,
    });
    return res.json({ success: true, target: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create sales target' });
  }
});

// --- Staff salary structure (admin) --- (org-scoped)
// Save dynamic salary JSON (earnings/incentives/deductions) to users.salary_values and update rollup totals
router.put('/staff/:id/salary', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const uid = Number(req.params.id);
    if (!Number.isFinite(uid)) return res.status(400).json({ success: false, message: 'invalid user id' });
    const user = await sequelize.models.User.findOne({ where: { id: uid, orgAccountId: orgId, role: 'staff' } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Accept month-wise update: month/year or monthKey = 'YYYY-MM'
    const monthKey = (() => {
      // Accept monthKey as 'YYYY-MM' or 'YYYY-MM-DD' (take first 7)
      let mkRaw = req.body?.monthKey || req.body?.month_key || req.body?.monthStr || req.query?.monthKey || req.query?.month || null;
      if (mkRaw) {
        const s = String(mkRaw).slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(s)) return s;
      }
      // Accept combined string month like '2026-01'
      const mStr = req.body?.month && typeof req.body.month === 'string' && /^\d{4}-\d{2}$/.test(req.body.month) ? req.body.month : null;
      if (mStr) return mStr;
      // Accept typical overview fields: startDate/fromDate/periodStart/date
      const dateLike = req.body?.startDate || req.body?.fromDate || req.body?.periodStart || req.body?.date || req.query?.date || null;
      if (dateLike && typeof dateLike === 'string') {
        const s = dateLike.slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(s)) return s;
        // try full ISO 'YYYY-MM-DDTHH:mm:ss'
        const iso = dateLike.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso.slice(0,7);
      }
      // Accept numeric month/year; support both 0-based (0..11) and 1-based (1..12)
      const mNum = Number(req.body?.month);
      const yNum = Number(req.body?.year);
      if (Number.isFinite(mNum) && Number.isFinite(yNum)) {
        const month1 = (mNum >= 0 && mNum <= 11) ? (mNum + 1) : (mNum >= 1 && mNum <= 12 ? mNum : null);
        if (month1) return `${yNum}-${String(month1).padStart(2,'0')}`;
      }
      if (Number.isFinite(mNum) && !Number.isFinite(yNum)) {
        const yy = new Date().getFullYear();
        const month1 = (mNum >= 0 && mNum <= 11) ? (mNum + 1) : (mNum >= 1 && mNum <= 12 ? mNum : null);
        if (month1) return `${yy}-${String(month1).padStart(2,'0')}`;
      }
      return null;
    })();

    // Parse incoming body; support JSON strings and arrays; also support salaryValues wrapper
    let { earnings, incentives, deductions, salaryValues: sv } = req.body || {};
    const parseMaybe = (v) => {
      if (!v) return v;
      if (typeof v === 'string') { try { return JSON.parse(v); } catch { return v; } }
      return v;
    };
    earnings = parseMaybe(earnings);
    incentives = parseMaybe(incentives);
    deductions = parseMaybe(deductions);
    sv = parseMaybe(sv);
    if (typeof sv === 'string') { try { sv = JSON.parse(sv); } catch { /* ignore */ } }
    if (sv && typeof sv === 'object') {
      // If direct fields missing, take from salaryValues wrapper
      if (!earnings) earnings = parseMaybe(sv.earnings);
      if (!incentives) incentives = parseMaybe(sv.incentives);
      if (!deductions) deductions = parseMaybe(sv.deductions);
    }

    const arrayToObj = (arr) => {
      const out = {};
      for (const it of Array.isArray(arr) ? arr : []) {
        if (!it) continue;
        const key = (it.key || it.name || it.field || '').toString().trim();
        if (!key) continue;
        out[key] = Number(it.amount ?? it.value ?? it.val ?? 0) || 0;
      }
      return out;
    };
    if (Array.isArray(earnings)) earnings = arrayToObj(earnings);
    if (Array.isArray(incentives)) incentives = arrayToObj(incentives);
    if (Array.isArray(deductions)) deductions = arrayToObj(deductions);

    if (!earnings || typeof earnings !== 'object') earnings = {};
    if (!incentives || typeof incentives !== 'object') incentives = {};
    if (!deductions || typeof deductions !== 'object') deductions = {};

    // Ensure numeric values (handle strings with commas, blanks)
    const toNumber = (v) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      const s = String(v).trim();
      if (!s) return 0;
      const cleaned = s.replace(/,/g, '');
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    };
    const normalize = (obj) => {
      const out = {};
      for (const k of Object.keys(obj || {})) out[k] = toNumber(obj[k]);
      return out;
    };
    earnings = normalize(earnings);
    incentives = normalize(incentives);
    deductions = normalize(deductions);

    const sum = (o) => Object.values(o || {}).reduce((s, v) => s + (Number(v) || 0), 0);

    // Merge with existing salary_values preserving other months
    let current = user.salaryValues || user.salary_values || null;
    if (typeof current === 'string') { try { current = JSON.parse(current); } catch { current = null; } }
    if (!current || typeof current !== 'object') current = {};

    let finalE = earnings, finalI = incentives, finalD = deductions;
    // If incoming is empty, preserve existing stored values to avoid wiping
    if (!monthKey) {
      if (!finalE || Object.keys(finalE).length === 0) finalE = current.earnings || {};
      if (!finalI || Object.keys(finalI).length === 0) finalI = current.incentives || {};
      if (!finalD || Object.keys(finalD).length === 0) finalD = current.deductions || {};
    } else {
      // Month-wise: if any object is empty, keep previous month content for that month if exists
      const prev = (current.months && current.months[monthKey]) || {};
      if (!finalE || Object.keys(finalE).length === 0) finalE = prev.earnings || {};
      if (!finalI || Object.keys(finalI).length === 0) finalI = prev.incentives || {};
      if (!finalD || Object.keys(finalD).length === 0) finalD = prev.deductions || {};
    }

    // Recompute totals based on final values
    const totalEarnings = sum(finalE);
    const totalIncentives = sum(finalI);
    const totalDeductions = sum(finalD);
    const grossSalary = totalEarnings + totalIncentives;
    const netSalary = grossSalary - totalDeductions;

    if (monthKey) {
      if (!current.months || typeof current.months !== 'object') current.months = {};
      current.months[monthKey] = {
        earnings: finalE,
        incentives: finalI,
        deductions: finalD,
        totals: { totalEarnings, totalIncentives, totalDeductions, grossSalary, netSalary },
      };
      current.lastUpdatedMonth = monthKey;
    } else {
      // Update base values only; preserve existing months
      current.earnings = finalE;
      current.incentives = finalI;
      current.deductions = finalD;
    }

    const payloadJson = current;
    const patch = {
      salary_values: JSON.stringify(payloadJson),
      salaryValues: JSON.stringify(payloadJson),
      salaryLastCalculated: new Date(),
    };
    // Update global rollups ONLY when base values are updated; for month-wise updates, keep globals unchanged
    if (!monthKey) {
      patch.totalEarnings = totalEarnings;
      patch.totalDeductions = totalDeductions;
      patch.grossSalary = grossSalary;
      patch.netSalary = netSalary;
    }
    await user.update(patch);

    return res.json({ success: true, userId: user.id, monthKey: monthKey || null, stored: payloadJson, totals: { totalEarnings, totalIncentives, totalDeductions, grossSalary, netSalary } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to save salary structure' });
  }
});

module.exports = router;
