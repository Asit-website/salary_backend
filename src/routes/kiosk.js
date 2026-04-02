const express = require('express');
const multer = require('multer');
const { searchFace, listFaces } = require('../services/awsService');
const { User, StaffProfile, Attendance, AppSetting, StaffAttendanceAssignment, AttendanceTemplate, StaffShiftAssignment, ShiftTemplate, StaffRoster, OrgAccount } = require('../models');
const { Op } = require('sequelize');
const earlyOvertimeService = require('../services/earlyOvertimeService');
const latePunchInService = require('../services/latePunchInService');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Security Middleware for Kiosk
const kioskAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.KIOSK_API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized Kiosk Access' });
  }
  next();
};

// ... Utility functions (todayKey, diffSeconds, getEffectiveShiftTemplate) ...
function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function diffSeconds(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 1000));
}

async function getEffectiveShiftTemplate(userId, dateKey) {
  try {
    const where = { userId };
    if (dateKey) {
      where.effectiveFrom = { [Op.lte]: dateKey };
      where[Op.or] = [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: dateKey } }];
    }
    const roster = await StaffRoster.findOne({ where: { userId, date: dateKey } });
    if (roster && roster.status === 'SHIFT' && roster.shiftTemplateId) {
      const tpl = await ShiftTemplate.findByPk(roster.shiftTemplateId);
      if (tpl && tpl.active !== false) return tpl;
    }
    const asg = await StaffShiftAssignment.findOne({ where, order: [['effectiveFrom', 'DESC']] });
    if (asg) {
      const tpl = await ShiftTemplate.findByPk(asg.shiftTemplateId);
      if (tpl && tpl.active !== false) return tpl;
    }
    const user = await User.findByPk(userId, { include: [{ model: StaffProfile, as: 'profile' }] });
    if (user?.shiftTemplateId) {
      const tpl = await ShiftTemplate.findByPk(user.shiftTemplateId);
      if (tpl && tpl.active !== false) return tpl;
    }
    if (user?.profile?.shiftSelection) {
      const tpl = await ShiftTemplate.findOne({ where: { id: Number(user.profile.shiftSelection), active: true } });
      if (tpl) return tpl;
    }
    return null;
  } catch (_) { return null; }
}

// Diagnostic API: List all enrolled faces
router.get('/list-faces', kioskAuth, async (req, res) => {
  try {
    const faces = await listFaces();

    // Fetch user details for these faces to make it readable
    const userIds = faces.map(f => f.ExternalImageId).filter(Boolean);
    const users = await User.findAll({
      where: { id: userIds },
      include: [{ model: StaffProfile, as: 'profile' }]
    });

    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = u.profile?.name || 'Unknown';
    });

    const detailedFaces = faces.map(f => ({
      faceId: f.FaceId,
      userId: f.ExternalImageId,
      staffName: userMap[f.ExternalImageId] || 'Unknown',
      enrolledAt: f.IndexFacesModelVersion
    }));

    res.json({ success: true, count: detailedFaces.length, faces: detailedFaces });
  } catch (error) {
    console.error('Kiosk list-faces error:', error);
    res.status(500).json({ success: false, message: 'Failed to list faces: ' + error.message });
  }
});

router.post('/face-recognition', kioskAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image captured' });
    }

    // 1. Identify Face via AWS Rekognition
    const match = await searchFace(req.file.buffer);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Face not recognized. Please make sure you are enrolled.' });
    }

    const userId = match.userId;
    const staff = await User.findByPk(userId, {
      include: [{ model: StaffProfile, as: 'profile' }]
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: `Staff not found for ID: ${userId}` });
    }
    if (!staff.active) {
      return res.status(403).json({ success: false, message: `Staff member (${staff.profile?.name}) is currently inactive` });
    }

    const dateKey = todayKey();
    const now = new Date();

    // 2. Check current attendance record
    let record = await Attendance.findOne({ where: { userId, date: dateKey } });

    let action = '';
    let responseData = {};

    if (!record) {
      // PUNCH IN
      record = await Attendance.create({
        userId,
        orgAccountId: staff.orgAccountId,
        date: dateKey,
        punchedInAt: now,
        status: 'PRESENT',
        source: 'kiosk'
      });
      
      // Calculate Early Overtime if applicable
      try {
        const orgAccount = await OrgAccount.findByPk(staff.orgAccountId);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const eotResult = await earlyOvertimeService.calculateEarlyOvertime({
          userId: staff.id,
          orgAccountId: staff.orgAccountId,
          date: dateKey,
          punchedInAt: now
        }, orgAccount, now, daysInMonth);

        if (eotResult && eotResult.earlyOvertimeMinutes > 0) {
          await record.update({
            earlyOvertimeMinutes: eotResult.earlyOvertimeMinutes,
            earlyOvertimeAmount: eotResult.earlyOvertimeAmount,
            earlyOvertimeRuleId: eotResult.ruleId || eotResult.earlyOvertimeRuleId,
            status: 'OVERTIME'
          });
        }
      } catch (eotErr) {
        console.error('Kiosk Early OT calculation error:', eotErr);
      }

      // Calculate Late Punch-In Penalty if applicable
      try {
        const orgAccount = await OrgAccount.findByPk(staff.orgAccountId);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const lpResult = await latePunchInService.calculateLatePenalty({
          userId: staff.id,
          orgAccountId: staff.orgAccountId,
          date: dateKey,
          punchedInAt: now
        }, orgAccount, now, daysInMonth);

        if (lpResult && lpResult.isLate) {
          await record.update({
            latePunchInMinutes: lpResult.latePunchInMinutes,
            latePunchInAmount: lpResult.latePunchInAmount,
            latePunchInRuleId: lpResult.latePunchInRuleId,
            isLate: true
          });
        }
      } catch (lpErr) {
        console.error('Kiosk Late Penalty calculation error:', lpErr);
      }

      action = 'IN';
    } else {
      // PUNCH OUT (or UPDATE PUNCH OUT) - Calculate status and total work hours
      const inAt = new Date(record.punchedInAt);
      const shiftTpl = await getEffectiveShiftTemplate(userId, dateKey);

      const breakTotalSeconds = Number(record.breakTotalSeconds || 0);
      const totalWorkSeconds = diffSeconds(inAt, now) - breakTotalSeconds;
      const totalWorkMinutes = Math.floor(totalWorkSeconds / 60);
      const totalWorkHours = totalWorkSeconds / 3600;

      let status = 'present';
      let overtimeMinutes = 0;

      const { OrgAccount } = require('../models');
      const { calculateOvertime } = require('../services/overtimeService');
      const earlyExitService = require('../services/earlyExitService');

      const orgAccount = await OrgAccount.findByPk(staff.orgAccountId);
      
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      
      // 1. Overtime Calculation
      const otData = await calculateOvertime({ 
        ...record.toJSON(), 
        userId: staff.id,
        orgAccountId: staff.orgAccountId,
        punchedOutAt: now,
        totalWorkHours 
      }, orgAccount, now, daysInMonth);

      // 2. Early Exit Calculation
      const eeData = await earlyExitService.calculateEarlyExit({
        ...record.toJSON(),
        userId: staff.id,
        orgAccountId: staff.orgAccountId,
        punchedOutAt: now
      }, orgAccount, now, daysInMonth);

      // 3. Break Deduction Calculation
      const breakService = require('../services/breakService');
      const breakResult = await breakService.calculateBreakDeduction(record, orgAccount, now, daysInMonth);

      let finalStatus = otData.status || 'PRESENT';
      if (record.earlyOvertimeMinutes > 0) {
        finalStatus = 'OVERTIME';
      }
      if (staff.shiftTemplateId) {
        // ... existing status logic
      }

      await record.update({
        punchedOutAt: now,
        status: finalStatus,
        totalWorkHours,
        overtimeMinutes: otData.overtimeMinutes || 0,
        overtimeAmount: otData.overtimeAmount || 0,
        overtimeRuleId: otData.overtimeRuleId || null,
        earlyExitMinutes: eeData.earlyExitMinutes || 0,
        earlyExitAmount: eeData.earlyExitAmount || 0,
        earlyExitRuleId: eeData.earlyExitRuleId || null,
        breakDeductionAmount: breakResult.breakDeductionAmount || 0,
        breakRuleId: breakResult.breakRuleId || null,
        excessBreakMinutes: breakResult.excessBreakMinutes || 0,
        source: 'kiosk'
      });
      action = 'OUT';
      responseData = { 
        totalWorkHours: totalWorkHours.toFixed(2), 
        status: finalStatus, 
        overtimeAmount: otData.overtimeAmount,
        overtimeMinutes: otData.overtimeMinutes
      };
    }

    return res.json({
      success: true,
      action,
      staffName: staff.profile?.name,
      time: now.toLocaleTimeString(),
      message: `Successfully punched ${action === 'IN' ? 'in' : 'out'} for ${staff.profile?.name}`,
      ...responseData
    });

  } catch (error) {
    console.error('Kiosk face-recognition error:', error);
    
    // AWS throws InvalidParameterException if no faces are detected in the image
    if (error.name === 'InvalidParameterException' || error.message.includes('No face detected')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Face not detected in frame. Please look directly at the camera.' 
      });
    }
    
    // Default 500 error with message
    return res.status(500).json({ 
      success: false, 
      message: 'Identification failed: ' + (error.message || 'Server error')
    });
  }
});

module.exports = router;
