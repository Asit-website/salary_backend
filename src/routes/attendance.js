const express = require('express');
const { Op } = require('sequelize');
const puppeteer = require('puppeteer');

const { Attendance, LeaveRequest, AppSetting, AttendanceTemplate, StaffAttendanceAssignment, StaffShiftAssignment, ShiftTemplate, StaffHolidayAssignment, HolidayTemplate, HolidayDate, StaffGeofenceAssignment, GeofenceTemplate, GeofenceSite, LocationPing } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { upload } = require('../upload');

const router = express.Router();

router.use(authRequired);
router.use(requireRole(['staff']));

function todayKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function hasApprovedLeave(userId, dateKey) {
  try {
    const row = await LeaveRequest.findOne({
      where: {
        userId,
        status: 'APPROVED',
        startDate: { [Op.lte]: dateKey },
        endDate: { [Op.gte]: dateKey },
      },
      order: [['id', 'DESC']],
    });
    return !!row;
  } catch (_) { return false; }
}

async function getAssignedGeofenceSites(userId, dateKey) {
  try {
    const where = { userId };
    if (dateKey) where.effectiveFrom = { [Op.lte]: dateKey };
    const asg = await StaffGeofenceAssignment.findOne({ where, order: [['effectiveFrom', 'DESC']], include: [{ model: GeofenceTemplate, as: 'template', include: [{ model: GeofenceSite, as: 'sites' }] }] });
    if (!asg || asg.active === false || !asg.template || asg.template.active === false) return [];
    if (dateKey && asg.effectiveTo && String(asg.effectiveTo) < String(dateKey)) return [];
    const sites = Array.isArray(asg.template.sites) ? asg.template.sites : [];
    return sites.filter(s => s && s.active !== false);
  } catch (_) { return []; }
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function diffSeconds(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 1000));
}

function parseMonth(monthStr) {
  const m = String(monthStr || '').trim();
  if (!/^\d{4}-\d{2}$/.test(m)) return null;
  const [y, mo] = m.split('-').map((x) => Number(x));
  if (!y || !mo || mo < 1 || mo > 12) return null;
  return { y, mo };
}

function isoDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return x;
}

function toHhMmSs(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function cmpTime(a, b) {
  // compare "HH:MM:SS" strings lexicographically
  return String(a).localeCompare(String(b));
}

async function getEffectiveShiftTemplate(userId, dateKey) {
  try {
    const where = { userId };
    if (dateKey) {
      where.effectiveFrom = { [Op.lte]: dateKey };
      where[Op.or] = [
        { effectiveTo: null },
        { effectiveTo: { [Op.gte]: dateKey } },
      ];
    }
    const asg = await StaffShiftAssignment.findOne({ where, order: [['effectiveFrom', 'DESC']] });
    if (!asg) return null;
    const tpl = await ShiftTemplate.findByPk(asg.shiftTemplateId);
    if (!tpl || tpl.active === false) return null;
    return tpl;
  } catch (_) { return null; }
}

async function getEffectiveTemplate(userId) {
  try {
    const asg = await StaffAttendanceAssignment.findOne({ where: { userId } });
    if (!asg) return null;
    const tpl = await AttendanceTemplate.findByPk(asg.attendanceTemplateId);
    return tpl || null;
  } catch (_) { return null; }
}

async function getAssignedHolidayTemplate(userId, dateKey) {
  try {
    const where = { userId };
    if (dateKey) {
      where.effectiveFrom = { [Op.lte]: dateKey };
    }
    const asg = await StaffHolidayAssignment.findOne({ where, order: [['effectiveFrom', 'DESC']] });
    if (!asg) return null;
    if (dateKey && asg.effectiveTo && String(asg.effectiveTo) < String(dateKey)) return null;
    const tpl = await HolidayTemplate.findByPk(asg.holidayTemplateId, { include: [{ model: HolidayDate, as: 'holidays' }] });
    return tpl || null;
  } catch (_) { return null; }
}

async function isPaidHoliday(userId, dateKey) {
  try {
    const tpl = await getAssignedHolidayTemplate(userId, dateKey);
    if (!tpl) return false;
    const list = Array.isArray(tpl.holidays) ? tpl.holidays : [];
    return list.some(h => h && h.active !== false && String(h.date) === String(dateKey));
  } catch (_) { return false; }
}

async function getRequiredWorkSecondsFor(userId, dateKey) {
  try {
    // If a shift is assigned, prefer its requirements
    if (userId) {
      const tpl = await getEffectiveShiftTemplate(userId, dateKey || todayKey());
      if (tpl) {
        if (tpl.shiftType === 'open' && Number.isFinite(Number(tpl.workMinutes))) {
          const mins = Number(tpl.workMinutes) || 0;
          if (mins > 0) return mins * 60;
        }
        if ((tpl.shiftType === 'fixed' || tpl.shiftType === 'rotational') && tpl.startTime && tpl.endTime) {
          // compute duration in minutes; ignore overnight wrap for simplicity
          const [sh, sm] = String(tpl.startTime).split(':').map(Number);
          const [eh, em] = String(tpl.endTime).split(':').map(Number);
          const startM = sh * 60 + sm;
          const endM = eh * 60 + em;
          let diff = endM - startM;
          if (diff < 0) diff += 24 * 60; // handle overnight
          const buf = Number(tpl.bufferMinutes || 0);
          const mins = Math.max(0, diff - (Number.isFinite(buf) ? buf : 0));
          if (mins > 0) return mins * 60;
        }
      }
    }
    const s = await AppSetting.findOne({ where: { key: 'required_work_hours' } });
    const hours = Number(s?.value || 8);
    if (!Number.isFinite(hours) || hours <= 0) return 8 * 60 * 60;
    return Math.round(hours * 60 * 60);
  } catch (e) {
    return 8 * 60 * 60;
  }
}

// Compute effective working seconds based on template rule
function computeEffectiveWorkingSeconds({ totalWorkSeconds, actualBreakSeconds, requiredWorkSeconds, maxBreakMinutes, effectiveHoursRule }) {
  const maxBreakSeconds = (Number(maxBreakMinutes) || 0) * 60;
  const paidBreakSeconds = Math.max(0, Math.min(actualBreakSeconds || 0, maxBreakSeconds));

  switch (effectiveHoursRule) {
    case 'total_time':
      // No deductions
      return Math.max(0, totalWorkSeconds);
    case 'deduct_overtime':
      // Cap at required work seconds (ignore overtime)
      return Math.max(0, Math.min(totalWorkSeconds, requiredWorkSeconds));
    case 'deduct_all_breaks':
      // Deduct all breaks
      return Math.max(0, totalWorkSeconds - (actualBreakSeconds || 0));
    case 'deduct_overtime_and_paid_breaks':
      // Cap and deduct paid (allowed) breaks
      return Math.max(0, Math.min(totalWorkSeconds - paidBreakSeconds, requiredWorkSeconds));
    default:
      // Default: deduct only excess breaks beyond the allowed max
      const deductibleBreakSeconds = Math.max(0, (actualBreakSeconds || 0) - maxBreakSeconds);
      return Math.max(0, totalWorkSeconds - deductibleBreakSeconds);
  }
}

router.get('/status', async (req, res) => {
  const key = typeof req.query.date === 'string' && req.query.date.trim() ? String(req.query.date).trim() : todayKey();
  const record = await Attendance.findOne({ where: { userId: req.user.id, date: key } });

  const REQUIRED_WORK_SECONDS = await getRequiredWorkSecondsFor(req.user.id, key);
  // Load max allowed paid break minutes
  const maxBreakSetting = await AppSetting.findOne({ where: { key: 'MAX_BREAK_DURATION' } });
  const maxBreakMinutes = maxBreakSetting ? parseInt(maxBreakSetting.value) : 0;
  const tpl = await getEffectiveTemplate(req.user.id);
  const effectiveHoursRule = tpl ? (tpl.effectiveHoursRule ?? tpl.effective_hours_rule ?? null) : null;
  const assignedShift = await getEffectiveShiftTemplate(req.user.id, key);

  const now = new Date();
  // If today is a paid holiday for this user and no attendance record exists, mark PRESENT with zero values
  const isHoliday = await isPaidHoliday(req.user.id, key);
  const isApprovedLeave = await hasApprovedLeave(req.user.id, key);
  if (!record && isHoliday) {
    return res.json({
      success: true,
      status: {
        date: key,
        punchedInAt: null,
        punchedOutAt: null,
        punchInPhotoUrl: null,
        punchOutPhotoUrl: null,
        isOnBreak: false,
        breakStartedAt: null,
        breakSeconds: 0,
        workingSeconds: 0,
        overtimeSeconds: 0,
        requiredWorkSeconds: REQUIRED_WORK_SECONDS,
        dayStatus: 'PRESENT',
      },
    });
  }
  if (!record && isApprovedLeave) {
    return res.json({
      success: true,
      status: {
        date: key,
        punchedInAt: null,
        punchedOutAt: null,
        punchInPhotoUrl: null,
        punchOutPhotoUrl: null,
        isOnBreak: false,
        breakStartedAt: null,
        breakSeconds: 0,
        workingSeconds: 0,
        overtimeSeconds: 0,
        requiredWorkSeconds: REQUIRED_WORK_SECONDS,
        dayStatus: 'LEAVE',
      },
    });
  }
  const punchedInAt = record?.punchedInAt ? new Date(record.punchedInAt) : null;
  const punchedOutAt = record?.punchedOutAt ? new Date(record.punchedOutAt) : null;

  const breakStartedAt = record?.breakStartedAt ? new Date(record.breakStartedAt) : null;
  const breakBase = Number(record?.breakTotalSeconds || 0);
  const breakRunning = record?.isOnBreak ? diffSeconds(breakStartedAt, now) : 0;
  const breakSeconds = breakBase + breakRunning;

  // If admin marked Leave explicitly on this date, reflect immediately
  if (record && (Number(record.breakTotalSeconds) === -1 || String(record.status || '').toLowerCase() === 'leave')) {
    return res.json({
      success: true,
      status: {
        date: key,
        punchedInAt: null,
        punchedOutAt: null,
        punchInPhotoUrl: null,
        punchOutPhotoUrl: null,
        isOnBreak: false,
        breakStartedAt: null,
        breakSeconds: 0,
        workingSeconds: 0,
        overtimeSeconds: 0,
        requiredWorkSeconds: REQUIRED_WORK_SECONDS,
        dayStatus: 'LEAVE',
      },
    });
  }

  const workEnd = punchedOutAt || (record?.isOnBreak ? breakStartedAt : now);
  const totalWorkSeconds = punchedInAt && workEnd ? Math.max(0, diffSeconds(punchedInAt, workEnd)) : 0;
  const workSeconds = computeEffectiveWorkingSeconds({
    totalWorkSeconds,
    actualBreakSeconds: breakSeconds,
    requiredWorkSeconds: REQUIRED_WORK_SECONDS,
    maxBreakMinutes,
    effectiveHoursRule,
  });

  const overtimeSeconds = workSeconds > REQUIRED_WORK_SECONDS ? workSeconds - REQUIRED_WORK_SECONDS : 0;

  // Use the stored status from database if available, otherwise calculate
  let dayStatus = record?.status || 'ABSENT';
  
  // If no stored status but user has punched in, calculate based on work hours
  if (!record?.status && record?.punchedInAt) {
    if (workSeconds > REQUIRED_WORK_SECONDS) dayStatus = 'OVERTIME';
    else if (workSeconds >= REQUIRED_WORK_SECONDS) dayStatus = 'PRESENT';
    else if (record?.punchedOutAt) dayStatus = 'HALF_DAY';
    else dayStatus = 'HALF_DAY';
  }
  
  // If admin marked half-day explicitly via sentinel, force HALF_DAY
  if (record && Number(record.breakTotalSeconds) === -2) {
    dayStatus = 'HALF_DAY';
  }

  return res.json({
    success: true,
    status: {
      date: key,
      punchedInAt: punchedInAt ? punchedInAt.toISOString() : null,
      punchedOutAt: punchedOutAt ? punchedOutAt.toISOString() : null,
      punchInPhotoUrl: record?.punchInPhotoUrl || null,
      punchOutPhotoUrl: record?.punchOutPhotoUrl || null,
      isOnBreak: record?.isOnBreak || false,
      breakStartedAt: breakStartedAt ? breakStartedAt.toISOString() : null,
      breakSeconds,
      workingSeconds: workSeconds,
      overtimeSeconds,
      requiredWorkSeconds: REQUIRED_WORK_SECONDS,
      dayStatus,
      totalWorkHours: record?.totalWorkHours || null, // Add total work hours from database
      assignedShift: assignedShift ? {
        id: assignedShift.id,
        name: assignedShift.name,
        shiftType: assignedShift.shiftType,
        startTime: assignedShift.startTime,
        endTime: assignedShift.endTime,
        workMinutes: assignedShift.workMinutes,
        bufferMinutes: assignedShift.bufferMinutes,
        earliestPunchInTime: assignedShift.earliestPunchInTime,
        latestPunchOutTime: assignedShift.latestPunchOutTime,
        minPunchOutAfterMinutes: assignedShift.minPunchOutAfterMinutes,
        maxPunchOutAfterMinutes: assignedShift.maxPunchOutAfterMinutes,
      } : null,
    },
  });
});

router.get('/history', async (req, res) => {
  try {
    const REQUIRED_WORK_SECONDS = await getRequiredWorkSecondsFor(req.user.id);
    const parsed = parseMonth(req.query.month);
    const now = new Date();
    const tpl = await getEffectiveTemplate(req.user.id);
    const effectiveHoursRule = tpl ? (tpl.effectiveHoursRule ?? tpl.effective_hours_rule ?? null) : null;

    // Get max break duration setting and template rule
    const maxBreakSetting = await AppSetting.findOne({ where: { key: 'MAX_BREAK_DURATION' } });
    const maxBreakMinutes = maxBreakSetting ? parseInt(maxBreakSetting.value) : 0;
    const maxBreakSeconds = maxBreakMinutes * 60;

    console.log('History calculation - Max break allowed:', maxBreakMinutes, 'minutes');

    const y = parsed ? parsed.y : now.getFullYear();
    const mo = parsed ? parsed.mo : now.getMonth() + 1;

    const start = new Date(y, mo - 1, 1);
    const end = new Date(y, mo, 0);
    const startKey = isoDate(start);
    const endKey = isoDate(end);

    const attendanceRows = await Attendance.findAll({
      where: {
        userId: req.user.id,
        date: { [Op.between]: [startKey, endKey] },
      },
      order: [['date', 'ASC']],
    });
    const attendanceByDate = new Map(attendanceRows.map((r) => [String(r.date), r]));

    const leaveRows = await LeaveRequest.findAll({
      where: {
        userId: req.user.id,
        status: 'APPROVED',
        startDate: { [Op.lte]: endKey },
        endDate: { [Op.gte]: startKey },
      },
      order: [['startDate', 'ASC']],
    });

    const leaveForDate = (dateKey) => {
      for (const l of leaveRows) {
        if (String(l.startDate) <= dateKey && String(l.endDate) >= dateKey) return l;
      }
      return null;
    };

    const summary = { present: 0, absent: 0, halfDay: 0, leave: 0, overtime: 0 };
    const days = [];

    const totalDays = end.getDate();
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(start, i);
      const key = isoDate(d);

      const record = attendanceByDate.get(key);
      const isHoliday = await isPaidHoliday(req.user.id, key);
      const leave = leaveForDate(key);

      let dayStatus = 'ABSENT';
      let workingSeconds = 0;
      let breakSeconds = 0;
      let overtimeSeconds = 0;
      let leaveType = null;

      // Reflect admin-marked LEAVE without requiring a LeaveRequest row
      const isAdminLeave = record && (Number(record?.breakTotalSeconds) === -1 || String(record?.status || '').toLowerCase() === 'leave');
      const isAdminHalf = record && (Number(record?.breakTotalSeconds) === -2 || String(record?.status || '').toLowerCase() === 'half_day');

      // Use the stored status from database if available, otherwise calculate
      if (leave || isAdminLeave) {
        dayStatus = 'LEAVE';
        leaveType = leave?.leaveType || 'ADMIN';
      } else if (isAdminHalf) {
        dayStatus = 'HALF_DAY';
      } else if (record?.status) {
        // Use the stored status from punchout calculation
        dayStatus = record.status.toUpperCase();
      } else if (record?.punchedInAt) {
        const punchedInAt = new Date(record.punchedInAt);
        const punchedOutAt = record.punchedOutAt ? new Date(record.punchedOutAt) : null;
        const baseBreak = Number(record.breakTotalSeconds || 0);
        const runningBreak = record.isOnBreak && record.breakStartedAt ? diffSeconds(new Date(record.breakStartedAt), now) : 0;
        const totalBreakSeconds = baseBreak + runningBreak;
        breakSeconds = totalBreakSeconds;

        const workEnd = punchedOutAt || (record.isOnBreak && record.breakStartedAt ? new Date(record.breakStartedAt) : (key === todayKey() ? now : punchedInAt));
        
        // Calculate total work time (punch out - punch in)
        const totalWorkSeconds = Math.max(0, diffSeconds(punchedInAt, workEnd));

        // Apply effective hours rule from template
        workingSeconds = computeEffectiveWorkingSeconds({
          totalWorkSeconds,
          actualBreakSeconds: totalBreakSeconds,
          requiredWorkSeconds: REQUIRED_WORK_SECONDS,
          maxBreakMinutes,
          effectiveHoursRule,
        });
        
        overtimeSeconds = workingSeconds > REQUIRED_WORK_SECONDS ? workingSeconds - REQUIRED_WORK_SECONDS : 0;

        console.log(`History ${key}: Total=${Math.floor(totalWorkSeconds/60)}min, Break=${Math.floor(totalBreakSeconds/60)}min, MaxAllowed=${maxBreakMinutes}min, Effective=${Math.floor(workingSeconds/60)}min`);

        // Calculate status if not stored
        if (workingSeconds > REQUIRED_WORK_SECONDS) dayStatus = 'OVERTIME';
        else if (workingSeconds >= REQUIRED_WORK_SECONDS) dayStatus = 'PRESENT';
        else dayStatus = 'HALF_DAY';
      } else {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const cur = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        if (!record && isHoliday) {
          dayStatus = 'PRESENT';
        } else {
          dayStatus = cur > today ? 'NA' : 'ABSENT';
        }
      }

      if (dayStatus === 'PRESENT') summary.present += 1;
      else if (dayStatus === 'ABSENT') summary.absent += 1;
      else if (dayStatus === 'HALF_DAY') summary.halfDay += 1;
      else if (dayStatus === 'LEAVE') summary.leave += 1;
      else if (dayStatus === 'OVERTIME') summary.overtime += 1;

      days.push({ date: key, dayStatus, workingSeconds, breakSeconds, overtimeSeconds, leaveType });
    }

    return res.json({
      success: true,
      month: `${y}-${String(mo).padStart(2, '0')}`,
      requiredWorkSeconds: REQUIRED_WORK_SECONDS,
      maxBreakMinutes: maxBreakMinutes,
      summary,
      days,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load attendance history' });
  }
});

router.post('/start-break', async (req, res) => {
  try {
    const key = todayKey();
    const record = await Attendance.findOne({ where: { userId: req.user.id, date: key } });

    if (!record?.punchedInAt) {
      return res.status(409).json({ success: false, message: 'Please punch-in first' });
    }

    if (record?.punchedOutAt) {
      return res.status(409).json({ success: false, message: 'Already punched out' });
    }

    if (record?.isOnBreak) {
      return res.status(409).json({ success: false, message: 'Break already started' });
    }

    const now = new Date();
    await record.update({ isOnBreak: true, breakStartedAt: now });
    return res.json({ success: true, attendance: record });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to start break' });
  }
});

router.post('/end-break', async (req, res) => {
  try {
    const key = todayKey();
    const record = await Attendance.findOne({ where: { userId: req.user.id, date: key } });

    if (!record?.punchedInAt) {
      return res.status(409).json({ success: false, message: 'Please punch-in first' });
    }

    if (!record?.isOnBreak || !record?.breakStartedAt) {
      return res.status(409).json({ success: false, message: 'No active break' });
    }

    const now = new Date();
    const started = new Date(record.breakStartedAt);
    const add = diffSeconds(started, now);
    const total = Number(record.breakTotalSeconds || 0) + add;

    await record.update({ isOnBreak: false, breakStartedAt: null, breakTotalSeconds: total });
    return res.json({ success: true, attendance: record });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to end break' });
  }
});

router.post('/punch-in', upload.single('photo'), async (req, res) => {
  try {
    // Enforce template rules
    const tpl = await getEffectiveTemplate(req.user.id);
    const shiftTpl = await getEffectiveShiftTemplate(req.user.id, todayKey());
    if (tpl) {
      // Holidays rule
      const dateKey = todayKey();
      if ((tpl.holidaysRule ?? tpl.holidays_rule) === 'disallow' && await isPaidHoliday(req.user.id, dateKey)) {
        return res.status(409).json({ success: false, message: 'Punch-in disabled on paid holidays' });
      }
    }
    // Enforce earliest punch-in if a fixed shift is assigned
    if (shiftTpl && (shiftTpl.shiftType === 'fixed' || shiftTpl.shiftType === 'rotational') && shiftTpl.earliestPunchInTime) {
      const now = new Date();
      const nowStr = toHhMmSs(now);
      if (cmpTime(nowStr, shiftTpl.earliestPunchInTime) < 0) {
        return res.status(409).json({ success: false, message: 'Punch-in before earliest allowed time' });
      }
    }
    // Block punch-in if approved leave exists for today
    const dateKey = todayKey();
    if (await hasApprovedLeave(req.user.id, dateKey)) {
      return res.status(409).json({ success: false, message: 'You are on leave today' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo is required' });
    }

    const key = todayKey();

    const existing = await Attendance.findOne({ where: { userId: req.user.id, date: key } });
    if (existing?.punchedInAt) {
      return res.status(409).json({ success: false, message: 'Already punched in today' });
    }

    const now = new Date();
    // Enforce latest punch-out if a fixed shift is assigned
    if (shiftTpl && (shiftTpl.shiftType === 'fixed' || shiftTpl.shiftType === 'rotational') && shiftTpl.latestPunchOutTime) {
      const nowStr = toHhMmSs(now);
      if (cmpTime(nowStr, shiftTpl.latestPunchOutTime) > 0) {
        return res.status(409).json({ success: false, message: 'Punch-out after latest allowed time' });
      }
    }
    const photoUrl = `/uploads/${req.file.filename}`;

    const record = existing
      ? await existing.update({ punchedInAt: now, punchInPhotoUrl: photoUrl })
      : await Attendance.create({ userId: req.user.id, date: key, punchedInAt: now, punchInPhotoUrl: photoUrl });

    return res.json({ success: true, attendance: record });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Punch-in failed' });
  }
});

// Live location ping
router.post('/location/ping', async (req, res) => {
  try {
    const lat = Number(req.body?.lat ?? req.body?.latitude);
    const lng = Number(req.body?.lng ?? req.body?.longitude);
    const accuracy = req.body?.accuracyMeters !== undefined ? Number(req.body.accuracyMeters) : null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ success: false, message: 'lat/lng required' });
    const row = await LocationPing.create({ userId: req.user.id, latitude: lat, longitude: lng, accuracyMeters: Number.isFinite(accuracy) ? accuracy : null, source: 'staff' });
    return res.json({ success: true, ping: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to record location' });
  }
});

router.post('/punch-out', upload.single('photo'), async (req, res) => {
  try {
    // Enforce template rules
    const tpl = await getEffectiveTemplate(req.user.id);
    const shiftTpl = await getEffectiveShiftTemplate(req.user.id, todayKey());
    const trackInOutEnabled = tpl ? (tpl.trackInOutEnabled ?? tpl.track_in_out_enabled ?? false) : false;
    const requirePunchOut = tpl ? (tpl.requirePunchOut ?? tpl.require_punch_out ?? false) : false;
    const allowMultiplePunches = tpl ? (tpl.allowMultiplePunches ?? tpl.allow_multiple_punches ?? false) : true;
    // If a concrete shift is assigned for the day, allow punch-out even if attendance template hasn't enabled it
    // Also allow punch-out if no template is configured (fallback behavior)
    const canTrackOut = trackInOutEnabled || !!shiftTpl || (!tpl && !shiftTpl);
    if (!canTrackOut) {
      return res.status(409).json({ success: false, message: 'Punch-out disabled by your template' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo is required' });
    }

    const key = todayKey();
    const record = await Attendance.findOne({ where: { userId: req.user.id, date: key } });

    if (!record?.punchedInAt) {
      return res.status(409).json({ success: false, message: 'Please punch-in first' });
    }

    if (record?.punchedOutAt) {
      if (!allowMultiplePunches) {
        return res.status(409).json({ success: false, message: 'Multiple punches are not allowed by your template' });
      }
      // If multiple punches allowed, we can proceed to update punchedOutAt again
    }

    const now = new Date();
    // Enforce punch-out window relative to punch-in if configured
    const hasTimeRestrictions = (shiftTpl && (shiftTpl.minPunchOutAfterMinutes || shiftTpl.maxPunchOutAfterMinutes)) ||
                                (tpl && (tpl.minPunchOutAfterMinutes || tpl.maxPunchOutAfterMinutes));
    
    if (hasTimeRestrictions) {
      const inAt = record?.punchedInAt ? new Date(record.punchedInAt) : null;
      if (!inAt) {
        return res.status(409).json({ success: false, message: 'Please punch-in first' });
      }
      
      // Check shift template restrictions first, then template restrictions
      const minMinutes = shiftTpl?.minPunchOutAfterMinutes || tpl?.minPunchOutAfterMinutes || 0;
      const maxMinutes = shiftTpl?.maxPunchOutAfterMinutes || tpl?.maxPunchOutAfterMinutes || 0;
      
      const minMs = Number(minMinutes) * 60000;
      const maxMs = Number(maxMinutes) * 60000;
      
      if (Number(minMinutes)) {
        if (now.getTime() < inAt.getTime() + minMs) {
          return res.status(409).json({ success: false, message: `Punch-out allowed after ${minMinutes} minutes from punch-in` });
        }
      }
      if (Number(maxMinutes)) {
        if (now.getTime() > inAt.getTime() + maxMs) {
          return res.status(409).json({ success: false, message: `Punch-out must be within ${maxMinutes} minutes from punch-in` });
        }
      }
    }
    const photoUrl = `/uploads/${req.file.filename}`;

    let breakTotalSeconds = Number(record.breakTotalSeconds || 0);
    if (record.isOnBreak && record.breakStartedAt) {
      breakTotalSeconds += diffSeconds(new Date(record.breakStartedAt), now);
    }

    // Calculate attendance status based on work hours
    const punchedInAt = new Date(record.punchedInAt);
    const totalWorkSeconds = diffSeconds(punchedInAt, now) - breakTotalSeconds;
    const totalWorkHours = totalWorkSeconds / 3600;
    
    let status = 'PRESENT';
    
    // Get shift template for working hours calculation (already declared above)
    const standardWorkHours = shiftTpl?.workHours || 8; // Default 8 hours
    
    // Calculate status based on work hours
    if (totalWorkHours < 1) {
      status = 'absent';
    } else if (totalWorkHours < (standardWorkHours / 2)) {
      status = 'half_day';
    } else if (totalWorkHours > standardWorkHours + 1) {
      status = 'overtime';
    } else {
      status = 'present';
    }

    await record.update({
      punchedOutAt: now,
      punchOutPhotoUrl: photoUrl,
      isOnBreak: false,
      breakStartedAt: null,
      breakTotalSeconds,
      status: status,
      totalWorkHours: totalWorkHours,
    });
    
    console.log(`Attendance status calculated: ${status} for ${totalWorkHours.toFixed(2)} hours worked`);
    return res.json({ success: true, attendance: record });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Punch-out failed' });
  }
});

// Get attendance report for a specific date
router.get('/report', async (req, res) => {
  try {
    let date = req.query.date;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter required' });
    }

    // Handle different date formats
    let formattedDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      formattedDate = date; // Already in YYYY-MM-DD format
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      // Convert DD-MM-YYYY to YYYY-MM-DD
      const [day, month, year] = date.split('-');
      formattedDate = `${year}-${month}-${day}`;
    } else {
      return res.status(400).json({ success: false, message: 'Valid date required (YYYY-MM-DD or DD-MM-YYYY)' });
    }

    console.log('Fetching attendance for date:', date, 'formatted as:', formattedDate, 'user:', req.user.id);

    const record = await Attendance.findOne({ where: { userId: req.user.id, date: formattedDate } });
    
    console.log('Found record:', record ? 'YES' : 'NO');
    if (record) {
      console.log('Record data:', {
        id: record.id,
        userId: record.userId,
        date: record.date,
        punchedInAt: record.punchedInAt,
        punchedOutAt: record.punchedOutAt,
        breakTotalSeconds: record.breakTotalSeconds,
        isOnBreak: record.isOnBreak,
        breakStartedAt: record.breakStartedAt
      });
    } else {
      // Try to find any record for this user around this date (for debugging)
      const nearbyRecords = await Attendance.findAll({
        where: { 
          userId: req.user.id,
          date: {
            [Op.between]: [
              new Date(new Date(formattedDate).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              new Date(new Date(formattedDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            ]
          }
        },
        limit: 5
      });
      console.log('Nearby records found:', nearbyRecords.length);
      nearbyRecords.forEach(r => console.log(`- ${r.date}: ${r.punchedInAt ? 'PUNCHED IN' : 'NO PUNCH IN'}`));
    }
    
    if (!record) {
      return res.json({ 
        success: true, 
        data: {
          punchIn: null,
          punchOut: null,
          breakDuration: null
        }
      });
    }

    // Get max break duration setting and template rule
    const maxBreakSetting = await AppSetting.findOne({ where: { key: 'MAX_BREAK_DURATION' } });
    const maxBreakMinutes = maxBreakSetting ? parseInt(maxBreakSetting.value) : 0;
    const tpl = await getEffectiveTemplate(req.user.id);
    const effectiveHoursRule = tpl ? (tpl.effectiveHoursRule ?? tpl.effective_hours_rule ?? null) : null;
    const REQUIRED_WORK_SECONDS = await getRequiredWorkSecondsFor(req.user.id, formattedDate);

    // If admin marked LEAVE explicitly, reflect directly in report with zeroes
    if (Number(record.breakTotalSeconds) === -1 || String(record.status || '').toLowerCase() === 'leave') {
      const data = {
        punchIn: null,
        punchOut: null,
        breakDuration: 0,
        breakDurationSeconds: 0,
        effectiveWorkingHours: 0,
        maxBreakAllowedMinutes: maxBreakMinutes,
      };
      return res.json({ success: true, data });
    }

    // Calculate effective working hours
    let effectiveWorkingHours = 0;
    if (record.punchedInAt && record.punchedOutAt) {
      const totalWorkSeconds = diffSeconds(new Date(record.punchedInAt), new Date(record.punchedOutAt));
      const actualBreakSeconds = record.breakTotalSeconds || 0;
      const effectiveWorkSeconds = computeEffectiveWorkingSeconds({
        totalWorkSeconds,
        actualBreakSeconds,
        requiredWorkSeconds: REQUIRED_WORK_SECONDS,
        maxBreakMinutes,
        effectiveHoursRule,
      });
      effectiveWorkingHours = effectiveWorkSeconds / 3600;
      
      console.log(`Effective hours calculation: Total=${Math.floor(totalWorkSeconds/60)}min, Break=${Math.floor(actualBreakSeconds/60)}min, Rule=${effectiveHoursRule || 'default'}, MaxAllowed=${maxBreakMinutes}min, Effective=${effectiveWorkingHours.toFixed(2)}hr`);
    }

    const data = {
      punchIn: record.punchedInAt,
      punchOut: record.punchedOutAt,
      breakDuration: record.breakTotalSeconds ? Math.floor(record.breakTotalSeconds / 60) : 0,
      breakDurationSeconds: record.breakTotalSeconds || 0,
      effectiveWorkingHours: effectiveWorkingHours,
      maxBreakAllowedMinutes: maxBreakMinutes
    };

    console.log('Returning data:', data);

    return res.json({ success: true, data });
  } catch (e) {
    console.error('Attendance report error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance report' });
  }
});

// Get weekly attendance data
router.get('/weekly', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ success: false, message: 'Valid start and end dates required (YYYY-MM-DD)' });
    }

    const records = await Attendance.findAll({
      where: {
        userId: req.user.id,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'ASC']]
    });

    // Get max break duration setting and template rule
    const maxBreakSetting = await AppSetting.findOne({ where: { key: 'MAX_BREAK_DURATION' } });
    const maxBreakMinutes = maxBreakSetting ? parseInt(maxBreakSetting.value) : 0;
    
    // Get effective hours rule from template
    const tpl = await getEffectiveTemplate(req.user.id);
    const effectiveHoursRule = tpl ? (tpl.effectiveHoursRule ?? tpl.effective_hours_rule ?? null) : null;

    console.log('Weekly calculation - Max break allowed:', maxBreakMinutes, 'minutes');

    // Calculate weekly hours for each day using effective working hours
    const weeklyHours = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    console.log(`Found ${records.length} attendance records for user ${req.user.id} from ${startDate} to ${endDate}`);
    console.log('Records:', records.map(r => ({ date: r.date, punchedInAt: r.punchedInAt, punchedOutAt: r.punchedOutAt })));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = isoDate(d);
      const record = records.find(r => r.date === dateStr);
      
      console.log(`Processing date ${dateStr}, record found:`, !!record);
      
      if (record && record.punchedInAt && record.punchedOutAt) {
        // Calculate total work time (punch out - punch in)
        const totalWorkSeconds = diffSeconds(new Date(record.punchedInAt), new Date(record.punchedOutAt));
        const actualBreakSeconds = record.breakTotalSeconds || 0;

        const effectiveWorkSeconds = computeEffectiveWorkingSeconds({
          totalWorkSeconds,
          actualBreakSeconds,
          requiredWorkSeconds: await getRequiredWorkSecondsFor(req.user.id, dateStr),
          maxBreakMinutes,
          effectiveHoursRule,
        });
        const effectiveHours = effectiveWorkSeconds / 3600;

        console.log(`Date ${dateStr}: Total=${Math.floor(totalWorkSeconds/60)}min, Break=${Math.floor(actualBreakSeconds/60)}min, Rule=${effectiveHoursRule || 'default'}, MaxAllowed=${maxBreakMinutes}min, Effective=${effectiveHours.toFixed(2)}hr`);

        weeklyHours.push(effectiveHours);
      } else {
        console.log(`Date ${dateStr}: No complete attendance record (punchedInAt: ${record?.punchedInAt}, punchedOutAt: ${record?.punchedOutAt})`);
        weeklyHours.push(0);
      }
    }

    return res.json({ 
      success: true, 
      data: { 
        weeklyHours,
        startDate,
        endDate,
        maxBreakMinutes
      }
    });
  } catch (e) {
    console.error('Weekly attendance error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch weekly attendance' });
  }
});

// Generate and download PDF attendance report
router.get('/report/pdf', async (req, res) => {
  try {
    const date = req.query.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Valid date required (YYYY-MM-DD)' });
    }

    const record = await Attendance.findOne({ where: { userId: req.user.id, date } });
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'No attendance record found for this date' });
    }

    // Generate PDF HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Attendance Report - ${date}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #125EC9; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .info-table th, .info-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .info-table th { background-color: #125EC9; color: white; }
          .footer { margin-top: 30px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Attendance Report</h1>
          <p>Date: ${date}</p>
        </div>
        
        <table class="info-table">
          <tr>
            <th>Field</th>
            <th>Details</th>
          </tr>
          <tr>
            <td>Punch In</td>
            <td>${record.punchedInAt ? new Date(record.punchedInAt).toLocaleString() : '--'}</td>
          </tr>
          <tr>
            <td>Punch Out</td>
            <td>${record.punchedOutAt ? new Date(record.punchedOutAt).toLocaleString() : '--'}</td>
          </tr>
          <tr>
            <td>Break Duration</td>
            <td>${record.breakTotalSeconds ? 
              (record.breakTotalSeconds < 60 ? 
                `${record.breakTotalSeconds} sec` : 
                `${Math.floor(record.breakTotalSeconds / 60)} min ${record.breakTotalSeconds % 60} sec`) : 
              '0 min'}</td>
          </tr>
          <tr>
            <td>Total Work Hours</td>
            <td>${record.punchedInAt && record.punchedOutAt ? 
              `${Math.floor((new Date(record.punchedOutAt) - new Date(record.punchedInAt)) / 3600000)} hours` : '--'}</td>
          </tr>
        </table>
        
        <div class="footer">
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>ThinkTech Attendance System</p>
        </div>
      </body>
      </html>
    `;

    // Launch Puppeteer with Windows-compatible configuration
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    await browser.close();
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${date}.pdf`);
    res.setHeader('Content-Length', pdf.length);
    
    res.send(pdf);
  } catch (e) {
    console.error('PDF generation error:', e);
    
    // Fallback: return HTML if PDF generation fails
    if (e.message.includes('Puppeteer') || e.message.includes('browser')) {
      const record = await Attendance.findOne({ where: { userId: req.user.id, date: req.query.date } });
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Attendance Report - ${req.query.date}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #125EC9; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table th, .info-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .info-table th { background-color: #125EC9; color: white; }
            .footer { margin-top: 30px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Attendance Report</h1>
            <p>Date: ${req.query.date}</p>
            <p><strong>Note: PDF generation failed. Please print this page as PDF.</strong></p>
          </div>
          
          <table class="info-table">
            <tr>
              <th>Field</th>
              <th>Details</th>
            </tr>
            <tr>
              <td>Punch In</td>
              <td>${record.punchedInAt ? new Date(record.punchedInAt).toLocaleString() : '--'}</td>
            </tr>
            <tr>
              <td>Punch Out</td>
              <td>${record.punchedOutAt ? new Date(record.punchedOutAt).toLocaleString() : '--'}</td>
            </tr>
            <tr>
              <td>Break Duration</td>
              <td>${record.breakTotalSeconds ? `${Math.floor(record.breakTotalSeconds / 60)} min ${record.breakTotalSeconds % 60} sec` : '0 min'}</td>
            </tr>
            <tr>
              <td>Total Work Hours</td>
              <td>${record.punchedInAt && record.punchedOutAt ? 
                `${Math.floor((new Date(record.punchedOutAt) - new Date(record.punchedInAt)) / 3600000)} hours` : '--'}</td>
            </tr>
          </table>
          
          <div class="footer">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>ThinkTech Attendance System</p>
          </div>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename=attendance-report-${req.query.date}.html`);
      return res.send(html);
    }
    
    return res.status(500).json({ success: false, message: 'Failed to generate PDF report' });
  }
});

// Set maximum allowed break duration (admin only)
router.put('/settings/max-break', async (req, res) => {
  try {
    const { maxBreakMinutes } = req.body;
    
    if (typeof maxBreakMinutes !== 'number' || maxBreakMinutes < 0) {
      return res.status(400).json({ success: false, message: 'Valid maxBreakMinutes required' });
    }

    // Update or create the setting
    await AppSetting.upsert({
      key: 'MAX_BREAK_DURATION',
      value: String(maxBreakMinutes)
    });

    return res.json({ 
      success: true, 
      message: 'Maximum break duration updated successfully',
      maxBreakMinutes 
    });
  } catch (e) {
    console.error('Update max break error:', e);
    return res.status(500).json({ success: false, message: 'Failed to update max break duration' });
  }
});

// Get maximum allowed break duration
router.get('/settings/max-break', async (req, res) => {
  try {
    const setting = await AppSetting.findOne({ where: { key: 'MAX_BREAK_DURATION' } });
    const maxBreakMinutes = setting ? parseInt(setting.value) : 0;
    
    return res.json({ 
      success: true, 
      data: { maxBreakMinutes } 
    });
  } catch (e) {
    console.error('Get max break error:', e);
    return res.status(500).json({ success: false, message: 'Failed to get max break duration' });
  }
});

// Helper function to get current max break setting
const getCurrentMaxBreakMinutes = async () => {
  try {
    const setting = await AppSetting.findOne({ where: { key: 'MAX_BREAK_DURATION' } });
    return setting ? parseInt(setting.value) : 0;
  } catch (e) {
    console.error('Error getting max break setting:', e);
    return 0;
  }
};

// Helper function to calculate effective working hours
const calculateEffectiveWorkingHours = (punchedInAt, punchedOutAt, breakTotalSeconds, maxBreakMinutes = 0) => {
  if (!punchedInAt || !punchedOutAt) return 0;
  
  const totalWorkSeconds = diffSeconds(new Date(punchedInAt), new Date(punchedOutAt));
  const maxBreakSeconds = maxBreakMinutes * 60;
  
  // Only deduct break time that exceeds the allowed maximum
  const deductibleBreakSeconds = Math.max(0, (breakTotalSeconds || 0) - maxBreakSeconds);
  const effectiveWorkSeconds = Math.max(0, totalWorkSeconds - deductibleBreakSeconds);
  
  return effectiveWorkSeconds / 3600; // Convert to hours
};

// Get user attendance data for salary calculation
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required' });
    }
    
    // Parse year and month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ success: false, message: 'Invalid year or month' });
    }
    
    // Get all attendance records for the user in the specified month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0); // Last day of month
    
    const attendanceRecords = await Attendance.findAll({
      where: {
        userId: userId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'ASC']]
    });
    
    // Get leave requests for this month
    const leaveRequests = await LeaveRequest.findAll({
      where: {
        userId: userId,
        startDate: {
          [Op.between]: [startDate, endDate]
        },
        status: 'approved'
      },
      order: [['startDate', 'ASC']]
    });
    
    // Process attendance records to determine status for each day
    const processedRecords = [];
    
    for (let day = 1; day <= endDate.getDate(); day++) {
      const currentDate = new Date(yearNum, monthNum - 1, day);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Check if there's an attendance record for this date
      const attendance = attendanceRecords.find(record => {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        return recordDate === dateStr;
      });
      
      // Check if there's an approved leave for this date
      const leave = leaveRequests.find(leave => {
        const leaveStart = new Date(leave.startDate).toISOString().split('T')[0];
        const leaveEnd = new Date(leave.endDate).toISOString().split('T')[0];
        return dateStr >= leaveStart && dateStr <= leaveEnd;
      });
      
      let status = 'absent'; // Default status
      
      if (leave) {
        // If there's an approved leave, mark as leave
        status = 'leave';
      } else if (attendance) {
        // Determine status based on attendance data
        if (attendance.checkIn && attendance.checkOut) {
          status = 'present';
        } else if (attendance.checkIn && !attendance.checkOut) {
          status = 'half_day';
        } else if (attendance.leaveType) {
          status = 'leave';
        }
      } else {
        // Check if it's a weekend
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
          status = 'weekly_off';
        }
      }
      
      processedRecords.push({
        date: dateStr,
        status: status,
        checkIn: attendance?.checkIn || null,
        checkOut: attendance?.checkOut || null,
        leaveType: leave?.leaveType || attendance?.leaveType || null,
        leaveReason: leave?.reason || null
      });
    }
    
    res.json({
      success: true,
      data: processedRecords
    });
    
  } catch (error) {
    console.error('Error fetching user attendance:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Location ping endpoint for tracking staff between punch-in and punch-out
router.post('/ping', async (req, res) => {
  try {
    const { latitude, longitude, accuracy, source } = req.body || {};
    
    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude are required' 
      });
    }
    
    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid latitude or longitude values' 
      });
    }
    
    // Create location ping record
    const locationPing = await LocationPing.create({
      userId: req.user.id,
      latitude: lat,
      longitude: lng,
      accuracyMeters: accuracy ? parseInt(accuracy) : null,
      source: source || 'mobile'
    });
    
    console.log(`Location ping recorded for user ${req.user.id}:`, {
      latitude: lat,
      longitude: lng,
      accuracy: accuracy,
      source: source
    });
    
    res.json({
      success: true,
      message: 'Location ping recorded successfully',
      data: {
        id: locationPing.id,
        timestamp: locationPing.createdAt
      }
    });
    
  } catch (error) {
    console.error('Location ping error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to record location ping' 
    });
  }
});

module.exports = router;
