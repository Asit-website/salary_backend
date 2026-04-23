const express = require('express');
const { Op } = require('sequelize');
const puppeteer = require('puppeteer');

const { User, StaffProfile, Attendance, LeaveRequest, AppSetting, AttendanceTemplate, StaffAttendanceAssignment, StaffShiftAssignment, ShiftTemplate, StaffHolidayAssignment, HolidayTemplate, HolidayDate, StaffGeofenceAssignment, GeofenceTemplate, GeofenceSite, LocationPing, DeviceInfo, WeeklyOffTemplate, StaffWeeklyOffAssignment, AttendanceAutomationRule, OrgAccount, StaffRoster, StaffLatePunchInAssignment, LatePunchInRule } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { tenantEnforce } = require('../middleware/tenant');
const { upload } = require('../upload');
const earlyOvertimeService = require('../services/earlyOvertimeService');
const latePunchInService = require('../services/latePunchInService');

const router = express.Router();

router.use(authRequired);
router.use(tenantEnforce);
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

async function validateAssignedGeofence(userId, dateKey, lat, lng) {
  const assignedSites = await getAssignedGeofenceSites(userId, dateKey);
  if (!assignedSites.length) {
    return { ok: true, assigned: false };
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      ok: false,
      status: 400,
      message: 'Location is required for punch because geofence is assigned',
    };
  }

  let nearest = null;
  for (const site of assignedSites) {
    const siteLat = Number(site.latitude);
    const siteLng = Number(site.longitude);
    const siteRadius = Number(site.radiusMeters || 0);
    if (!Number.isFinite(siteLat) || !Number.isFinite(siteLng) || !Number.isFinite(siteRadius) || siteRadius <= 0) {
      continue;
    }
    const dist = haversineMeters(lat, lng, siteLat, siteLng);
    if (!nearest || dist < nearest.distanceMeters) {
      nearest = { distanceMeters: dist, radiusMeters: siteRadius, siteName: site.name || null };
    }
    if (dist <= siteRadius) {
      return { ok: true, assigned: true, within: true };
    }
  }

  return {
    ok: false,
    status: 403,
    message: nearest
      ? `Outside assigned geofence. You are ${Math.round(nearest.distanceMeters)}m away from ${nearest.siteName || 'assigned site'} (allowed radius ${Math.round(nearest.radiusMeters)}m).`
      : 'Outside assigned geofence radius. Punch-in/out allowed only within assigned site radius.',
    nearest,
  };
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
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
    return d.trim();
  }
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
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

function getMonthWeekNumber(d) {
  const day = d.getDate();
  return Math.floor((day - 1) / 7) + 1; // 1..5
}

function normalizeWeeklyOffWeeks(input) {
  if (input === 'all') return 'all';
  if (Array.isArray(input)) {
    const lowered = input.map(v => String(v).toLowerCase());
    if (lowered.includes('all') || lowered.includes('0')) return 'all';
    const nums = Array.from(new Set(input.map(v => Number(v)).filter(n => Number.isFinite(n) && n >= 1 && n <= 5)));
    return nums;
  }
  const single = String(input ?? '').toLowerCase();
  if (single === 'all' || single === '0') return 'all';
  const n = Number(input);
  if (Number.isFinite(n) && n >= 1 && n <= 5) return [n];
  return [];
}

function isWeeklyOffForDate(configArray, jsDate) {
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
    const wk = getMonthWeekNumber(jsDate);

    for (const cfg of config) {
      if (cfg && Number(cfg.day) === dow) {
        const weeks = normalizeWeeklyOffWeeks(cfg.weeks);
        if (weeks === 'all') return true;
        if (Array.isArray(weeks) && weeks.includes(wk)) return true;
      }
    }
    return false;
  } catch (_) { return false; }
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
    // 1. Check for specific Roster assignment for this date
    if (userId && dateKey) {
      const roster = await StaffRoster.findOne({ where: { userId, date: dateKey } });
      if (roster) {
        if (roster.status === 'SHIFT' && roster.shiftTemplateId) {
          const tpl = await ShiftTemplate.findByPk(roster.shiftTemplateId);
          if (tpl && tpl.active !== false) return tpl;
        }
        // If status is WEEKLY_OFF or HOLIDAY, we return null so the status logic handles it
        if (roster.status === 'WEEKLY_OFF' || roster.status === 'HOLIDAY') return null;
      }
    }

    // 2. Check for StaffShiftAssignment
    const asg = await StaffShiftAssignment.findOne({ where, order: [['effectiveFrom', 'DESC']] });
    if (asg) {
      const tpl = await ShiftTemplate.findByPk(asg.shiftTemplateId);
      if (tpl && tpl.active !== false) return tpl;
    }

    // Fallback to user's default shiftTemplateId or profile shiftSelection
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

function deriveDevicePayload(req) {
  const body = req.body || {};
  const ua = String(req.headers['user-agent'] || '').trim();
  const rawDeviceId = body.deviceId || req.headers['x-device-id'] || ua || `${req.user?.id || 'staff'}-unknown`;
  const source = String(body.source || '').toLowerCase();
  return {
    deviceId: String(rawDeviceId).slice(0, 128),
    brand: body.deviceBrand || req.headers['x-device-brand'] || null,
    model: body.deviceModel || req.headers['x-device-model'] || null,
    platform: body.platform || req.headers['x-platform'] || (source.includes('web') ? 'web' : 'mobile'),
    osVersion: body.osVersion || req.headers['x-os-version'] || null,
    appVersion: body.appVersion || req.headers['x-app-version'] || null,
    userAgent: ua ? ua.slice(0, 255) : null,
  };
}

async function touchDeviceInfo(req) {
  try {
    const orgAccountId = Number(req.user?.orgAccountId || req.tenantOrgAccountId || 0);
    if (!orgAccountId || !req.user?.id) return;
    const payload = deriveDevicePayload(req);
    if (!payload.deviceId) return;

    const existing = await DeviceInfo.findOne({
      where: {
        orgAccountId,
        userId: req.user.id,
        deviceId: payload.deviceId,
      },
    });

    const next = {
      ...payload,
      lastSeenAt: new Date(),
      isActive: true,
    };

    if (existing) {
      await existing.update(next);
    } else {
      await DeviceInfo.create({
        orgAccountId,
        userId: req.user.id,
        ...next,
      });
    }
  } catch (_) {
    // Device capture is best-effort and must not block attendance flow.
  }
}

router.get('/status', async (req, res) => {
  const key = typeof req.query.date === 'string' && req.query.date.trim() ? String(req.query.date).trim() : todayKey();
  const userId = req.user.id;
  const record = await Attendance.findOne({ where: { userId, date: key } });

  const REQUIRED_WORK_SECONDS = await getRequiredWorkSecondsFor(userId, key);
  // Load max allowed paid break minutes
  const maxBreakSetting = await AppSetting.findOne({ where: { key: 'MAX_BREAK_DURATION' } });
  const maxBreakMinutes = maxBreakSetting ? parseInt(maxBreakSetting.value) : 0;
  const tpl = await getEffectiveTemplate(userId);
  const effectiveHoursRule = tpl ? (tpl.effectiveHoursRule ?? tpl.effective_hours_rule ?? null) : null;
  const assignedShift = await getEffectiveShiftTemplate(userId, key);

  const now = new Date();

  const isApprovedLeave = await hasApprovedLeave(userId, key);
  const isHoliday = await isPaidHoliday(userId, key);

  // Weekly Off Check
  const woAsg = await StaffWeeklyOffAssignment.findOne({
    where: { userId, effectiveFrom: { [Op.lte]: key } },
    order: [['effectiveFrom', 'DESC']]
  });
  let isWO = false;
  if (woAsg) {
    const wTpl = await WeeklyOffTemplate.findByPk(woAsg.weeklyOffTemplateId || woAsg.weekly_off_template_id);
    let raw = wTpl?.config;
    while (typeof raw === 'string' && raw.trim().startsWith('[')) {
      try { raw = JSON.parse(raw); } catch (_) { break; }
    }
    const woConfig = Array.isArray(raw) ? raw : [];
    isWO = isWeeklyOffForDate(woConfig, new Date(key));
  }

  // 0. Roster override check
  const rosterEntry = await StaffRoster.findOne({ where: { userId, date: key } });
  const isRosterWO = rosterEntry?.status === 'WEEKLY_OFF';
  const isRosterHoliday = rosterEntry?.status === 'HOLIDAY';

  // Default behaviors when no record exists
  if (!record) {
    if (isRosterHoliday || isHoliday) {
      return res.json({
        success: true,
        status: {
          date: key, punchedInAt: null, punchedOutAt: null, punchInPhotoUrl: null, punchOutPhotoUrl: null,
          isOnBreak: false, breakStartedAt: null, breakSeconds: 0, workingSeconds: 0, overtimeSeconds: 0,
          requiredWorkSeconds: REQUIRED_WORK_SECONDS, dayStatus: 'HOLIDAY',
        },
      });
    }
    if (isRosterWO || isWO) {
      return res.json({
        success: true,
        status: {
          date: key, punchedInAt: null, punchedOutAt: null, punchInPhotoUrl: null, punchOutPhotoUrl: null,
          isOnBreak: false, breakStartedAt: null, breakSeconds: 0, workingSeconds: 0, overtimeSeconds: 0,
          requiredWorkSeconds: REQUIRED_WORK_SECONDS, dayStatus: 'WEEKLY_OFF',
        },
      });
    }
    if (isApprovedLeave) {
      return res.json({
        success: true,
        status: {
          date: key, punchedInAt: null, punchedOutAt: null, punchInPhotoUrl: null, punchOutPhotoUrl: null,
          isOnBreak: false, breakStartedAt: null, breakSeconds: 0, workingSeconds: 0, overtimeSeconds: 0,
          requiredWorkSeconds: REQUIRED_WORK_SECONDS, dayStatus: 'LEAVE',
        },
      });
    }
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
        date: key, punchedInAt: null, punchedOutAt: null, punchInPhotoUrl: null, punchOutPhotoUrl: null,
        isOnBreak: false, breakStartedAt: null, breakSeconds: 0, workingSeconds: 0, overtimeSeconds: 0,
        requiredWorkSeconds: REQUIRED_WORK_SECONDS, dayStatus: 'LEAVE',
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

  let overtimeSeconds = 0;
  let overtimeAmount = 0;

  const { calculateOvertime } = require('../services/overtimeService');
  const orgAccount = await OrgAccount.findByPk(req.user.orgAccountId);

  if (record?.punchedInAt) {
    const otData = await calculateOvertime({ ...record.toJSON(), totalWorkHours: workSeconds / 3600 }, orgAccount, now);
    overtimeSeconds = (otData.overtimeMinutes || 0) * 60;
    overtimeAmount = otData.overtimeAmount || 0;
  } else {
    // If no record, we no longer do basic shift-level OT fallback.
    overtimeSeconds = 0;
  }

  // Use the stored status from database if available, otherwise calculate
  let dayStatus = record?.status?.toUpperCase() || (isWO ? 'WEEKLY_OFF' : (isHoliday ? 'HOLIDAY' : 'ABSENT'));

  // If no stored status but user has punched in, calculate based on work hours and shift rules
  if (!record?.status && record?.punchedInAt) {
    const totalWorkMinutes = Math.floor(workSeconds / 60);
    if (assignedShift) {
      if (Number.isFinite(Number(assignedShift.halfDayThresholdMinutes)) && totalWorkMinutes < assignedShift.halfDayThresholdMinutes) {
        dayStatus = (key === todayKey() && !record.punchedOutAt) ? 'PRESENT' : 'HALF_DAY';
      } else {
        dayStatus = 'PRESENT';
      }
    } else {
      // Fallback if no shift assigned: Any work counts as PRESENT
      dayStatus = 'PRESENT';
    }
  }

  // If admin marked half-day explicitly via sentinel, force HALF_DAY
  if (record && Number(record.breakTotalSeconds) === -2) {
    dayStatus = 'HALF_DAY';
  }

  // Late check for the current day
  let isLate = false;
  try {
    const penaltyRule = await AttendanceAutomationRule.findOne({
      where: { key: 'late_punchin_penalty', orgAccountId: req.user.orgAccountId, active: true }
    });
    if (penaltyRule && punchedInAt && assignedShift?.startTime) {
      let config = penaltyRule.config;
      if (typeof config === 'string') {
        try { config = JSON.parse(config); } catch (e) {
          try { config = JSON.parse(JSON.parse(config)); } catch (__) { config = {}; }
        }
      }

      let tiers = [];
      if (Array.isArray(config.tiers) && config.tiers.length > 0) {
        tiers = config.tiers;
      } else {
        tiers = [{ minMinutes: Number(config.lateMinutes || 15), maxMinutes: 9999, deduction: 1, frequency: 1 }];
      }

      const [sh, sm, ss] = assignedShift.startTime.split(':').map(Number);
      const shiftStartSeconds = sh * 3600 + sm * 60 + (ss || 0);

      const istDate = new Date(punchedInAt.getTime() + (5.5 * 3600 * 1000));
      const punchInSeconds = istDate.getUTCHours() * 3600 + istDate.getUTCMinutes() * 60 + istDate.getUTCSeconds();

      if (punchInSeconds > shiftStartSeconds) {
        const lateMins = Math.floor((punchInSeconds - shiftStartSeconds) / 60);
        for (const t of tiers) {
          if (lateMins >= Number(t.minMinutes) && lateMins <= Number(t.maxMinutes)) {
            isLate = true;
            break;
          }
        }
      }
    }
  } catch (_) { }

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
      totalDurationSeconds: totalWorkSeconds,
      overtimeSeconds,
      requiredWorkSeconds: REQUIRED_WORK_SECONDS,
      dayStatus,
      isLate,
      totalWorkHours: record?.totalWorkHours || null,
      assignedShift: assignedShift ? {
        id: assignedShift.id, name: assignedShift.name, shiftType: assignedShift.shiftType,
        startTime: assignedShift.startTime, endTime: assignedShift.endTime,
        workMinutes: assignedShift.workMinutes, bufferMinutes: assignedShift.bufferMinutes,
        earliestPunchInTime: assignedShift.earliestPunchInTime, latestPunchOutTime: assignedShift.latestPunchOutTime,
        minPunchOutAfterMinutes: assignedShift.minPunchOutAfterMinutes, maxPunchOutAfterMinutes: assignedShift.maxPunchOutAfterMinutes,
      } : null,
    },
  });
});

router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const REQUIRED_WORK_SECONDS = await getRequiredWorkSecondsFor(userId);
    const parsed = parseMonth(req.query.month);
    const now = new Date();
    const todayStr = todayKey(now);

    const tpl = await getEffectiveTemplate(userId);
    const effectiveHoursRule = tpl ? (tpl.effectiveHoursRule ?? tpl.effective_hours_rule ?? null) : null;

    const maxBreakSetting = await AppSetting.findOne({ where: { key: 'MAX_BREAK_DURATION' } });
    const maxBreakMinutes = maxBreakSetting ? parseInt(maxBreakSetting.value) : 0;

    const y = parsed ? parsed.y : now.getFullYear();
    const mo = parsed ? parsed.mo : now.getMonth() + 1;

    const start = new Date(y, mo - 1, 1);
    const end = new Date(y, mo, 0);
    const startKey = isoDate(start);
    const endKey = isoDate(end);

    // Fetch everything needed once
    const attendanceRows = await Attendance.findAll({
      where: { userId, date: { [Op.between]: [startKey, endKey] } },
      order: [['date', 'ASC']],
    });
    const attMap = new Map(attendanceRows.map((r) => [isoDate(r.date), r]));

    const leaveRows = await LeaveRequest.findAll({
      where: { userId, status: 'APPROVED', startDate: { [Op.lte]: endKey }, endDate: { [Op.gte]: startKey } },
    });

    // Holiday Template
    const holidayAsg = await StaffHolidayAssignment.findOne({
      where: { userId, effectiveFrom: { [Op.lte]: endKey } },
      order: [['effectiveFrom', 'DESC']]
    });
    let holidaySet = new Set();
    if (holidayAsg) {
      const hTpl = await HolidayTemplate.findByPk(holidayAsg.holidayTemplateId, {
        include: [{ model: HolidayDate, as: 'holidays', where: { active: { [Op.ne]: false } }, required: false }]
      });
      if (hTpl?.holidays) {
        hTpl.holidays.forEach(h => holidaySet.add(String(h.date)));
      }
    }

    // Weekly Off Template
    const woAsg = await StaffWeeklyOffAssignment.findOne({
      where: { userId, effectiveFrom: { [Op.lte]: endKey } },
      order: [['effectiveFrom', 'DESC']]
    });
    let woConfig = [];
    if (woAsg) {
      const wTpl = await WeeklyOffTemplate.findByPk(woAsg.weeklyOffTemplateId || woAsg.weekly_off_template_id);
      let raw = wTpl?.config;
      while (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try { raw = JSON.parse(raw); } catch (_) { break; }
      }
      woConfig = Array.isArray(raw) ? raw : [];
    }

    // Late Rule Assignment Check
    const userLateAsg = await StaffLatePunchInAssignment.findOne({
      where: {
        userId,
        orgAccountId: req.user.orgAccountId,
        active: true,
        effectiveFrom: { [Op.lte]: new Date().toISOString().split('T')[0] }
      },
      include: [{ model: LatePunchInRule, as: 'rule' }],
      order: [['effectiveFrom', 'DESC']]
    });
    const hasLateRule = !!(userLateAsg && userLateAsg.rule && userLateAsg.rule.active);

    // Late Penalty Rule Fetch
    let lateTiers = [];
    let lateRuleActive = false;
    try {
      const penaltyRule = await AttendanceAutomationRule.findOne({
        where: { key: 'late_punchin_penalty', orgAccountId: req.user.orgAccountId, active: true }
      });
      if (penaltyRule) {
        let config = penaltyRule.config;
        if (typeof config === 'string') {
          try { config = JSON.parse(config); } catch (e) {
            try { config = JSON.parse(JSON.parse(config)); } catch (__) { config = {}; }
          }
        }
        if (Array.isArray(config.tiers) && config.tiers.length > 0) {
          lateTiers = config.tiers;
        } else {
          lateTiers = [{
            minMinutes: Number(config.lateMinutes || 15),
            maxMinutes: 9999,
            deduction: Number(config.deduction || 1),
            frequency: Number(config.threshold || 3)
          }];
        }
        lateRuleActive = penaltyRule.active && config.active !== false;
      }
    } catch (_) { }

    const summary = { present: 0, absent: 0, halfDay: 0, leave: 0, overtime: 0, weeklyOff: 0, holiday: 0, lateCount: 0, latePenaltyDays: 0 };
    let lateRunningCounts = new Array(lateTiers.length).fill(0);
    const days = [];

    const totalDaysRemainingInMonth = end.getDate();
    for (let i = 0; i < totalDaysRemainingInMonth; i++) {
      const d = new Date(y, mo - 1, i + 1);
      const key = isoDate(d);
      const record = attMap.get(key);
      const isH = holidaySet.has(key);
      const isWO = isWeeklyOffForDate(woConfig, d);

      let leaveReq = null;
      for (const lr of leaveRows) {
        if (String(lr.startDate) <= key && String(lr.endDate) >= key) {
          leaveReq = lr;
          break;
        }
      }

      let dayStatus = 'ABSENT';
      let workingSeconds = 0;
      let totalDurationSeconds = 0;
      let breakSeconds = 0;
      let overtimeSeconds = 0;
      let leaveType = null;
      let lateReason = null;

      const isAdminLeave = record && (Number(record.breakTotalSeconds) === -1 || String(record.status || '').toLowerCase() === 'leave');
      const isAdminHalf = record && (Number(record.breakTotalSeconds) === -2 || String(record.status || '').toLowerCase() === 'half_day');

      // Fetch roster entry for this specific day
      const rosterEntry = await StaffRoster.findOne({ where: { userId, date: key } });
      const isRosterWO = rosterEntry?.status === 'WEEKLY_OFF';
      const isRosterHoliday = rosterEntry?.status === 'HOLIDAY';

      const shiftTpl = await getEffectiveShiftTemplate(userId, key);

      if (record?.punchedInAt && !isAdminLeave && !isAdminHalf) {
        const inAt = new Date(record.punchedInAt);
        const outAt = record.punchedOutAt ? new Date(record.punchedOutAt) : (key === todayStr ? now : inAt);
        const bBase = Number(record.breakTotalSeconds || 0);
        const bRun = record.isOnBreak && record.breakStartedAt ? diffSeconds(new Date(record.breakStartedAt), now) : 0;
        breakSeconds = bBase + bRun;
        totalDurationSeconds = Math.max(0, diffSeconds(inAt, outAt));
        workingSeconds = computeEffectiveWorkingSeconds({
          totalWorkSeconds: totalDurationSeconds,
          actualBreakSeconds: breakSeconds,
          requiredWorkSeconds: REQUIRED_WORK_SECONDS,
          maxBreakMinutes,
          effectiveHoursRule
        });
        const totalWorkMinutes = Math.floor(workingSeconds / 60);

        const { calculateOvertime } = require('../services/overtimeService');
        const orgAcc = await OrgAccount.findByPk(req.user.orgAccountId);
        const otData = await calculateOvertime({ ...record.toJSON(), totalWorkHours: workingSeconds / 3600 }, orgAcc, outAt);
        overtimeSeconds = (otData.overtimeMinutes || 0) * 60;

        if (record.status) {
          dayStatus = record.status.toUpperCase();
        } else {
          // Calculate status based on shift rules for history consistency
          if (shiftTpl) {
            if (Number.isFinite(Number(shiftTpl.halfDayThresholdMinutes)) && totalWorkMinutes < shiftTpl.halfDayThresholdMinutes) {
              dayStatus = (key === todayStr && !record.punchedOutAt) ? 'PRESENT' : 'HALF_DAY';
            } else {
              dayStatus = 'PRESENT';
            }
          } else {
            // Case 1: No shift assigned -> always PRESENT for any work
            dayStatus = 'PRESENT';
          }
        }
      } else if (record?.status && !isAdminLeave && !isAdminHalf) {
        dayStatus = record.status.toUpperCase();
        workingSeconds = Math.round((Number(record.totalWorkHours) || 0) * 3600);
        totalDurationSeconds = workingSeconds;
        breakSeconds = Number(record.breakTotalSeconds || 0);
        overtimeSeconds = (Number(record.overtimeMinutes) || 0) * 60;
      } else {
        // No attendance record or explicit admin override
        if (leaveReq || isAdminLeave) {
          dayStatus = 'LEAVE';
          leaveType = leaveReq?.leaveType || 'ADMIN';
        } else if (isAdminHalf) {
          dayStatus = 'HALF_DAY';
          if (record) {
            const inAt = record.punchedInAt ? new Date(record.punchedInAt) : null;
            const outAt = record.punchedOutAt ? new Date(record.punchedOutAt) : null;
            const baseBreak = Math.max(0, Number(record.breakTotalSeconds || 0));

            if (inAt && outAt) {
              totalDurationSeconds = Math.max(0, diffSeconds(inAt, outAt));
            } else if (inAt && key === todayStr) {
              totalDurationSeconds = Math.max(0, diffSeconds(inAt, now));
            }

            breakSeconds = baseBreak;

            if (Number.isFinite(Number(record.totalWorkHours)) && Number(record.totalWorkHours) > 0) {
              workingSeconds = Math.round(Number(record.totalWorkHours) * 3600);
            } else if (totalDurationSeconds > 0) {
              workingSeconds = computeEffectiveWorkingSeconds({
                totalWorkSeconds: totalDurationSeconds,
                actualBreakSeconds: breakSeconds,
                requiredWorkSeconds: REQUIRED_WORK_SECONDS,
                maxBreakMinutes,
                effectiveHoursRule
              });
            }

            overtimeSeconds = Math.max(0, Number(record.overtimeMinutes || 0)) * 60;
          }
        } else if (isRosterHoliday || isH) {
          dayStatus = 'HOLIDAY';
        } else if (isRosterWO || isWO) {
          dayStatus = 'WEEKLY_OFF';
        } else {
          const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const curObj = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          dayStatus = curObj > todayObj ? 'NA' : 'ABSENT';
        }
      }

      // Late Penalty (Use persisted data if available)
      let isLateThisDay = !!record?.isLate;
      let lateAmt = Number(record?.latePunchInAmount || 0);
      let lateMins = Number(record?.latePunchInMinutes || 0);

      // Robustness: If lateMins is 0 but we have a shift and a punch-in, calculate it on-the-fly
      if (lateMins === 0 && record?.punchedInAt && shiftTpl?.startTime && !isAdminLeave && !isAdminHalf) {
        try {
          const [sh, sm, ss] = shiftTpl.startTime.split(':').map(Number);
          const inAt = new Date(record.punchedInAt);
          // Create a comparison date for shift start on the same day as the punch-in
          const shiftStart = new Date(inAt);
          shiftStart.setHours(sh, sm, ss || 0, 0);

          if (inAt > shiftStart) {
            const diff = Math.floor((inAt.getTime() - shiftStart.getTime()) / 60000);
            if (diff > 0) {
              lateMins = diff;
              isLateThisDay = true;
            }
          }
        } catch (_) { /* ignore errors in dynamic calculation */ }
      }

      // Even if no rule assigned, we want to show late status and minutes on mobile
      if (lateAmt > 0) {
        lateReason = `Late Penalty: ₹${lateAmt} (${lateMins} min)`;
      } else if (isLateThisDay || lateMins > 0) {
        lateReason = `Late arrival (${lateMins} min)`;
        isLateThisDay = true; // ensure flag is set if minutes exists
      }

      if (isLateThisDay) {
        summary.lateCount++;
      }

      if (dayStatus === 'PRESENT') summary.present += 1;
      else if (dayStatus === 'OVERTIME') { summary.present += 1; summary.overtime += 1; }
      else if (dayStatus === 'ABSENT') summary.absent += 1;
      else if (dayStatus === 'HALF_DAY') summary.halfDay += 1;
      else if (dayStatus === 'LEAVE') summary.leave += 1;
      else if (dayStatus === 'HOLIDAY') summary.holiday += 1;
      else if (dayStatus === 'WEEKLY_OFF') summary.weeklyOff += 1;

      days.push({
        date: key,
        dayStatus,
        workingSeconds,
        totalDurationSeconds,
        breakSeconds,
        overtimeSeconds,
        totalWorkHours: record?.totalWorkHours || null,
        leaveType,
        isLate: isLateThisDay,
        hasLateRule,
        isPenaltyDay: lateAmt > 0,
        latePunchInAmount: lateAmt,
        latePunchInMinutes: lateMins,
        reason: lateReason
      });
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
    console.error('Attendance history error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load attendance history' });
  }
});

router.post('/start-break', async (req, res) => {
  try {
    const key = todayKey();
    const record = await Attendance.findOne({ where: { userId: req.user.id, date: key } });

    if (record?.source === 'biometric') {
      return res.status(409).json({ success: false, message: 'You have already punched in using biometric device. Mobile punch is disabled for today.' });
    }

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

    if (record?.source === 'biometric') {
      return res.status(409).json({ success: false, message: 'You have already punched in using biometric device. Mobile punch is disabled for today.' });
    }

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
    const lat = Number(req.body?.lat ?? req.body?.latitude);
    const lng = Number(req.body?.lng ?? req.body?.longitude);
    const geoCheck = await validateAssignedGeofence(req.user.id, dateKey, lat, lng);
    if (!geoCheck.ok) {
      return res.status(geoCheck.status || 403).json({
        success: false,
        message: geoCheck.message,
        geofence: geoCheck.nearest || null,
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo is required' });
    }

    const key = todayKey();

    const existing = await Attendance.findOne({ where: { userId: req.user.id, date: key } });
    if (existing?.source === 'biometric') {
      return res.status(409).json({ success: false, message: 'You have already punched in using biometric device. Mobile punch is disabled for today.' });
    }
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

    const address = req.body?.address ? String(req.body.address) : null;
    const record = existing
      ? await existing.update({
        punchedInAt: now,
        punchInPhotoUrl: photoUrl,
        orgAccountId: req.user.orgAccountId,
        latitude: lat,
        longitude: lng,
        address
      })
      : await Attendance.create({
        userId: req.user.id,
        date: key,
        punchedInAt: now,
        punchInPhotoUrl: photoUrl,
        orgAccountId: req.user.orgAccountId,
        latitude: lat,
        longitude: lng,
        address
      });

    // Calculate Early Overtime if applicable
    try {
      const orgAccount = await OrgAccount.findByPk(req.user.orgAccountId);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const eotResult = await earlyOvertimeService.calculateEarlyOvertime({
        userId: req.user.id,
        orgAccountId: req.user.orgAccountId,
        date: key,
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
      console.error('Mobile Early OT calculation error:', eotErr);
    }

    // Calculate Late Punch-In Penalty if applicable
    try {
      const orgAccount = await OrgAccount.findByPk(req.user.orgAccountId);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const lpResult = await latePunchInService.calculateLatePenalty({
        userId: req.user.id,
        orgAccountId: req.user.orgAccountId,
        date: key,
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
      console.error('Mobile Late Penalty calculation error:', lpErr);
    }

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
    const address = req.body?.address ? String(req.body.address).slice(0, 255) : null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ success: false, message: 'lat/lng required' });
    const row = await LocationPing.create({
      userId: req.user.id,
      latitude: lat,
      longitude: lng,
      accuracyMeters: Number.isFinite(accuracy) ? accuracy : null,
      address,
      source: req.body?.source ? String(req.body.source).slice(0, 32) : 'staff'
    });
    await touchDeviceInfo(req);
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
    const lat = Number(req.body?.lat ?? req.body?.latitude);
    const lng = Number(req.body?.lng ?? req.body?.longitude);
    const geoCheck = await validateAssignedGeofence(req.user.id, key, lat, lng);
    if (!geoCheck.ok) {
      return res.status(geoCheck.status || 403).json({
        success: false,
        message: geoCheck.message,
        geofence: geoCheck.nearest || null,
      });
    }
    const record = await Attendance.findOne({ where: { userId: req.user.id, date: key } });

    if (record?.source === 'biometric') {
      return res.status(409).json({ success: false, message: 'You have already punched in using biometric device. Mobile punch is disabled for today.' });
    }

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

    // Calculate attendance status based on shift template rules
    const punchedInAt = new Date(record.punchedInAt);
    const totalWorkSeconds = diffSeconds(punchedInAt, now) - breakTotalSeconds;
    const totalWorkMinutes = Math.floor(totalWorkSeconds / 60);
    const totalWorkHours = totalWorkSeconds / 3600;

    // Use centralized services for OT and Early Exit
    const { calculateOvertime } = require('../services/overtimeService');
    const earlyExitService = require('../services/earlyExitService');
    const orgAccount = await OrgAccount.findByPk(req.user.orgAccountId);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // 1. Overtime Calculation
    const otResult = await calculateOvertime({
      userId: req.user.id,
      orgAccountId: req.user.orgAccountId,
      date: key,
      totalWorkHours: totalWorkHours,
      punchedInAt: record.punchedInAt,
      punchedOutAt: now
    }, orgAccount, now, daysInMonth);

    // 2. Early Exit Calculation
    const eeResult = await earlyExitService.calculateEarlyExit({
      userId: req.user.id,
      orgAccountId: req.user.orgAccountId,
      date: key,
      punchedOutAt: now
    }, orgAccount, now, daysInMonth);

    // 3. Break Deduction Calculation
    const breakService = require('../services/breakService');
    const breakResult = await breakService.calculateBreakDeduction(record, orgAccount, now, daysInMonth);

    let status = otResult.status || 'present';
    if (record.earlyOvertimeMinutes > 0) {
      status = 'overtime';
    }

    const address = req.body?.address ? String(req.body.address) : null;

    await record.update({
      punchedOutAt: now,
      punchOutPhotoUrl: photoUrl,
      isOnBreak: false,
      breakStartedAt: null,
      breakTotalSeconds,
      status: status.toUpperCase(),
      totalWorkHours: totalWorkHours,
      overtimeMinutes: otResult.overtimeMinutes || 0,
      overtimeAmount: otResult.overtimeAmount || 0,
      overtimeRuleId: otResult.overtimeRuleId || null,
      earlyExitMinutes: eeResult.earlyExitMinutes || 0,
      earlyExitAmount: eeResult.earlyExitAmount || 0,
      earlyExitRuleId: eeResult.earlyExitRuleId || null,
      breakDeductionAmount: breakResult.breakDeductionAmount || 0,
      breakRuleId: breakResult.breakRuleId || null,
      excessBreakMinutes: breakResult.excessBreakMinutes || 0,
      punchOutLatitude: lat,
      punchOutLongitude: lng,
      punchOutAddress: address
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

      console.log(`Effective hours calculation: Total=${Math.floor(totalWorkSeconds / 60)}min, Break=${Math.floor(actualBreakSeconds / 60)}min, Rule=${effectiveHoursRule || 'default'}, MaxAllowed=${maxBreakMinutes}min, Effective=${effectiveWorkingHours.toFixed(2)}hr`);
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

        console.log(`Date ${dateStr}: Total=${Math.floor(totalWorkSeconds / 60)}min, Break=${Math.floor(actualBreakSeconds / 60)}min, Rule=${effectiveHoursRule || 'default'}, MaxAllowed=${maxBreakMinutes}min, Effective=${effectiveHours.toFixed(2)}hr`);

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
    const { latitude, longitude, accuracy, source, address } = req.body || {};

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
      address: address ? String(address).slice(0, 255) : null,
      source: source || 'mobile'
    });
    await touchDeviceInfo(req);

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

// Auto-punchout function to be called by cron job
async function processAutoPunchouts() {
  try {
    console.log('Starting auto-punchout process...');

    const now = new Date();
    const today = todayKey(now);

    // Find all staff who are punched in but not punched out today
    const pendingAttendances = await Attendance.findAll({
      where: {
        dateKey: today,
        punchedInAt: { [Op.not]: null },
        punchedOutAt: null,
        isOnBreak: false
      },
      include: [
        {
          model: StaffShiftAssignment,
          as: 'shiftAssignment',
          include: [
            {
              model: ShiftTemplate,
              as: 'template',
              where: { autoPunchoutAfterShiftEnd: { [Op.not]: null } }
            }
          ]
        }
      ]
    });

    console.log(`Found ${pendingAttendances.length} pending attendances for auto-punchout`);

    for (const attendance of pendingAttendances) {
      const shiftTemplate = attendance.shiftAssignment?.template;

      if (!shiftTemplate || !shiftTemplate.autoPunchoutAfterShiftEnd) continue;

      // Calculate shift end time
      const punchedInAt = new Date(attendance.punchedInAt);
      let shiftEndTime;

      if (shiftTemplate.shiftType === 'fixed' && shiftTemplate.startTime && shiftTemplate.endTime) {
        // For fixed shifts, use the defined end time
        const [hours, minutes, seconds] = shiftTemplate.endTime.split(':').map(Number);
        shiftEndTime = new Date(punchedInAt);
        shiftEndTime.setHours(hours, minutes, seconds || 0, 0);

        // Handle overnight shifts
        if (shiftEndTime < punchedInAt) {
          shiftEndTime.setDate(shiftEndTime.getDate() + 1);
        }
      } else {
        // For open shifts, calculate based on work minutes
        const workMinutes = shiftTemplate.workMinutes || 480; // Default 8 hours
        shiftEndTime = new Date(punchedInAt.getTime() + workMinutes * 60 * 1000);
      }

      // Calculate auto-punchout time (shift end + configured hours)
      const autoPunchoutTime = new Date(shiftEndTime.getTime() + (shiftTemplate.autoPunchoutAfterShiftEnd * 60 * 60 * 1000));

      // Check if it's time to auto-punchout
      if (now >= autoPunchoutTime) {
        console.log(`Auto-punching out user ${attendance.userId} at ${now.toISOString()}`);

        // Calculate work duration and attendance status
        const totalWorkSeconds = (now.getTime() - punchedInAt.getTime()) / 1000;
        const totalWorkMinutes = Math.floor(totalWorkSeconds / 60);
        const totalWorkHours = totalWorkSeconds / 3600;

        let status = 'present';
        let overtimeMinutes = 0;

        // Use shift template rules for attendance calculation
        if (shiftTemplate.halfDayThresholdMinutes && totalWorkMinutes < shiftTemplate.halfDayThresholdMinutes) {
          status = 'half_day';
        } else if (totalWorkMinutes < 60) { // Less than 1 hour
          status = 'absent';
        } else if (shiftTemplate.overtimeStartMinutes && totalWorkMinutes > shiftTemplate.overtimeStartMinutes) {
          status = 'overtime'; // Status includes overtime
        } else {
          status = 'present';
        }

        // Calculate overtime
        if (shiftTemplate.overtimeStartMinutes && totalWorkMinutes > shiftTemplate.overtimeStartMinutes) {
          overtimeMinutes = totalWorkMinutes - shiftTemplate.overtimeStartMinutes;
        }

        // Update attendance record
        await attendance.update({
          punchedOutAt: now,
          punchOutPhotoUrl: null, // No photo for auto-punchout
          isOnBreak: false,
          breakStartedAt: null,
          breakTotalSeconds: 0,
          status: status,
          totalWorkHours: totalWorkHours,
          overtimeMinutes: overtimeMinutes,
          autoPunchout: true, // Mark as auto-punchout
        });

        console.log(`Auto-punchout completed for user ${attendance.userId}: ${status}, ${totalWorkMinutes} mins worked, ${overtimeMinutes} mins overtime`);
      }
    }

    console.log('Auto-punchout process completed');
  } catch (error) {
    console.error('Auto-punchout process error:', error);
  }
}

// Manual endpoint to trigger auto-punchout (for testing)
router.post('/auto-punchout', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    // Only allow admin users to trigger auto-punchout
    if (!req.user.roles || !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    await processAutoPunchouts();

    res.json({
      success: true,
      message: 'Auto-punchout process completed'
    });
  } catch (error) {
    console.error('Auto-punchout endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process auto-punchout'
    });
  }
});

module.exports = router;
