const { Attendance, StaffProfile, AttendanceAutomationRule, sequelize, OrgAccount } = require('../models');
const axios = require('axios');
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const overtimeService = require('./overtimeService');
const earlyExitService = require('./earlyExitService');
const earlyOvertimeService = require('./earlyOvertimeService');
const latePunchInService = require('./latePunchInService');
const shiftService = require('./shiftService');

/**
 * ZKTeco EasyTimePro Service
 * Handles syncing biometric attendance from ZKTeco API
 */
class ZktecoService {
    /**
     * Get API Token from ZKTeco
     */
    async getToken(url, username, password) {
        try {
            const response = await axios.post(`${url.replace(/\/$/, '')}/api-token-auth/`, {
                username,
                password
            });
            return response.data.token;
        } catch (error) {
            console.error('ZKTeco Auth Error:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with ZKTeco API');
        }
    }

    /**
     * Fetch transactions from ZKTeco
     */
    async getTransactions(url, token, params = {}) {
        try {
            const response = await axios.get(`${url.replace(/\/$/, '')}/iclock/api/transactions/`, {
                headers: { 'Authorization': `Token ${token}` },
                params: {
                    ...params,
                    page_size: 2000
                }
            });
            return response.data.data || response.data.results || response.data;
        } catch (error) {
            console.error('ZKTeco Fetch Error:', error.response?.data || error.message);
            throw new Error('Failed to fetch transactions from ZKTeco API');
        }
    }

    isNightShift(shift) {
        if (!shift || !shift.startTime || !shift.endTime) return false;
        const [sh] = shift.startTime.split(':').map(Number);
        const [eh] = shift.endTime.split(':').map(Number);
        return sh > eh || (sh === eh && shift.startTime > shift.endTime);
    }

    filterPunchesForShift(punches, dateStr, shift) {
        const [sh, sm] = (shift?.startTime || '09:00').split(':').map(Number);
        const [eh, em] = (shift?.endTime || '18:00').split(':').map(Number);
        
        let startTs = dayjs(dateStr).hour(sh).minute(sm).subtract(4, 'hour');
        let endTs = dayjs(dateStr).hour(eh).minute(em).add(10, 'hour');
        
        if (this.isNightShift(shift)) {
            endTs = endTs.add(1, 'day');
        }
        
        const parseTime = (str) => {
            const d = dayjs(str);
            return d.isValid() ? d.toDate() : new Date(str);
        };

        return punches.filter(p => {
            const pt = dayjs(p.punch_time);
            return pt.isAfter(startTs) && pt.isBefore(endTs);
        });
    }

    /**
     * Process multi-punches for a single staff on a single day
     * Logic: 
     * - First punch = In, Last = Out
     * - Pairs (P1-P2, P3-P4, ...) = Work Time
     * - Gaps (P2-P3, P4-P5, ...) = Break Time
     */
    async calculateDetails(userId, punches, date) {
        if (!punches || punches.length < 1) return null;

        const sorted = punches.map(p => {
            const dt = new Date(p.punch_time);
            dt.setSeconds(0);
            dt.setMilliseconds(0);
            return {
                ...p,
                punch_time: dt,
                state: parseInt(p.punch_state)
            };
        }).sort((a, b) => a.punch_time - b.punch_time);

        // Identify boundaries: Absolute First and Absolute Last
        const startIdx = 0;
        const endIdx = sorted.length - 1;

        const dayPunches = sorted.slice(startIdx, endIdx + 1);
        if (dayPunches.length === 0) return null;

        const firstIn = dayPunches[0].punch_time;
        const lastOut = dayPunches.length > 1 ? dayPunches[dayPunches.length - 1].punch_time : null;

        let totalWorkSeconds = 0;
        let totalBreakSeconds = 0;

        // Iterate through segments within the day's boundaries
        for (let i = 0; i < dayPunches.length - 1; i++) {
            const p1 = dayPunches[i];
            const p2 = dayPunches[i + 1];
            const duration = Math.max(0, Math.round((p2.punch_time - p1.punch_time) / 1000));

            // Logic: 
            // - Gap is BREAK ONLY if it starts with Break In (2) AND ends with Break Out (3).
            // - Every other gap (including 1-0, 0-0, etc.) is treated as WORK.

            if (p1.state === 2 && p2.state === 3) {
                totalBreakSeconds += duration;
            } else {
                totalWorkSeconds += duration;
            }
        }

        const workMinutes = totalWorkSeconds / 60;
        const shift = await shiftService.getEffectiveShiftTemplate(userId, date);

        // Declare local variables for results
        let overtimeMinutes = 0;
        let overtimeAmount = 0;
        let overtimeRuleId = null;
        let earlyOvertimeMinutes = 0;
        let earlyOvertimeAmount = 0;
        let earlyOvertimeRuleId = null;
        let earlyExitMinutes = 0;
        let earlyExitAmount = 0;
        let earlyExitRuleId = null;
        let breakDeductionAmount = 0;
        let breakRuleId = null;
        let excessBreakMinutes = 0;
        let latePunchInMinutes = 0;
        let latePunchInAmount = 0;
        let latePunchInRuleId = null;
        let isLate = false;
        let status = 'PRESENT';

        // Fetch Org ID to get rules
        const staff = await StaffProfile.findOne({ where: { userId } });
        const orgAccountObj = await OrgAccount.findByPk(staff?.orgAccountId);

        if (orgAccountObj) {
            const daysInMonth = new Date(new Date(date).getFullYear(), new Date(date).getMonth() + 1, 0).getDate();

            // 1. Overtime Calculation
            const otResult = await overtimeService.calculateOvertime({
                userId,
                orgAccountId: staff.orgAccountId,
                date,
                totalWorkHours: (workMinutes / 60),
                punchedInAt: firstIn,
                punchedOutAt: lastOut
            }, orgAccountObj, daysInMonth, new Date(date));

            overtimeMinutes = otResult.overtimeMinutes;
            overtimeAmount = otResult.overtimeAmount;
            overtimeRuleId = otResult.overtimeRuleId;
            if (otResult.status) status = otResult.status;

            // If single punch (no check-out), ensure it's marked as PRESENT initially
            if (!lastOut && status !== 'LEAVE') status = 'PRESENT';

            // 1.5 Early Overtime Calculation
            const eotResult = await earlyOvertimeService.calculateEarlyOvertime({
                userId,
                orgAccountId: staff.orgAccountId,
                date,
                punchedInAt: firstIn
            }, orgAccountObj, daysInMonth, new Date(date));

            earlyOvertimeMinutes = eotResult.earlyOvertimeMinutes;
            earlyOvertimeAmount = eotResult.earlyOvertimeAmount;
            earlyOvertimeRuleId = eotResult.earlyOvertimeRuleId;

            // 3. Early Exit Calculation
            const eeResult = await earlyExitService.calculateEarlyExit({
                userId,
                orgAccountId: staff.orgAccountId,
                date,
                punchedOutAt: lastOut
            }, orgAccountObj, daysInMonth, new Date(date));

            // 4. Late Punch-In Calculation
            const lpResult = await latePunchInService.calculateLatePenalty({
                userId,
                orgAccountId: staff.orgAccountId,
                date,
                punchedInAt: firstIn
            }, orgAccountObj, daysInMonth, new Date(date));

            // 5. Break Deduction Calculation
            const breakService = require('./breakService');
            // Construct a virtual attendance record for break calculation
            const virtualRecord = {
                userId,
                orgAccountId: staff.orgAccountId,
                date,
                breakTotalSeconds: totalBreakSeconds
            };
            const breakResult = await breakService.calculateBreakDeduction(virtualRecord, orgAccountObj, date, daysInMonth);

            earlyExitMinutes = eeResult.earlyExitMinutes;
            earlyExitAmount = eeResult.earlyExitAmount;
            earlyExitRuleId = eeResult.earlyExitRuleId;

            latePunchInMinutes = lpResult.latePunchInMinutes;
            latePunchInAmount = lpResult.latePunchInAmount;
            latePunchInRuleId = lpResult.latePunchInRuleId;
            isLate = lpResult.isLate || (latePunchInMinutes > 0);

            breakDeductionAmount = breakResult.breakDeductionAmount;
            breakRuleId = breakResult.breakRuleId;
            excessBreakMinutes = breakResult.excessBreakMinutes;
        }

        return {
            punchedInAt: firstIn,
            punchedOutAt: lastOut,
            totalWorkHours: (totalWorkSeconds / 3600).toFixed(2),
            breakTotalSeconds: totalBreakSeconds,
            overtimeMinutes,
            overtimeAmount,
            overtimeRuleId,
            earlyExitMinutes,
            earlyExitAmount,
            earlyExitRuleId,
            breakDeductionAmount,
            breakRuleId,
            excessBreakMinutes,
            earlyOvertimeMinutes,
            earlyOvertimeAmount,
            earlyOvertimeRuleId,
            latePunchInMinutes,
            latePunchInAmount,
            latePunchInRuleId,
            isLate,
            status,
            latitude: dayPunches[0].latitude,
            longitude: dayPunches[0].longitude,
            address: dayPunches[0].gps_location,
            punchOutLatitude: dayPunches[dayPunches.length - 1].latitude,
            punchOutLongitude: dayPunches[dayPunches.length - 1].longitude,
            punchOutAddress: dayPunches[dayPunches.length - 1].gps_location,
        };
    }

    /**
     * Sync transactions for a specific organization
     */
    async syncTransactionsForOrg(orgId, targetDate = null) {
        console.log(`[ZktecoSync] Starting sync for Org: ${orgId}`);

        const rule = await AttendanceAutomationRule.findOne({
            where: { key: 'zkteco_integration', orgAccountId: orgId, active: true }
        });

        if (!rule) {
            console.log(`[ZktecoSync] No active zkteco_integration rule for Org: ${orgId}`);
            return;
        }

        let config;
        try {
            config = typeof rule.config === 'string' ? JSON.parse(rule.config) : rule.config;
        } catch (e) {
            console.error(`[ZktecoSync] Invalid config JSON for Org: ${orgId}`, e.message);
            return;
        }

        console.log(`[ZktecoSync] Config loaded:`, JSON.stringify({ ...config, password: '***' }));

        const {
            url = 'http://15.206.144.225:8081/',
            username = 'admin',
            password = 'Admin@123',
            companyId // Optional: for multi-tenant ZKTeco setups
        } = config || {};

        if (!url || !username || !password) {
            console.log(`[ZktecoSync] Missing url/username/password in config`);
            return;
        }

        try {
            console.log(`[ZktecoSync] Getting token from: ${url}`);
            const token = await this.getToken(url, username, password);
            
            const nowIST = dayjs().add(5.5, 'hour');
            const datesToSync = [];
            if (targetDate) {
                datesToSync.push(targetDate);
            } else {
                // Sync last 12 days as requested
                for (let i = 0; i <= 12; i++) {
                    datesToSync.push(nowIST.subtract(i, 'day').format('YYYY-MM-DD'));
                }
                datesToSync.reverse(); // Reverse to process oldest first (chronological order)
            }
            console.log(`[ZktecoSync] Dates to sync: ${datesToSync.join(', ')}`);

            for (const dateStr of datesToSync) {
                console.log(`[ZktecoSync] Fetching transactions for date: ${dateStr}`);

                const lookAheadEnd = dayjs(dateStr).add(1, 'day').hour(12).minute(0).format('YYYY-MM-DD HH:mm:ss');
                let rawResult = await this.getTransactions(url, token, {
                    start_time: `${dateStr} 00:00:00`,
                    end_time: lookAheadEnd
                });

                // Handle different response shapes
                let transactions;
                if (Array.isArray(rawResult)) {
                    transactions = rawResult;
                } else if (rawResult && Array.isArray(rawResult.data)) {
                    transactions = rawResult.data;
                } else if (rawResult && Array.isArray(rawResult.results)) {
                    transactions = rawResult.results;
                } else {
                    console.log(`[ZktecoSync] No transactions or unexpected shape for ${dateStr}`);
                    continue;
                }

                if (!transactions || transactions.length === 0) continue;

                // Group transactions by staff (emp_code)
                const staffGroups = {};
                transactions.forEach(t => {
                    const code = String(t.emp_code).trim().toLowerCase();
                    if (!staffGroups[code]) staffGroups[code] = [];
                    staffGroups[code].push(t);
                });

                const empCodes = Object.keys(staffGroups);
                const staffProfiles = await StaffProfile.findAll({
                    where: { staffId: empCodes, orgAccountId: orgId }
                });

                const staffMap = new Map();
                staffProfiles.forEach(p => {
                    if (p.staffId) {
                        staffMap.set(String(p.staffId).trim().toLowerCase(), p.userId);
                    }
                });

                const parseTime = (str) => {
                    const d = dayjs(str);
                    return d.isValid() ? d.toDate() : new Date(str);
                };

                for (const [empCode, punches] of Object.entries(staffGroups)) {
                    const userId = staffMap.get(String(empCode).trim().toLowerCase());
                    if (!userId) continue;

                    // Filter punches for 5-minute throttling (Deduplication)
                    const sortedPunches = punches.sort((a, b) => parseTime(a.punch_time) - parseTime(b.punch_time));
                    const filteredPunches = [];
                    let lastAcceptedMs = 0;

                    for (const p of sortedPunches) {
                        const punchTimeMs = parseTime(p.punch_time).getTime();
                        if (!lastAcceptedMs || (punchTimeMs - lastAcceptedMs) >= 5 * 60 * 1000) {
                            filteredPunches.push(p);
                            lastAcceptedMs = punchTimeMs;
                        }
                    }

                    // Merging logic removed as requested. Using filtered biometric punches only.
                    const shift = await shiftService.getEffectiveShiftTemplate(userId, dateStr);
                    const punchesForShift = this.filterPunchesForShift(filteredPunches, dateStr, shift);
                    
                    // Night Shift Duplicate Punch Fix:
                    // Fetch the previous day's attendance record.
                    // If it exists and has a non-null punchedOutAt time, check if any of the punches
                    // in punchesForShift match that checkout time within 1 minute.
                    // If so, filter them out so they aren't processed as fresh check-ins today.
                    let finalPunchesForShift = punchesForShift;
                    try {
                        const prevDateStr = dayjs(dateStr).subtract(1, 'day').format('YYYY-MM-DD');
                        const prevAttendance = await Attendance.findOne({ where: { userId, date: prevDateStr } });
                        if (prevAttendance && prevAttendance.punchedOutAt) {
                            const prevOutTime = dayjs(prevAttendance.punchedOutAt);
                            finalPunchesForShift = punchesForShift.filter(p => {
                                const pt = dayjs(p.punch_time);
                                const diffMin = Math.abs(pt.diff(prevOutTime, 'minute'));
                                if (diffMin <= 1) {
                                    console.log(`[ZktecoSync] Filtered out punch at ${p.punch_time} for user ${userId} because it was used as punch-out on ${prevDateStr}`);
                                    return false;
                                }
                                return true;
                            });
                        }
                    } catch (err) {
                        console.error(`[ZktecoSync] Error checking prev day checkout for user ${userId}:`, err.message);
                    }

                    const res = await this.calculateDetails(userId, finalPunchesForShift, dateStr);

                    if (!res) {
                        // If no valid punches remain (e.g. they were all filtered out as yesterday's checkout)
                        // and there is an existing biometric record, we should clean it up (delete it)
                        // to correct the false check-in from previous sync runs!
                        try {
                            const existing = await Attendance.findOne({ where: { userId, date: dateStr } });
                            if (existing && existing.source === 'biometric') {
                                console.log(`[ZktecoSync] CLEANUP: Deleting false check-in record for user ${userId} on ${dateStr} since all punches were deduplicated.`);
                                await existing.destroy();
                            }
                        } catch (err) {
                            console.error(`[ZktecoSync] Error cleaning up false check-in for user ${userId} on ${dateStr}:`, err.message);
                        }
                        continue;
                    }

                    // Sync with Attendance table
                    try {
                        const existing = await Attendance.findOne({ where: { userId, date: dateStr } });
                        
                        // PROTECT MANUAL EDITS: 
                        // If a record already exists and its source is NOT 'biometric', 
                        // it means it was manually edited or marked via mobile. 
                        // In this case, we SKIP the ZKTeco overwrite.
                        if (existing && existing.source !== 'biometric') {
                            console.log(`[ZktecoSync] SKIP: Manual/Mobile record found for ${empCode} on ${dateStr}. Protecting edits.`);
                            continue;
                        }

                        await Attendance.upsert({
                            userId,
                            date: dateStr,
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
                        console.log(`[ZktecoSync] SUCCESS: ${empCode} on ${dateStr}`);
                    } catch (e) {
                        console.error(`[ZktecoSync] DB Error: ${e.message}`);
                    }
                }
            }
            console.log(`[ZktecoSync] Completed Org ${orgId}`);
        } catch (error) {
            console.error(`[ZktecoSync] Sync failed for Org ${orgId}:`, error.message);
        }
    }
}

module.exports = new ZktecoService();
