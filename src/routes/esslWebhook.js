const express = require('express');
const crypto = require('crypto');
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const { Attendance, StaffProfile, BiometricPunch, OrgAccount } = require('../models');
const zktecoService = require('../services/zktecoService');
const shiftService = require('../services/shiftService');

const router = express.Router();

// Helper to decrypt eSSL payload if encryption is enabled
function decryptEssl(encryptedBase64, password) {
  const key = Buffer.from(password.padEnd(32, '1'), 'utf8');
  const iv = Buffer.alloc(16, 0); // Standard all-zero IV
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// Attendance recalculation helper for a specific work date
async function recalculateUserAttendance(userId, orgId, targetDateStr) {
  const startTime = dayjs(targetDateStr).startOf('day').toDate();
  const endTime = dayjs(targetDateStr).add(1, 'day').hour(12).minute(0).toDate();

  const rawPunches = await BiometricPunch.findAll({
    where: {
      userId,
      orgAccountId: orgId,
      punchTime: {
        [Op.between]: [startTime, endTime]
      }
    },
    order: [['punchTime', 'ASC']]
  });

  if (rawPunches.length === 0) {
    const existing = await Attendance.findOne({ where: { userId, date: targetDateStr } });
    if (existing && existing.source === 'biometric') {
      await existing.destroy();
    }
    return;
  }

  // Format punches for zktecoService
  const formattedPunches = rawPunches.map(p => ({
    emp_code: '',
    punch_time: p.punchTime,
    punch_state: p.direction === 'IN' ? '0' : (p.direction === 'OUT' ? '1' : '0')
  }));

  // Deduplicate punches within 5 minutes
  const filteredPunches = [];
  let lastAcceptedMs = 0;
  for (const p of formattedPunches) {
    const punchTimeMs = new Date(p.punch_time).getTime();
    if (!lastAcceptedMs || (punchTimeMs - lastAcceptedMs) >= 5 * 60 * 1000) {
      filteredPunches.push(p);
      lastAcceptedMs = punchTimeMs;
    }
  }

  // Filter punches for shift
  const shift = await shiftService.getEffectiveShiftTemplate(userId, targetDateStr);
  const punchesForShift = zktecoService.filterPunchesForShift(filteredPunches, targetDateStr, shift);

  // Night Shift Duplicate Punch Fix
  let finalPunchesForShift = punchesForShift;
  try {
    const prevDateStr = dayjs(targetDateStr).subtract(1, 'day').format('YYYY-MM-DD');
    const prevAttendance = await Attendance.findOne({ where: { userId, date: prevDateStr } });
    if (prevAttendance && prevAttendance.punchedOutAt) {
      const prevOutTime = dayjs(prevAttendance.punchedOutAt);
      finalPunchesForShift = punchesForShift.filter(p => {
        const pt = dayjs(p.punch_time);
        const diffMin = Math.abs(pt.diff(prevOutTime, 'minute'));
        if (diffMin <= 1) return false;
        return true;
      });
    }
  } catch (err) {
    console.error(`[EsslWebhook] Error checking prev day checkout:`, err.message);
  }

  const res = await zktecoService.calculateDetails(userId, finalPunchesForShift, targetDateStr);

  if (!res) {
    const existing = await Attendance.findOne({ where: { userId, date: targetDateStr } });
    if (existing && existing.source === 'biometric') {
      await existing.destroy();
    }
    return;
  }

  const existing = await Attendance.findOne({ where: { userId, date: targetDateStr } });
  if (existing && existing.source !== 'biometric') {
    // Protect manual edits
    return;
  }

  await Attendance.upsert({
    userId,
    date: targetDateStr,
    orgAccountId: orgId,
    punchedInAt: res.punchedInAt,
    punchedOutAt: res.punchedOutAt,
    totalWorkHours: res.totalWorkHours,
    breakTotalSeconds: res.breakTotalSeconds,
    overtimeMinutes: res.overtimeMinutes,
    overtimeAmount: res.overtimeAmount,
    overtimeRuleId: res.overtimeRuleId,
    earlyExitMinutes: res.earlyExitMinutes,
    earlyExitAmount: res.earlyExitAmount,
    earlyExitRuleId: res.earlyExitRuleId,
    latePunchInMinutes: res.latePunchInMinutes,
    latePunchInAmount: res.latePunchInAmount,
    latePunchInRuleId: res.latePunchInRuleId,
    isLate: res.isLate || false,
    breakDeductionAmount: res.breakDeductionAmount,
    breakRuleId: res.breakRuleId,
    excessBreakMinutes: res.excessBreakMinutes,
    status: res.status,
    source: 'biometric',
    latitude: res.latitude,
    longitude: res.longitude,
    address: res.address,
    punchOutLatitude: res.punchOutLatitude,
    punchOutLongitude: res.punchOutLongitude,
    punchOutAddress: res.punchOutAddress,
  });
}

// POST /api/webhook/essl
router.post('/', async (req, res) => {
  try {
    let orgId = req.query.orgId || req.body.orgId;
    let payload = req.body;
    
    // 1. Handle Encrypted payload if "data" is present
    if (payload && payload.data && typeof payload.data === 'string') {
      const password = req.query.password;
      if (!password) {
        console.error('[EsslWebhook] Encrypted payload received but no password provided in query string');
        return res.status(400).send('Encryption password required');
      }
      try {
        payload = decryptEssl(payload.data, password);
      } catch (err) {
        console.error('[EsslWebhook] Decryption failed:', err.message);
        return res.status(400).send('Decryption failed');
      }
    }

    if (!payload) {
      return res.status(400).send('Empty payload');
    }

    // 2. Normalise single object or array to array of logs
    const logs = Array.isArray(payload) ? payload : [payload];
    console.log(`[EsslWebhook] Received ${logs.length} biometric logs`);

    for (const log of logs) {
      const { EmployeeCode, LogDate, Direction, DeviceName, SerialNumber, VerificationType } = log;
      if (!EmployeeCode || !LogDate) {
        console.log('[EsslWebhook] Skipping log: missing EmployeeCode or LogDate');
        continue;
      }

      // Resolve orgId for this specific punch log
      let currentOrgId = orgId;

      // If orgId is not provided in URL, try to resolve it dynamically via machine SerialNumber
      if (!currentOrgId && SerialNumber) {
        const serial = String(SerialNumber).trim().toLowerCase();
        const { AttendanceAutomationRule } = require('../models');
        const rules = await AttendanceAutomationRule.findAll({
          where: { key: 'zkteco_integration', active: true }
        });

        const matchingRule = rules.find(r => {
          try {
            const config = typeof r.config === 'string' ? JSON.parse(r.config) : r.config;
            if (config && config.serialNumber && String(config.serialNumber).trim().toLowerCase() === serial) {
              return true;
            }
            if (config && Array.isArray(config.serialNumbers) && config.serialNumbers.map(s => String(s).trim().toLowerCase()).includes(serial)) {
              return true;
            }
          } catch (_) {}
          return false;
        });

        if (matchingRule) {
          currentOrgId = matchingRule.orgAccountId;
          console.log(`[EsslWebhook] Resolved orgId ${currentOrgId} dynamically via SerialNumber: ${SerialNumber}`);
        }
      }

      // Find staff profile
      let profile;
      if (currentOrgId) {
        // Safe match: using both staffId and resolved orgAccountId
        profile = await StaffProfile.findOne({
          where: {
            staffId: String(EmployeeCode).trim(),
            orgAccountId: currentOrgId
          }
        });
      } else {
        // Fallback: global match (only if no serial number was matched or no orgId was passed)
        profile = await StaffProfile.findOne({
          where: {
            staffId: String(EmployeeCode).trim()
          }
        });
      }

      if (!profile) {
        console.log(`[EsslWebhook] Staff not found for EmployeeCode: ${EmployeeCode} (resolved orgId: ${currentOrgId})`);
        continue;
      }

      const resolvedOrgId = profile.orgAccountId;
      const punchTime = dayjs(LogDate).toDate();
      if (isNaN(punchTime.getTime())) {
        console.log(`[EsslWebhook] Invalid LogDate: ${LogDate}`);
        continue;
      }

      // 3. Upsert raw punch to database (deduplicates automatically via unique index)
      try {
        await BiometricPunch.upsert({
          userId: profile.userId,
          orgAccountId: resolvedOrgId,
          punchTime,
          direction: Direction ? String(Direction).trim() : null,
          deviceName: DeviceName ? String(DeviceName).trim() : null,
          serialNumber: SerialNumber ? String(SerialNumber).trim() : null,
          verificationType: VerificationType ? String(VerificationType).trim() : null
        });
      } catch (dbErr) {
        console.error(`[EsslWebhook] Failed to save raw punch for user ${profile.userId}:`, dbErr.message);
      }

      // 4. Recalculate attendance for the punch date (and the day before to support night shifts)
      const dateStr = dayjs(punchTime).format('YYYY-MM-DD');
      const prevDateStr = dayjs(punchTime).subtract(1, 'day').format('YYYY-MM-DD');

      try {
        await recalculateUserAttendance(profile.userId, resolvedOrgId, dateStr);
        await recalculateUserAttendance(profile.userId, resolvedOrgId, prevDateStr);
      } catch (calcErr) {
        console.error(`[EsslWebhook] Recalculation failed for user ${profile.userId}:`, calcErr.message);
      }
    }

    // eSSL server requires "Success" as response string
    return res.send('Success');
  } catch (error) {
    console.error('[EsslWebhook] Fatal error:', error);
    // Even on error, we should return Success or server error depending on robustness.
    // Standard response for client is 500 but returning 'Success' prevents eSSL retry spam.
    return res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
