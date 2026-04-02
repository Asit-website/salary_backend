const { Attendance, OrgAccount, User, LatePunchInRule, StaffLatePunchInAssignment, PayrollCycle } = require('./src/models');
const { calculateSalary } = require('./src/services/payrollService');

async function test() {
    const userId = 63; // Raghav
    const monthKey = '2026-04';
    
    console.log('--- Simulating Salary Calculation for Raghav ---');
    
    const user = await User.findByPk(userId, { include: ['orgAccount'] });
    if (!user) { console.log('User not found'); return; }

    const cycle = { monthKey };
    
    // We need to simulate the environment for calculateSalary
    try {
        const staffList = [user];
        const results = [];
        
        // Simulating the loop in computeMonthlySalary/regenerate
        for (const u of staffList) {
            const res = await calculateSalary(cycle, u, null);
            results.push(res);
        }

        const res = results[0];
        console.log('--- CALCULATION RESULT ---');
        console.log('User:', res.userId);
        console.log('Gross:', res.totals.grossSalary);
        console.log('Deductions:', JSON.stringify(res.deductions, null, 2));
        console.log('AttendanceSummary:', JSON.stringify(res.attendanceSummary, null, 2));
        console.log('Late Count:', res.attendanceSummary?.lateCount);
        console.log('Late Penalty:', res.attendanceSummary?.latePunchInPenalty);
    } catch (e) {
        console.error('Calculation Error:', e);
    }
}

test().then(() => process.exit()).catch(e => { console.error(e); process.exit(1); });
