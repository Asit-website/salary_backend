const { calculateSalary } = require('../src/services/payrollService');

async function test() {
  try {
    console.log('Running calculateSalary for User 185 (ranju das) for May 2026...');
    const res = await calculateSalary(185, '2026-05');
    console.log('Calculation Result:', {
      success: res.success,
      payableDays: res.attendanceSummary?.payableDays,
      ratio: res.totals?.ratio,
      grossSalary: res.totals?.grossSalary,
      netSalary: res.totals?.netSalary,
      attendanceSummary: res.attendanceSummary
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
