const { User, PayrollCycle, PayrollLine } = require('../src/models');
const { calculateSalary } = require('../src/services/payrollService');

async function test() {
  try {
    // Mock PayrollLine.findOne to return null
    const originalFindOne = PayrollLine.findOne;
    PayrollLine.findOne = async () => null;

    const res = await calculateSalary(185, '2026-05');

    // Restore original
    PayrollLine.findOne = originalFindOne;

    console.log('Calculation Result:', {
      success: res.success,
      payableDays: res.attendanceSummary?.payableDays,
      ratio: res.totals?.ratio,
      grossSalary: res.totals?.grossSalary,
      netSalary: res.totals?.netSalary,
      earnings: res.earnings,
      deductions: res.deductions,
      incentives: res.incentives,
      attendanceSummary: res.attendanceSummary
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
