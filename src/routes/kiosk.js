const express = require('express');
const multer = require('multer');
const { searchFace, listFaces } = require('../services/awsService');
const { User, StaffProfile, Attendance, AppSetting, StaffAttendanceAssignment, AttendanceTemplate, StaffShiftAssignment, ShiftTemplate, StaffRoster } = require('../models');
const { Op } = require('sequelize');

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
      action = 'IN';
    } else if (record.punchedInAt && !record.punchedOutAt) {
      // PUNCH OUT - Calculate status and total work hours
      const inAt = new Date(record.punchedInAt);
      const shiftTpl = await getEffectiveShiftTemplate(userId, dateKey);

      const breakTotalSeconds = Number(record.breakTotalSeconds || 0);
      const totalWorkSeconds = diffSeconds(inAt, now) - breakTotalSeconds;
      const totalWorkMinutes = Math.floor(totalWorkSeconds / 60);
      const totalWorkHours = totalWorkSeconds / 3600;

      let status = 'present';
      let overtimeMinutes = 0;

      if (shiftTpl) {
        if (Number.isFinite(Number(shiftTpl.overtimeStartMinutes)) && totalWorkMinutes > shiftTpl.overtimeStartMinutes) {
          overtimeMinutes = totalWorkMinutes - shiftTpl.overtimeStartMinutes;
          status = 'overtime';
        } else if (Number.isFinite(Number(shiftTpl.halfDayThresholdMinutes)) && totalWorkMinutes < shiftTpl.halfDayThresholdMinutes) {
          status = 'half_day';
        }
      }

      await record.update({
        punchedOutAt: now,
        status: status.toUpperCase(),
        totalWorkHours,
        overtimeMinutes,
        source: 'kiosk'
      });
      action = 'OUT';
      responseData = { totalWorkHours: totalWorkHours.toFixed(2), status };
    } else if (record.punchedOutAt) {
      return res.json({
        success: true,
        alreadyDone: true,
        message: `Already punched out for today, ${staff.profile?.name || 'Staff'}.`,
        staffName: staff.profile?.name
      });
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
