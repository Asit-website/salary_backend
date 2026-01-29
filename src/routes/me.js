const express = require('express');
const { Op } = require('sequelize');

const { User, StaffProfile, StaffShiftAssignment, ShiftTemplate, SalaryAccess, StaffAttendanceAssignment, AttendanceTemplate, StaffSalaryAssignment, SalaryTemplate } = require('../models');
const { authRequired } = require('../middleware/auth');
const { upload } = require('../upload');

const router = express.Router();

router.use(authRequired);

// Attendance-aware salary compute for the logged-in user
router.get('/salary-compute', async (req, res) => {
  try {
    const monthKey = String(req.query.monthKey || req.query.month || '').slice(0,7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ success: false, message: 'monthKey (YYYY-MM) required' });
    }
    const { User, Attendance, LeaveRequest, WeeklyOffTemplate, StaffWeeklyOffAssignment, HolidayTemplate, HolidayDate, StaffHolidayAssignment } = require('../models');
    const u = await User.findByPk(req.user.id);
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

    // Attendance
    const atts = await Attendance.findAll({ where: { userId: u.id, date: { [Op.gte]: start, [Op.lte]: endKey } }, attributes: ['status','date'] });
    const attMap = {}; for (const a of atts) { attMap[String(a.date).slice(0,10)] = String(a.status || '').toLowerCase(); }
    // Leave sets from approved requests
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

    // Weekly off template
    let woConfig = [];
    try {
      const asg = await StaffWeeklyOffAssignment.findOne({ where: { userId: u.id, active: true }, order: [['id','DESC']] });
      if (asg) { const tpl = await WeeklyOffTemplate.findByPk(asg.weeklyOffTemplateId || asg.weekly_off_template_id); woConfig = (tpl && Array.isArray(tpl.config)) ? tpl.config : (tpl?.config || []); }
    } catch (_) {}
    // Holidays
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

    // Classify days
    let present = 0, half = 0, leave = 0, paidLeave = 0, unpaidLeave = 0, weeklyOff = 0, holidays = 0, absent = 0;
    for (let dnum = 1; dnum <= end.getDate(); dnum++) {
      const dt = new Date(yy, mm - 1, dnum);
      const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dnum).padStart(2,'0')}`;
      const s = attMap[key];
      if (s === 'present') { present += 1; continue; }
      if (s === 'half_day') { half += 1; continue; }
      if (s === 'leave') { leave += 1; if (paidLeaveSet.has(key)) paidLeave += 1; else if (unpaidLeaveSet.has(key)) unpaidLeave += 1; continue; }
      if (s === 'absent') { absent += 1; continue; }
      const isWO = (function() { try { const day = dt.getDay(); const wk = Math.floor((dt.getDate()-1)/7)+1; for (const cfg of Array.isArray(woConfig)?woConfig:[]) { if (Number(cfg.day)===day) { if (cfg.weeks==='all') return true; if (Array.isArray(cfg.weeks) && cfg.weeks.includes(wk)) return true; } } return false; } catch (_) { return false; } })();
      const isH = holidaySet.has(key);
      if (!isWO && !isH) {
        if (paidLeaveSet.has(key)) { leave += 1; paidLeave += 1; }
        else if (unpaidLeaveSet.has(key)) { leave += 1; unpaidLeave += 1; }
        else { absent += 1; }
      } else { if (isH) holidays += 1; else weeklyOff += 1; }
    }

    const ratio = end.getDate() > 0 ? Math.max(0, Math.min(1, (present + half*0.5 + weeklyOff + holidays + paidLeave) / end.getDate())) : 1;
    const totals = {
      totalEarnings: Math.round(sum(e) * ratio),
      totalIncentives: Math.round(sum(i) * ratio),
      totalDeductions: Math.round(sum(d) * ratio),
    };
    totals.grossSalary = totals.totalEarnings + totals.totalIncentives;
    totals.netSalary = totals.grossSalary - totals.totalDeductions;
    const attendanceSummary = { present, half, leave, paidLeave, unpaidLeave, weeklyOff, holidays, absent: absent + unpaidLeave, ratio };
    return res.json({ success: true, monthKey, totals, attendanceSummary, earnings: e, incentives: i, deductions: d });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to compute salary' });
  }
});

// Get current user with salary details
router.get('/', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: StaffProfile, as: 'profile' },
        { model: SalaryTemplate, as: 'salaryTemplate' }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        phone: user.phone,
        active: user.active,
        profile: user.profile,
        salaryTemplate: user.salaryTemplate,
        // Expose raw salary values JSON (supports both snake_case and camelCase columns)
        salaryValues: user.salaryValues || user.salary_values || null,
        salaryDetails: {
          basicSalary: user.basicSalary,
          hra: user.hra,
          da: user.da,
          specialAllowance: user.specialAllowance,
          conveyanceAllowance: user.conveyanceAllowance,
          medicalAllowance: user.medicalAllowance,
          telephoneAllowance: user.telephoneAllowance,
          otherAllowances: user.otherAllowances,
          totalEarnings: user.totalEarnings,
          pfDeduction: user.pfDeduction,
          esiDeduction: user.esiDeduction,
          professionalTax: user.professionalTax,
          tdsDeduction: user.tdsDeduction,
          otherDeductions: user.otherDeductions,
          totalDeductions: user.totalDeductions,
          grossSalary: user.grossSalary,
          netSalary: user.netSalary,
          salaryLastCalculated: user.salaryLastCalculated
        }
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load user data' });
  }
});

// Update current user's phone number
router.put('/phone', async (req, res) => {
  try {
    const nextPhoneRaw = req.body?.phone;
    const nextPhone = nextPhoneRaw ? String(nextPhoneRaw).trim() : '';
    if (!nextPhone) return res.status(400).json({ success: false, message: 'Phone is required' });
    // Basic validation: digits only 8-15 length
    const normalized = nextPhone.replace(/\D/g, '');
    if (normalized.length < 8 || normalized.length > 15) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    const me = await User.findByPk(req.user.id);
    if (!me) return res.status(404).json({ success: false, message: 'User not found' });

    // Ensure uniqueness
    const existing = await User.findOne({ where: { phone: nextPhone, id: { [Op.ne]: me.id } } });
    if (existing) return res.status(409).json({ success: false, message: 'Phone number already in use' });

    await me.update({ phone: nextPhone });

    // Keep StaffProfile.phone in sync if exists
    const profile = await StaffProfile.findOne({ where: { userId: me.id } });
    if (profile) await profile.update({ phone: nextPhone });

    return res.json({ success: true, phone: nextPhone });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update phone' });
  }
});

router.get('/shift', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayKey = `${y}-${m}-${d}`;

    const assignment = await StaffShiftAssignment.findOne({
      where: {
        userId: user.id,
        effectiveFrom: { [Op.lte]: todayKey },
        [Op.or]: [
          { effectiveTo: null },
          { effectiveTo: { [Op.gte]: todayKey } },
        ],
      },
      include: [{ model: ShiftTemplate, as: 'template' }],
      order: [['effectiveFrom', 'DESC']],
    });

    if (!assignment || !assignment.template) {
      return res.json({ success: true, shift: null });
    }

    const t = assignment.template;
    return res.json({
      success: true,
      shift: {
        assignmentId: assignment.id,
        effectiveFrom: assignment.effectiveFrom,
        effectiveTo: assignment.effectiveTo,
        template: {
          id: t.id,
          shiftType: t.shiftType,
          name: t.name,
          code: t.code,
          startTime: t.startTime,
          endTime: t.endTime,
          workMinutes: t.workMinutes,
          bufferMinutes: t.bufferMinutes,
        },
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load shift' });
  }
});

router.get('/attendance-template', async (req, res) => {
  try {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayKey = `${y}-${m}-${d}`;

    const assignment = await StaffAttendanceAssignment.findOne({
      where: {
        userId: req.user.id,
        effectiveFrom: { [Op.lte]: todayKey },
        [Op.or]: [
          { effectiveTo: null },
          { effectiveTo: { [Op.gte]: todayKey } },
        ],
      },
      include: [{ model: AttendanceTemplate, as: 'template' }],
      order: [['effectiveFrom', 'DESC']],
    });

    if (!assignment) return res.json({ success: true, template: null });
    const t = assignment.template;
    return res.json({
      success: true,
      template: t ? {
        id: t.id,
        name: t.name,
        code: t.code,
        attendanceMode: t.attendanceMode,
        holidaysRule: t.holidaysRule,
        trackInOutEnabled: t.trackInOutEnabled,
        requirePunchOut: t.requirePunchOut,
        allowMultiplePunches: t.allowMultiplePunches,
        markAbsentPrevDaysEnabled: t.markAbsentPrevDaysEnabled,
        markAbsentRule: t.markAbsentRule,
        effectiveHoursRule: t.effectiveHoursRule,
        active: t.active,
      } : null,
      assignment: {
        id: assignment.id,
        effectiveFrom: assignment.effectiveFrom,
        effectiveTo: assignment.effectiveTo,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load attendance template' });
  }
});

router.get('/salary/access', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { include: [{ model: SalaryAccess, as: 'salaryAccess' }] });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, allowCurrentCycle: !!user.salaryAccess?.allowCurrentCycle });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load salary access' });
  }
});

router.get('/profile', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { include: [{ model: StaffProfile, as: 'profile' }] });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({
      success: true,
      profile: {
        id: user.id,
        role: user.role,
        phone: user.phone,
        name: user.profile?.name || null,
        email: user.profile?.email || null,
        staffId: user.profile?.staffId || null,
        designation: user.profile?.designation || null,
        department: user.profile?.department || null,
        photoUrl: user.profile?.photoUrl || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load profile' });
  }
});

router.get('/general', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const profile = await StaffProfile.findOne({ where: { userId: user.id } });
    const extra = profile?.extra || {};

    return res.json({
      success: true,
      general: {
        fullName: profile?.name || null,
        dob: profile?.dob || extra?.dob || null,
        gender: profile?.gender || extra?.gender || null,
        maritalStatus: profile?.maritalStatus || extra?.maritalStatus || null,
        bloodGroup: profile?.bloodGroup || null,
        nationality: profile?.nationality || extra?.nationality || null,

        personalMobile: profile?.personalMobile || extra?.personalMobile || null,
        emergencyContactName: profile?.emergencyContactName || extra?.emergencyContactName || null,
        emergencyContactNumber: profile?.emergencyContact || null,

        currentAddress: profile?.currentAddress || extra?.currentAddress || null,
        permanentAddress: profile?.permanentAddress || extra?.permanentAddress || null,

        designation: profile?.designation || null,
        department: profile?.department || null,
        employeeType: profile?.staffType || null,
        dateOfJoining: profile?.dateOfJoining || null,
        workLocation: profile?.workLocation || extra?.workLocation || null,
        reportingManager: profile?.reportingManager || extra?.reportingManager || null,
        shiftTiming: profile?.shiftTiming || extra?.shiftTiming || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load general info' });
  }
});

router.put('/general', async (req, res) => {
  try {
    const {
      fullName,
      dob,
      gender,
      maritalStatus,
      bloodGroup,
      nationality,
      personalMobile,
      emergencyContactName,
      emergencyContactNumber,
      currentAddress,
      permanentAddress,
      designation,
      department,
      employeeType,
      dateOfJoining,
      workLocation,
      reportingManager,
      shiftTiming,
    } = req.body || {};

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const profile = (await StaffProfile.findOne({ where: { userId: user.id } }))
      || (await StaffProfile.create({ userId: user.id, phone: user.phone }));

    const prevExtra = profile.extra || {};
    const nextExtra = {
      ...prevExtra,
      // keep extra in sync for backwards compatibility
      dob: dob !== undefined ? (dob ? String(dob) : null) : prevExtra.dob,
      gender: gender !== undefined ? (gender ? String(gender) : null) : prevExtra.gender,
      maritalStatus: maritalStatus !== undefined ? (maritalStatus ? String(maritalStatus) : null) : prevExtra.maritalStatus,
      nationality: nationality !== undefined ? (nationality ? String(nationality) : null) : prevExtra.nationality,
      personalMobile: personalMobile !== undefined ? (personalMobile ? String(personalMobile) : null) : prevExtra.personalMobile,
      emergencyContactName: emergencyContactName !== undefined ? (emergencyContactName ? String(emergencyContactName) : null) : prevExtra.emergencyContactName,
      currentAddress: currentAddress !== undefined ? (currentAddress ? String(currentAddress) : null) : prevExtra.currentAddress,
      permanentAddress: permanentAddress !== undefined ? (permanentAddress ? String(permanentAddress) : null) : prevExtra.permanentAddress,
      workLocation: workLocation !== undefined ? (workLocation ? String(workLocation) : null) : prevExtra.workLocation,
      reportingManager: reportingManager !== undefined ? (reportingManager ? String(reportingManager) : null) : prevExtra.reportingManager,
      shiftTiming: shiftTiming !== undefined ? (shiftTiming ? String(shiftTiming) : null) : prevExtra.shiftTiming,
    };

    await profile.update({
      name: fullName !== undefined ? (fullName ? String(fullName) : null) : profile.name,
      dob: dob !== undefined ? (dob ? String(dob) : null) : profile.dob,
      gender: gender !== undefined ? (gender ? String(gender) : null) : profile.gender,
      maritalStatus: maritalStatus !== undefined ? (maritalStatus ? String(maritalStatus) : null) : profile.maritalStatus,
      bloodGroup: bloodGroup !== undefined ? (bloodGroup ? String(bloodGroup) : null) : profile.bloodGroup,
      nationality: nationality !== undefined ? (nationality ? String(nationality) : null) : profile.nationality,
      personalMobile: personalMobile !== undefined ? (personalMobile ? String(personalMobile) : null) : profile.personalMobile,
      emergencyContactName: emergencyContactName !== undefined ? (emergencyContactName ? String(emergencyContactName) : null) : profile.emergencyContactName,
      emergencyContact:
        emergencyContactNumber !== undefined ? (emergencyContactNumber ? String(emergencyContactNumber) : null) : profile.emergencyContact,
      currentAddress: currentAddress !== undefined ? (currentAddress ? String(currentAddress) : null) : profile.currentAddress,
      permanentAddress: permanentAddress !== undefined ? (permanentAddress ? String(permanentAddress) : null) : profile.permanentAddress,
      designation: designation !== undefined ? (designation ? String(designation) : null) : profile.designation,
      department: department !== undefined ? (department ? String(department) : null) : profile.department,
      staffType: employeeType !== undefined ? (employeeType ? String(employeeType) : null) : profile.staffType,
      dateOfJoining: dateOfJoining !== undefined ? (dateOfJoining ? String(dateOfJoining) : null) : profile.dateOfJoining,
      workLocation: workLocation !== undefined ? (workLocation ? String(workLocation) : null) : profile.workLocation,
      reportingManager: reportingManager !== undefined ? (reportingManager ? String(reportingManager) : null) : profile.reportingManager,
      shiftTiming: shiftTiming !== undefined ? (shiftTiming ? String(shiftTiming) : null) : profile.shiftTiming,
      extra: nextExtra,
    });

    return res.json({
      success: true,
      general: {
        fullName: profile.name || null,
        dob: profile.dob || profile.extra?.dob || null,
        gender: profile.gender || profile.extra?.gender || null,
        maritalStatus: profile.maritalStatus || profile.extra?.maritalStatus || null,
        bloodGroup: profile.bloodGroup || null,
        nationality: profile.nationality || profile.extra?.nationality || null,
        personalMobile: profile.personalMobile || profile.extra?.personalMobile || null,
        emergencyContactName: profile.emergencyContactName || profile.extra?.emergencyContactName || null,
        emergencyContactNumber: profile.emergencyContact || null,
        currentAddress: profile.currentAddress || profile.extra?.currentAddress || null,
        permanentAddress: profile.permanentAddress || profile.extra?.permanentAddress || null,
        designation: profile.designation || null,
        department: profile.department || null,
        employeeType: profile.staffType || null,
        dateOfJoining: profile.dateOfJoining || null,
        workLocation: profile.workLocation || profile.extra?.workLocation || null,
        reportingManager: profile.reportingManager || profile.extra?.reportingManager || null,
        shiftTiming: profile.shiftTiming || profile.extra?.shiftTiming || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update general info' });
  }
});

router.get('/bank', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const profile = await StaffProfile.findOne({ where: { userId: user.id } });

    return res.json({
      success: true,
      bank: {
        bankAccountHolderName: profile?.bankAccountHolderName || null,
        bankAccountNumber: profile?.bankAccountNumber || null,
        bankIfsc: profile?.bankIfsc || null,
        bankName: profile?.bankName || null,
        bankBranch: profile?.bankBranch || null,
        upiId: profile?.upiId || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load bank details' });
  }
});

router.put('/bank', async (req, res) => {
  try {
    const {
      bankAccountHolderName,
      bankAccountNumber,
      bankIfsc,
      bankName,
      bankBranch,
      upiId,
    } = req.body || {};

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const profile = (await StaffProfile.findOne({ where: { userId: user.id } }))
      || (await StaffProfile.create({ userId: user.id, phone: user.phone }));

    await profile.update({
      bankAccountHolderName:
        bankAccountHolderName !== undefined ? (bankAccountHolderName ? String(bankAccountHolderName) : null) : profile.bankAccountHolderName,
      bankAccountNumber:
        bankAccountNumber !== undefined ? (bankAccountNumber ? String(bankAccountNumber) : null) : profile.bankAccountNumber,
      bankIfsc: bankIfsc !== undefined ? (bankIfsc ? String(bankIfsc) : null) : profile.bankIfsc,
      bankName: bankName !== undefined ? (bankName ? String(bankName) : null) : profile.bankName,
      bankBranch: bankBranch !== undefined ? (bankBranch ? String(bankBranch) : null) : profile.bankBranch,
      upiId: upiId !== undefined ? (upiId ? String(upiId) : null) : profile.upiId,
    });

    return res.json({
      success: true,
      bank: {
        bankAccountHolderName: profile.bankAccountHolderName || null,
        bankAccountNumber: profile.bankAccountNumber || null,
        bankIfsc: profile.bankIfsc || null,
        bankName: profile.bankName || null,
        bankBranch: profile.bankBranch || null,
        upiId: profile.upiId || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update bank details' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { name, email, designation, department } = req.body || {};

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const profile = (await StaffProfile.findOne({ where: { userId: user.id } }))
      || (await StaffProfile.create({ userId: user.id, phone: user.phone }));

    await profile.update({
      name: name !== undefined ? (name ? String(name) : null) : profile.name,
      email: email !== undefined ? (email ? String(email) : null) : profile.email,
      designation: designation !== undefined ? (designation ? String(designation) : null) : profile.designation,
      department: department !== undefined ? (department ? String(department) : null) : profile.department,
    });

    return res.json({ success: true, profile });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

router.post('/profile/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo is required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const profile = (await StaffProfile.findOne({ where: { userId: user.id } }))
      || (await StaffProfile.create({ userId: user.id, phone: user.phone }));

    const photoUrl = `/uploads/${req.file.filename}`;
    await profile.update({ photoUrl });

    return res.json({ success: true, photoUrl });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
});

module.exports = router;
