const express = require('express');
const { Op } = require('sequelize');

const fs = require('fs');
const path = require('path');
const { User, StaffProfile, StaffShiftAssignment, ShiftTemplate, SalaryAccess, StaffAttendanceAssignment, AttendanceTemplate, StaffSalaryAssignment, SalaryTemplate, PayrollCycle, PayrollLine, ExpenseClaim, LeaveRequest, AttendanceRegularization, StaffAdvance } = require('../models');
const { authRequired } = require('../middleware/auth');
const { hashPassword, verifyPassword, validateNewPassword } = require('../utils/password');
const { logAudit } = require('../utils/auditLogger');
const { tenantEnforce } = require('../middleware/tenant');
const { upload } = require('../upload');
const { calculateSalary, generatePayslipPDF } = require('../services/payrollService');
const { enrollFace } = require('../services/awsService');

const router = express.Router();

router.use(authRequired);
router.use(tenantEnforce);

// Attendance-aware salary compute for the logged-in user
// Attendance-aware salary compute for the logged-in user
router.get('/salary-compute', async (req, res) => {
  try {
    const monthKey = String(req.query.monthKey || req.query.month || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ success: false, message: 'monthKey (YYYY-MM) required' });
    }
    const result = await calculateSalary(req.user.id, monthKey);
    return res.json({
      ...result,
      paymentStatus: result.paymentStatus || 'DUE',
      paidAmount: result.paidAmount || 0
    });
  } catch (error) {
    console.error('Salary compute error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Download Payslip PDF
router.get('/payslip', async (req, res) => {
  try {
    const monthKey = String(req.query.monthKey || req.query.month || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ success: false, message: 'monthKey (YYYY-MM) required' });
    }

    // 1. Check if persistent file exists (unless regeneration is requested)
    const regenerate = req.query.regenerate === 'true';
    const cycle = await PayrollCycle.findOne({ where: { monthKey } });
    if (cycle && !regenerate) {
      const line = await PayrollLine.findOne({ where: { cycleId: cycle.id, userId: req.user.id } });
      if (line && line.payslipPath) {
        // Resolve absolute path (stored as relative /uploads/...)
        const safeRelativePath = line.payslipPath.replace(/^[\/\\]/, '');
        const absolutePath = path.join(__dirname, '../../', safeRelativePath);
        if (fs.existsSync(absolutePath)) {
          // Redirect to value stored in DB (e.g. /uploads/payslips/...)
          const fullUrl = `${req.protocol}://${req.get('host')}${line.payslipPath}`;
          return res.redirect(fullUrl);
        }
      }
    } else if (cycle && regenerate) {
      // Clear path so it generates fresh
      await PayrollLine.update({ payslipPath: null }, { where: { cycleId: cycle.id, userId: req.user.id } });
    }

    // 2. Fallback: Generate on-the-fly
    const data = await calculateSalary(req.user.id, monthKey);
    const pdfBuffer = await generatePayslipPDF(data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Payslip-${monthKey}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Payslip generation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate payslip' });
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

    // Ensure global uniqueness — phone cannot be used if already active in any organization
    const existing = await User.findOne({ where: { phone: nextPhone, active: true, id: { [Op.ne]: me.id } } });
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

router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword and newPassword required' });
    }

    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const me = await User.findByPk(req.user.id);
    if (!me) return res.status(404).json({ success: false, message: 'User not found' });

    const ok = await verifyPassword(currentPassword, me.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const passwordHash = await hashPassword(newPassword);
    const normalizedPhone = String(me.phone || '').replace(/[^0-9]/g, '').slice(-10) || me.phone;
    await User.update(
      { passwordHash, failedLoginAttempts: 0, lockoutUntil: null },
      { where: { phone: String(me.phone) } }
    );
    if (normalizedPhone && String(normalizedPhone) !== String(me.phone)) {
      await User.update(
        { passwordHash, failedLoginAttempts: 0, lockoutUntil: null },
        { where: { phone: String(normalizedPhone) } }
      );
    }

    logAudit({
      req,
      action: 'PASSWORD_CHANGE',
      remarks: `User ${me.phone} changed password from profile.`,
      overrides: { userId: me.id, orgAccountId: me.orgAccountId, userPhone: me.phone }
    });

    return res.json({ success: true, message: 'Password updated' });
  } catch (e) {
    console.error('[me/password] EXCEPTION:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to update password' });
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

    const shiftService = require('../services/shiftService');
    const t = await shiftService.getEffectiveShiftTemplate(user.id, todayKey);

    if (!t) {
      return res.json({ success: true, shift: null });
    }

    return res.json({
      success: true,
      shift: {
        assignmentId: null,
        effectiveFrom: todayKey,
        effectiveTo: null,
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
      || (await StaffProfile.create({ userId: user.id, orgAccountId: user.orgAccountId, phone: user.phone }));

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
      orgAccountId: (profile.orgAccountId === null || profile.orgAccountId === undefined) ? user.orgAccountId : profile.orgAccountId,
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
      || (await StaffProfile.create({ userId: user.id, orgAccountId: user.orgAccountId, phone: user.phone }));

    await profile.update({
      orgAccountId: (profile.orgAccountId === null || profile.orgAccountId === undefined) ? user.orgAccountId : profile.orgAccountId,
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
      || (await StaffProfile.create({ userId: user.id, orgAccountId: user.orgAccountId, phone: user.phone }));

    await profile.update({
      orgAccountId: (profile.orgAccountId === null || profile.orgAccountId === undefined) ? user.orgAccountId : profile.orgAccountId,
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
      || (await StaffProfile.create({ userId: user.id, orgAccountId: user.orgAccountId, phone: user.phone }));

    const photoUrl = `/uploads/${req.file.filename}`;
    await profile.update({
      orgAccountId: (profile.orgAccountId === null || profile.orgAccountId === undefined) ? user.orgAccountId : profile.orgAccountId,
      photoUrl
    });

    // FACE ENROLLMENT: Update AWS Rekognition collection
    try {
      const fullPhotoUrl = `${req.protocol}://${req.get('host')}${photoUrl}`;
      const faceId = await enrollFace(fullPhotoUrl, user.id);
      if (faceId) {
        await profile.update({ faceId });
        console.log(`AWS Rekognition: Re-enrolled face for staff ${user.id} (Mobile Update)`);
      }
    } catch (faceError) {
      console.error(`AWS Rekognition: Face enrollment failed for staff ${user.id} (Mobile Update):`, faceError.message);
      // We don't fail the request since photo is already uploaded
    }

    return res.json({ success: true, photoUrl });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
});

// Get user's payroll payment status
router.get('/payroll-status', async (req, res) => {
  try {
    const userId = req.user.id;
    const { PayrollCycle, PayrollLine } = require('../models');
    const monthKey = (req.query?.monthKey || req.query?.month || '').toString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ success: false, message: 'monthKey (YYYY-MM) required' });
    }

    const cycle = await PayrollCycle.findOne({ where: { monthKey } });
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

// Get all expense claims for current logged-in user
router.get('/expenses', async (req, res) => {
  try {
    const userId = req.user.id;
    const claims = await ExpenseClaim.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    return res.json({ success: true, claims });
  } catch (e) {
    console.error('List my expenses error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch expense claims' });
  }
});

// Create expense claim for current logged-in user
router.post('/expenses', upload.any(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { expenseType, expenseDate, billNumber, amount, description, travelFrom, travelTo, mode } = req.body || {};

    let itemsArray = null;
    let amt = 0;
    let attachmentUrl = null;
    let billNo = billNumber || null;
    let desc = description || null;
    let fromLoc = travelFrom || null;
    let toLoc = travelTo || null;
    let transportMode = mode || null;

    if (req.body.items) {
      try {
        itemsArray = JSON.parse(req.body.items);
      } catch (e) {
        itemsArray = [];
      }
    }

    if (Array.isArray(itemsArray) && itemsArray.length > 0) {
      itemsArray.forEach((item, index) => {
        const file = (req.files || []).find(f => f.fieldname === `attachment_${index}`);
        if (file) {
          const rel = path.join('uploads', 'claims', file.filename).replace(/\\/g, '/');
          item.attachmentUrl = `/${rel}`;
        }
      });
      amt = itemsArray.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      billNo = itemsArray[0]?.billNumber || null;
      desc = description || itemsArray[0]?.description || null;
      fromLoc = itemsArray[0]?.travelFrom || null;
      toLoc = itemsArray[0]?.travelTo || null;
      transportMode = itemsArray[0]?.mode || null;
      attachmentUrl = itemsArray[0]?.attachmentUrl || null;
    } else {
      amt = Number(amount);
      const legacyFile = (req.files || []).find(f => f.fieldname === 'attachment');
      if (legacyFile) {
        const rel = path.join('uploads', 'claims', legacyFile.filename).replace(/\\/g, '/');
        attachmentUrl = `/${rel}`;
      }
      itemsArray = [{
        amount: amt,
        billNumber: billNo,
        description: desc,
        travelFrom: fromLoc,
        travelTo: toLoc,
        mode: transportMode,
        attachmentUrl: attachmentUrl
      }];
    }

    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });

    const row = await ExpenseClaim.create({
      userId,
      claimId: `EC-${Date.now()}`,
      expenseType: expenseType || null,
      expenseDate: expenseDate || new Date().toISOString().slice(0, 10),
      billNumber: billNo,
      amount: amt,
      description: desc,
      attachmentUrl,
      status: 'pending',
      orgAccountId: req.user.orgAccountId || null,
      travelFrom: fromLoc,
      travelTo: toLoc,
      mode: transportMode,
      items: itemsArray,
    });

    return res.json({ success: true, claim: row });
  } catch (e) {
    console.error('Create my expense error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create expense claim' });
  }
});

// Update pending expense claim for current logged-in user
router.put('/expenses/:id', upload.any(), async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid expense claim' });
    }

    const row = await ExpenseClaim.findOne({ where: { id, userId } });
    if (!row) {
      return res.status(404).json({ success: false, message: 'Expense claim not found' });
    }
    if (row.status !== 'pending') {
      return res.status(403).json({ success: false, message: 'Approved expense cannot be edited' });
    }

    const { expenseType, expenseDate, billNumber, amount, description, travelFrom, travelTo, mode } = req.body || {};

    let itemsArray = null;
    let amt = 0;
    let attachmentUrl = row.attachmentUrl;
    let billNo = billNumber || null;
    let desc = description || null;
    let fromLoc = travelFrom || null;
    let toLoc = travelTo || null;
    let transportMode = mode || null;

    if (req.body.items) {
      try {
        itemsArray = JSON.parse(req.body.items);
      } catch (e) {
        itemsArray = [];
      }
    }

    if (Array.isArray(itemsArray) && itemsArray.length > 0) {
      itemsArray.forEach((item, index) => {
        const file = (req.files || []).find(f => f.fieldname === `attachment_${index}`);
        if (file) {
          const rel = path.join('uploads', 'claims', file.filename).replace(/\\/g, '/');
          item.attachmentUrl = `/${rel}`;
        }
      });
      amt = itemsArray.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      billNo = itemsArray[0]?.billNumber || null;
      desc = itemsArray[0]?.description || null;
      fromLoc = itemsArray[0]?.travelFrom || null;
      toLoc = itemsArray[0]?.travelTo || null;
      transportMode = itemsArray[0]?.mode || null;
      attachmentUrl = itemsArray[0]?.attachmentUrl || null;
    } else {
      amt = Number(amount);
      const legacyFile = (req.files || []).find(f => f.fieldname === 'attachment');
      if (legacyFile) {
        const rel = path.join('uploads', 'claims', legacyFile.filename).replace(/\\/g, '/');
        attachmentUrl = `/${rel}`;
      }
      itemsArray = [{
        amount: amt,
        billNumber: billNo,
        description: desc,
        travelFrom: fromLoc,
        travelTo: toLoc,
        mode: transportMode,
        attachmentUrl: attachmentUrl
      }];
    }

    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount required' });
    }

    await row.update({
      expenseType: expenseType || null,
      expenseDate: expenseDate ? String(expenseDate).slice(0, 10) : row.expenseDate,
      billNumber: billNo,
      amount: amt,
      description: desc,
      attachmentUrl,
      travelFrom: fromLoc,
      travelTo: toLoc,
      mode: transportMode,
      items: itemsArray,
    });

    return res.json({ success: true, claim: row });
  } catch (e) {
    console.error('Update my expense error:', e);
    return res.status(500).json({ success: false, message: 'Failed to update expense claim' });
  }
});

// Get earliest salary month for navigation limit
router.get('/salary-history-range', async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await StaffProfile.findOne({ where: { userId } });
    const joiningMonth = profile?.dateOfJoining ? profile.dateOfJoining.slice(0, 7) : null;

    // Find earliest PayrollLine
    const earliestLine = await PayrollLine.findOne({
      where: { userId },
      include: [{ model: PayrollCycle, as: 'cycle' }],
      order: [[{ model: PayrollCycle, as: 'cycle' }, 'monthKey', 'ASC']]
    });

    const earliestManualMonth = earliestLine?.cycle?.monthKey || null;

    let finalStart = joiningMonth;
    if (earliestManualMonth && (!finalStart || earliestManualMonth < finalStart)) {
      finalStart = earliestManualMonth;
    }

    return res.json({ success: true, earliestMonth: finalStart });
  } catch (e) {
    console.error('Earliest salary month error:', e);
    return res.status(500).json({ success: false, message: 'Failed to find history range' });
  }
});

// List all staff in the same organization (for meetings etc)
router.get('/staff-list', async (req, res) => {
  try {
    const staff = await StaffProfile.findAll({
      where: { orgAccountId: req.user.orgAccountId },
      attributes: ['userId', 'name', 'designation', 'staffId', 'email'],
      include: [{ model: User, as: 'user', attributes: ['phone', 'active'], where: { active: true } }]
    });

    return res.json({ success: true, staff });
  } catch (e) {
    console.error('Staff list error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load staff list' });
  }
});


// ==================== STAFF DASHBOARD SUMMARY ====================
router.get('/staff-dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const orgAccountId = req.user.orgAccountId;

    // 1. Pending Approvals:
    let pendingLeaves = 0;
    let pendingRegularizations = 0;
    let pendingExpenses = 0;

    try {
      if (LeaveRequest) {
        pendingLeaves = await LeaveRequest.count({ where: { userId, status: 'PENDING' } });
      }
    } catch (_) {}

    try {
      if (AttendanceRegularization) {
        pendingRegularizations = await AttendanceRegularization.count({ where: { userId, orgAccountId, status: 'PENDING' } });
      }
    } catch (_) {}

    try {
      if (ExpenseClaim) {
        pendingExpenses = await ExpenseClaim.count({ where: { userId, status: 'pending' } });
      }
    } catch (_) {}

    // 2. Advances:
    let advances = [];
    let totalAdvanceBalance = 0;
    try {
      if (StaffAdvance) {
        advances = await StaffAdvance.findAll({
          where: { staffId: userId, orgAccountId, status: 'pending' },
          order: [['advanceDate', 'DESC']]
        });
        totalAdvanceBalance = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      }
    } catch (_) {}

    // 3. Expenses:
    let myExpenses = [];
    try {
      if (ExpenseClaim) {
        myExpenses = await ExpenseClaim.findAll({
          where: { userId, orgAccountId },
          limit: 5,
          order: [['createdAt', 'DESC']]
        });
      }
    } catch (_) {}

    // 4. Tasks (Activities):
    let recentTasks = [];
    try {
      const { Activity } = require('../models');
      if (Activity) {
        recentTasks = await Activity.findAll({
          where: { userId, orgAccountId },
          limit: 5,
          order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });
      }
    } catch (_) {}

    // 5. Sales summary if permitted
    let salesMetrics = null;
    try {
      const { SalesOrder, CustomerVisit } = require('../models');
      if (SalesOrder) {
        const orderCount = await SalesOrder.count({ where: { userId, orgAccountId } });
        salesMetrics = { orderCount };
      }
    } catch (_) {}

    return res.json({
      success: true,
      pendingApprovals: {
        total: (pendingLeaves || 0) + (pendingRegularizations || 0) + (pendingExpenses || 0),
        leaves: pendingLeaves || 0,
        regularizations: pendingRegularizations || 0,
        expenses: pendingExpenses || 0,
      },
      advance: {
        balance: totalAdvanceBalance,
        pendingCount: advances.length,
        items: advances.slice(0, 5),
      },
      expenses: {
        recent: myExpenses,
      },
      tasks: {
        recent: recentTasks,
      },
      sales: salesMetrics
    });
  } catch (err) {
    console.error('Error fetching staff dashboard data:', err);
    return res.status(500).json({ success: false, message: 'Failed to load staff dashboard data' });
  }
});

// ==========================================
// STAFF ADVANCES & LOANS API
// ==========================================

// GET /me/advances - List all advances for logged in staff with dynamic repayment calculations
router.get('/advances', async (req, res) => {
  try {
    const dayjs = require('dayjs');
    const staffId = req.user.id;
    const orgId = req.tenantOrgAccountId;

    const rows = await StaffAdvance.findAll({
      where: { staffId, orgAccountId: orgId },
      order: [['advanceDate', 'DESC'], ['createdAt', 'DESC']]
    });

    // Check generated/locked payroll cycles for accurate repayment progress
    const generatedCycles = await PayrollCycle.findAll({
      where: {
        orgAccountId: orgId,
        [Op.or]: [
          { status: { [Op.in]: ['LOCKED', 'PAID'] } },
          { '$lines.id$': { [Op.ne]: null } }
        ]
      },
      include: [{ model: PayrollLine, as: 'lines', attributes: ['id'], required: false }],
      attributes: ['monthKey', 'status']
    });
    const generatedMonths = new Set(generatedCycles.map(c => c.monthKey));

    let totalAdvanceAmount = 0;
    let totalRecoveredAmount = 0;
    let totalOutstandingBalance = 0;
    let pendingRequestsCount = 0;

    const enriched = rows.map((adv) => {
      const plain = adv.toJSON();
      const total = Number(plain.amount || 0);

      let deductionsList = plain.deductions;
      while (typeof deductionsList === 'string') {
        try { deductionsList = JSON.parse(deductionsList); } catch (e) { break; }
      }

      let recovered = 0;
      if (Array.isArray(deductionsList) && deductionsList.length > 0) {
        const updatedDeductions = deductionsList.map((d) => {
          const isDeducted = generatedMonths.has(d.month) || d.status === 'deducted';
          if (isDeducted) recovered += Number(d.amount || 0);
          return {
            ...d,
            status: isDeducted ? 'deducted' : 'pending'
          };
        });
        const allDeducted = updatedDeductions.every(d => d.status === 'deducted');
        plain.deductions = updatedDeductions;
        if (allDeducted) plain.status = 'deducted';
      } else {
        const isDeducted = generatedMonths.has(plain.deductionMonth) || plain.status === 'deducted';
        if (isDeducted) recovered = total;
        if (isDeducted) plain.status = 'deducted';
      }

      const outstanding = plain.status === 'cancelled' ? 0 : Math.max(0, total - recovered);

      plain.totalAmount = total;
      plain.recoveredAmount = recovered;
      plain.outstandingBalance = outstanding;

      if (plain.status !== 'cancelled') {
        totalAdvanceAmount += total;
        totalRecoveredAmount += recovered;
        totalOutstandingBalance += outstanding;
      }

      if (plain.status === 'pending') {
        pendingRequestsCount++;
      }

      return plain;
    });

    return res.json({
      success: true,
      advances: enriched,
      summary: {
        totalAdvanceAmount,
        totalRecoveredAmount,
        totalOutstandingBalance,
        pendingRequestsCount,
        totalCount: rows.length
      }
    });
  } catch (error) {
    console.error('Error fetching staff advances:', error);
    return res.status(500).json({ success: false, message: 'Failed to load advances' });
  }
});

// POST /me/advances - Apply for a new advance
router.post('/advances', async (req, res) => {
  try {
    const dayjs = require('dayjs');
    const staffId = req.user.id;
    const orgId = req.tenantOrgAccountId;
    const { advanceType, amount, advanceDate, reason, deductionMonth, installmentsCount } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid advance amount greater than 0' });
    }

    const todayStr = dayjs().format('YYYY-MM-DD');
    const finalAdvanceDate = advanceDate ? dayjs(advanceDate).format('YYYY-MM-DD') : todayStr;
    const typeLabel = advanceType ? String(advanceType).trim() : 'Salary Advance';
    const noteContent = reason ? `[${typeLabel}] ${String(reason).trim()}` : `[${typeLabel}] Advance request`;

    let finalDeductions = null;
    let finalDeductionMonth = deductionMonth ? String(deductionMonth).slice(0, 7) : dayjs().add(1, 'month').format('YYYY-MM');

    // Build installment plan if installmentsCount > 1
    const count = parseInt(installmentsCount, 10);
    if (count && count > 1) {
      finalDeductions = [];
      const installmentAmt = Math.round((numAmount / count) * 100) / 100;
      let startMonth = dayjs(finalDeductionMonth, 'YYYY-MM');
      if (!startMonth.isValid()) startMonth = dayjs().add(1, 'month');

      let accumulated = 0;
      for (let i = 0; i < count; i++) {
        const mKey = startMonth.add(i, 'month').format('YYYY-MM');
        const amt = i === count - 1 ? Math.round((numAmount - accumulated) * 100) / 100 : installmentAmt;
        accumulated += amt;
        finalDeductions.push({
          month: mKey,
          amount: amt,
          status: 'pending'
        });
      }
    }

    const advance = await StaffAdvance.create({
      staffId,
      orgAccountId: orgId,
      amount: numAmount,
      advanceDate: finalAdvanceDate,
      deductionMonth: finalDeductionMonth,
      status: 'pending',
      notes: noteContent,
      deductions: finalDeductions,
      createdBy: staffId
    });

    return res.json({
      success: true,
      message: 'Advance request submitted successfully for approval',
      advance
    });
  } catch (error) {
    console.error('Error applying for advance:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to submit advance request' });
  }
});

// DELETE /me/advances/:id - Cancel a pending advance request
router.delete('/advances/:id', async (req, res) => {
  try {
    const staffId = req.user.id;
    const orgId = req.tenantOrgAccountId;
    const { id } = req.params;

    const row = await StaffAdvance.findOne({
      where: { id, staffId, orgAccountId: orgId }
    });

    if (!row) {
      return res.status(404).json({ success: false, message: 'Advance request not found' });
    }

    if (row.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending advance requests can be cancelled' });
    }

    await row.update({ status: 'cancelled', updatedBy: staffId });

    return res.json({ success: true, message: 'Advance request cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling advance request:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel advance request' });
  }
});

module.exports = router;
