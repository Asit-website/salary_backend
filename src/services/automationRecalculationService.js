const { Attendance, OrgAccount, PayrollCycle, User } = require('../models');
const overtimeService = require('./overtimeService');
const earlyOvertimeService = require('./earlyOvertimeService');
const earlyExitService = require('./earlyExitService');
const latePunchInService = require('./latePunchInService');
const breakService = require('./breakService');
const dayjs = require('dayjs');
const { Op } = require('sequelize');

class AutomationRecalculationService {
    /**
     * Recalculates attendance records for a specific user and date range.
     * @param {number} userId 
     * @param {number} orgAccountId 
     * @param {string} fromDate - YYYY-MM-DD
     * @param {string} toDate - YYYY-MM-DD
     */
    async recalculateAttendance(userId, orgAccountId, fromDate, toDate) {
        console.log(`[Recalculation] Starting for User ${userId}, Org ${orgAccountId} from ${fromDate} to ${toDate}`);

        // 1. Fetch range of months involved to check payroll locks
        const startMonth = dayjs(fromDate).format('YYYY-MM');
        const endMonth = dayjs(toDate).format('YYYY-MM');

        // Simple logic to get all month keys in between
        const months = [];
        let curr = dayjs(fromDate).startOf('month');
        const last = dayjs(toDate).startOf('month');
        while (curr.isBefore(last) || curr.isSame(last)) {
            months.push(curr.format('YYYY-MM'));
            curr = curr.add(1, 'month');
        }

        const lockedCycles = await PayrollCycle.findAll({
            where: {
                orgAccountId,
                monthKey: months,
                status: { [Op.in]: ['LOCKED', 'PAID'] }
            }
        });

        const lockedMonths = lockedCycles.map(c => c.monthKey);
        if (lockedMonths.length > 0) {
            console.log(`[Recalculation] WARNING: Some months are locked/paid: ${lockedMonths.join(', ')}. Skipping those.`);
        }

        // 2. Fetch attendance records
        const attendanceRecords = await Attendance.findAll({
            where: {
                userId,
                orgAccountId,
                date: {
                    [Op.between]: [fromDate, toDate]
                }
            },
            order: [['date', 'ASC']]
        });

        if (attendanceRecords.length === 0) {
            console.log(`[Recalculation] No attendance records found for range.`);
            return { success: true, processed: 0, lockedSkipped: lockedMonths.length };
        }

        const orgAccount = await OrgAccount.findByPk(orgAccountId);
        const user = await User.findByPk(userId);

        // Prepare shared data (salary etc.)
        let sv = {};
        if (user?.salaryValues) {
            try { sv = typeof user.salaryValues === 'string' ? JSON.parse(user.salaryValues) : user.salaryValues; } catch (e) { sv = {}; }
        }
        const basic = Number(user?.basicSalary || 0) || Number(sv?.earnings?.basic_salary || sv?.earnings?.BASIC_SALARY || 0);
        const da = Number(user?.da || 0) || Number(sv?.earnings?.da || sv?.earnings?.DA || 0);
        const gross = Number(user?.grossSalary || 0) || Number(sv?.earnings?.gross_salary || sv?.earnings?.GROSS_SALARY || 0) || (basic + da);
        const dailySalary = gross / 30; // Defaulting to 30 days for now, similar to services

        let processedCount = 0;

        // Group by month for LatePunchIn occurrence logic if needed
        // But for now, we'll process each day. 
        // Note: LatePunchIn occurrence logic usually runs at the end of the month or during sync.
        // If we recalculate backdated, we might need to re-run the WHOLE month's late count.

        const monthGroups = {};
        attendanceRecords.forEach(rec => {
            const m = dayjs(rec.date).format('YYYY-MM');
            if (lockedMonths.includes(m)) return; // Skip locked months
            if (!monthGroups[m]) monthGroups[m] = [];
            monthGroups[m].push(rec);
        });

        for (const [monthKey, rows] of Object.entries(monthGroups)) {
            console.log(`[Recalculation] Processing ${rows.length} records for ${monthKey}`);

            // Special handling for Late Punch-In (requires month context for occurrences)
            const lateResult = await latePunchInService.calculateMonthlyLateDetails(
                userId,
                orgAccountId,
                monthKey,
                rows,
                dailySalary
            );

            // lateResult.rows now contains updated latePunchInMinutes and latePunchInAmount
            // Now calculate other daily rules for each row
            for (const row of lateResult.rows) {
                // Overtime
                const ot = await overtimeService.calculateOvertime(row, orgAccount);

                // Early Overtime
                const eot = await earlyOvertimeService.calculateEarlyOvertime(row, orgAccount);

                // Early Exit
                const ee = await earlyExitService.calculateEarlyExit(row, orgAccount, 30, new Date(), dailySalary);

                // Break Deduction
                const brk = await breakService.calculateBreakDeduction(row, orgAccount, 30, new Date(), dailySalary);

                // Determine final status
                let finalStatus = row.status || 'present';
                
                // Use lowercase for logic
                const currentStatusLower = finalStatus.toLowerCase();
                
                // If it was 'overtime' but now has no OT minutes, reset to 'present'
                if (currentStatusLower === 'overtime' && (!ot.overtimeMinutes || ot.overtimeMinutes <= 0)) {
                    finalStatus = 'present';
                }
                
                // If overtime logic returns a status (like 'overtime'), use it
                if (ot.status) {
                    finalStatus = ot.status.toLowerCase();
                }

                // If late but status is still present, keep as present (the late details are tracked in other fields)
                if ((row.latePunchInMinutes || 0) > 0 && finalStatus.toLowerCase() === 'present') {
                    finalStatus = 'present';
                }

                // Update the database record
                await row.update({
                    latePunchInMinutes: row.latePunchInMinutes || 0,
                    latePunchInAmount: row.latePunchInAmount || 0,
                    latePunchInRuleId: row.latePunchInRuleId || null,
                    isLate: (row.latePunchInMinutes || 0) > 0,

                    overtimeMinutes: ot.overtimeMinutes || 0,
                    overtimeAmount: ot.overtimeAmount || 0,
                    overtimeRuleId: ot.overtimeRuleId || null,

                    earlyOvertimeMinutes: eot.earlyOvertimeMinutes || 0,
                    earlyOvertimeAmount: eot.earlyOvertimeAmount || 0,
                    earlyOvertimeRuleId: eot.earlyOvertimeRuleId || null,

                    earlyExitMinutes: ee.earlyExitMinutes || 0,
                    earlyExitAmount: ee.earlyExitAmount || 0,
                    earlyExitRuleId: ee.earlyExitRuleId || null,

                    breakDeductionAmount: brk.breakDeductionAmount || 0,
                    breakRuleId: brk.breakRuleId || null,
                    excessBreakMinutes: brk.excessBreakMinutes || 0,

                    status: finalStatus
                });
                processedCount++;
            }
        }

        console.log(`[Recalculation] Finished. Processed: ${processedCount}, LockedMonthsSkipped: ${lockedMonths.length}`);
        return { success: true, processed: processedCount, lockedMonthsSkipped: lockedMonths.length };
    }
}

module.exports = new AutomationRecalculationService();
