const { Attendance, StaffProfile, AttendanceAutomationRule, sequelize, OrgAccount } = require('../models');
const axios = require('axios');
const { Op } = require('sequelize');
const overtimeService = require('./overtimeService');
const earlyExitService = require('./earlyExitService');
const earlyOvertimeService = require('./earlyOvertimeService');
const latePunchInService = require('./latePunchInService');

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

    /**
     * Helper to get effective shift template
     */
    async getShiftTemplate(userId, date) {
        const { StaffShiftAssignment, ShiftTemplate } = require('../models');
        const asg = await StaffShiftAssignment.findOne({
            where: {
                userId,
                effectiveFrom: { [Op.lte]: date }
            },
            order: [['effectiveFrom', 'DESC']],
            include: [{ model: ShiftTemplate, as: 'template' }]
        });
        return asg?.template;
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

        const sorted = punches.map(p => ({
            ...p,
            punch_time: new Date(p.punch_time),
            state: parseInt(p.punch_state)
        })).sort((a, b) => a.punch_time - b.punch_time);

        // Identify boundaries: First In (0) and Last Out (1)
        const firstInIdx = sorted.findIndex(p => p.state === 0);
        const reversed = [...sorted].reverse();
        const lastOutIdxRaw = reversed.findIndex(p => p.state === 1);
        const lastOutIdx = lastOutIdxRaw === -1 ? -1 : (sorted.length - 1 - lastOutIdxRaw);

        // Fallback to absolute first/last if master states are missing
        const startIdx = firstInIdx === -1 ? 0 : firstInIdx;
        const endIdx = lastOutIdx === -1 ? sorted.length - 1 : lastOutIdx;

        const dayPunches = sorted.slice(startIdx, endIdx + 1);
        if (dayPunches.length === 0) return null;

        const firstIn = dayPunches[0].punch_time;
        const lastOut = dayPunches[dayPunches.length - 1].punch_time;

        let totalWorkSeconds = 0;
        let totalBreakSeconds = 0;

        // Iterate through segments within the day's boundaries
        for (let i = 0; i < dayPunches.length - 1; i++) {
            const p1 = dayPunches[i];
            const p2 = dayPunches[i + 1];
            const duration = Math.max(0, Math.floor((p2.punch_time - p1.punch_time) / 1000));

            // Logic: 
            // - Gap is BREAK ONLY if it starts with Break In (2) AND ends with Break Out (3).
            // - Every other gap (including 1-0, 0-0, etc.) is treated as WORK.

            if (p1.state === 2 && p2.state === 3) {
                totalBreakSeconds += duration;
            } else {
                totalWorkSeconds += duration;
            }
        }

        const workMinutes = Math.floor(totalWorkSeconds / 60);
        const shift = await this.getShiftTemplate(userId, date);

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
            }, orgAccountObj, date, daysInMonth);

            overtimeMinutes = otResult.overtimeMinutes;
            overtimeAmount = otResult.overtimeAmount;
            overtimeRuleId = otResult.overtimeRuleId;
            if (otResult.status) status = otResult.status;

            // 1.5 Early Overtime Calculation
            const eotResult = await earlyOvertimeService.calculateEarlyOvertime({
                userId,
                orgAccountId: staff.orgAccountId,
                date,
                punchedInAt: firstIn
            }, orgAccountObj, date, daysInMonth);

            earlyOvertimeMinutes = eotResult.earlyOvertimeMinutes;
            earlyOvertimeAmount = eotResult.earlyOvertimeAmount;
            earlyOvertimeRuleId = eotResult.earlyOvertimeRuleId;

            // 3. Early Exit Calculation
            const eeResult = await earlyExitService.calculateEarlyExit({
                userId,
                orgAccountId: staff.orgAccountId,
                date,
                punchedOutAt: lastOut
            }, orgAccountObj, date, daysInMonth);

            // 4. Late Punch-In Calculation
            const lpResult = await latePunchInService.calculateLatePenalty({
                userId,
                orgAccountId: staff.orgAccountId,
                date,
                punchedInAt: firstIn
            }, orgAccountObj, date, daysInMonth);

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
            console.log(`[ZktecoSync] Token acquired. Fetching transactions for date: ${targetDate || 'today'}`);
            const dateStr = targetDate || new Date().toISOString().split('T')[0];

            let rawResult = await this.getTransactions(url, token, {
                start_time: `${dateStr} 00:00:00`,
                end_time: `${dateStr} 23:59:59`
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
                console.log(`[ZktecoSync] Unexpected response shape:`, JSON.stringify(rawResult)?.slice(0, 200));
                transactions = [];
            }

            if (!transactions || transactions.length === 0) {
                console.log(`[ZktecoSync] No transactions found for date: ${dateStr}`);
                return;
            }

            console.log(`[ZktecoSync] ${transactions.length} total transactions fetched from API.`);

            // Group transactions by staff (emp_code)
            const staffGroups = {};
            transactions.forEach(t => {
                const code = String(t.emp_code).trim().toLowerCase();
                if (!staffGroups[code]) staffGroups[code] = [];
                staffGroups[code].push(t);
            });

            // Fetch staff mappings
            const empCodes = Object.keys(staffGroups);
            console.log(`[ZktecoSync] Unique Emp Codes found in transactions:`, empCodes);

            const staffProfiles = await StaffProfile.findAll({
                where: { staffId: empCodes, orgAccountId: orgId }
            });

            console.log(`[ZktecoSync] Found ${staffProfiles.length} matching staff profiles`);
            staffProfiles.forEach(p => console.log(`[ZktecoSync]  staffId="${p.staffId}" -> userId=${p.userId}`));

            const staffMap = new Map();
            staffProfiles.forEach(p => {
                if (p.staffId) {
                    staffMap.set(String(p.staffId).trim().toLowerCase(), p.userId);
                }
            });

            console.log(`[ZktecoSync] Staff Map size: ${staffMap.size}`);

            for (const [empCode, punches] of Object.entries(staffGroups)) {
                const userId = staffMap.get(String(empCode).trim().toLowerCase());
                if (!userId) {
                    console.log(`[ZktecoSync] SKIP: No matching StaffProfile for emp_code "${empCode}" (Org ${orgId})`);
                    continue;
                }

                console.log(`[ZktecoSync] MATCH: emp_code "${empCode}" -> userId ${userId}. Calculating details with ${punches.length} punches.`);
                const res = await this.calculateDetails(userId, punches, dateStr);
                
                if (!res) {
                    console.log(`[ZktecoSync] FAIL: calculateDetails returned null for userId ${userId}`);
                    continue;
                }

                // Sync with Attendance table
                try {
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
                    console.log(`[ZktecoSync] SUCCESS: Saved attendance for userId ${userId} on ${dateStr}`);
                } catch (upsertError) {
                    console.error(`[ZktecoSync] DB ERROR for userId ${userId}:`, upsertError.message);
                }
            }

            console.log(`[ZktecoSync] Completed sync for Org: ${orgId}`);
        } catch (error) {
            console.error(`[ZktecoSync] Sync failed for Org: ${orgId}:`, error.message);
        }
    }
}

module.exports = new ZktecoService();
