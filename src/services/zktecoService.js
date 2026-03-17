const axios = require('axios');
const { Attendance, StaffProfile, AttendanceAutomationRule, sequelize } = require('../models');
const { Op } = require('sequelize');

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

        let status = 'present';
        let overtimeMinutes = 0;

        if (shift) {
            if (Number.isFinite(Number(shift.overtimeStartMinutes)) && workMinutes > shift.overtimeStartMinutes) {
                overtimeMinutes = workMinutes - shift.overtimeStartMinutes;
                status = 'overtime';
            } else if (Number.isFinite(Number(shift.halfDayThresholdMinutes)) && workMinutes < shift.halfDayThresholdMinutes) {
                status = 'half_day';
            } else {
                status = 'present';
            }
        } else {
            // Case 1: No shift assigned -> always present
            if (workMinutes < 1) return null; // Still handle empty data
            status = 'present';
            overtimeMinutes = 0;
        }

        return {
            punchedInAt: firstIn,
            punchedOutAt: lastOut,
            totalWorkHours: (totalWorkSeconds / 3600).toFixed(2),
            breakTotalSeconds: totalBreakSeconds,
            overtimeMinutes,
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

            console.log(`[ZktecoSync] ${transactions.length} transactions fetched. Processing...`);

            // Group transactions by staff (emp_code)
            const staffGroups = {};
            transactions.forEach(t => {
                const code = t.emp_code;
                if (!staffGroups[code]) staffGroups[code] = [];
                staffGroups[code].push(t);
            });

            // Fetch staff mappings
            const empCodes = Object.keys(staffGroups);
            console.log(`[ZktecoSync] Emp codes from ZKTeco: ${JSON.stringify(empCodes)} (Org ${orgId})`);

            const staffProfiles = await StaffProfile.findAll({
                where: { staffId: empCodes, orgAccountId: orgId }
            });

            console.log(`[ZktecoSync] Found ${staffProfiles.length} matching staff profiles`);
            staffProfiles.forEach(p => console.log(`[ZktecoSync]  staffId="${p.staffId}" -> userId=${p.userId}`));

            const staffMap = new Map(staffProfiles.map(p => [String(p.staffId), p.userId]));

            for (const [empCode, punches] of Object.entries(staffGroups)) {
                const userId = staffMap.get(String(empCode));
                if (!userId) {
                    console.log(`[ZktecoSync] No staff mapping for emp_code: "${empCode}" (Org ${orgId}). Check that staffId "${empCode}" exists in staff_profiles with org_account_id=${orgId}`);
                    continue;
                }

                const res = await this.calculateDetails(userId, punches, dateStr);
                if (!res) continue;

                // Sync with Attendance table
                await Attendance.upsert({
                    userId,
                    date: dateStr,
                    orgAccountId: orgId,
                    punchedInAt: res.punchedInAt,
                    punchedOutAt: res.punchedOutAt,
                    totalWorkHours: res.totalWorkHours,
                    breakTotalSeconds: res.breakTotalSeconds,
                    overtimeMinutes: res.overtimeMinutes,
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

            console.log(`[ZktecoSync] Completed sync for Org: ${orgId}`);
        } catch (error) {
            console.error(`[ZktecoSync] Sync failed for Org: ${orgId}:`, error.message);
        }
    }
}

module.exports = new ZktecoService();
