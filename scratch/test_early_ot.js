const dayjs = require('dayjs');
const { calculateOvertime } = require('../src/services/overtimeService');
const { sequelize, OvertimeRule, OrgAccount, StaffOvertimeAssignment, User, ShiftTemplate } = require('../src/models');

async function test() {
  try {
    console.log('--- Starting Early OT Test ---');

    // 1. Setup Mock Data in DB
    const org = await OrgAccount.create({ name: 'Test Org' });
    const user = await User.create({ 
      phone: '1234567890', 
      orgAccountId: org.id,
      basicSalary: 30000 
    });

    const shift = await ShiftTemplate.create({
      name: 'General Shift',
      startTime: '09:00:00',
      endTime: '18:00:00',
      workMinutes: 540,
      orgAccountId: org.id
    });

    await user.update({ shiftTemplateId: shift.id });

    const rule = await OvertimeRule.create({
      name: 'Early OT Rule',
      orgAccountId: org.id,
      calculationType: 'SHIFT_END', // Easier to test boundary logic
      includeEarlyArrival: true,
      rewardType: 'FIXED_AMOUNT',
      thresholds: [{ minMinutes: 30, value: 100 }]
    });

    await StaffOvertimeAssignment.create({
      userId: user.id,
      overtimeRuleId: rule.id,
      orgAccountId: org.id,
      effectiveFrom: '2000-01-01'
    });

    // 2. Scenario A: Punch In 1 hour early (08:00), Punch Out at shift end (18:00)
    // includeEarlyArrival: true
    const attA = {
      userId: user.id,
      orgAccountId: org.id,
      date: '2024-01-01',
      punchedInAt: '2024-01-01T08:00:00Z',
      punchedOutAt: '2024-01-01T18:00:00Z',
      totalWorkHours: 10
    };

    console.log('\nScenario A: 1h Early Arrival, 0h Late Stay (includeEarlyArrival: true)');
    const resA = await calculateOvertime(attA, org);
    console.log('Result A:', resA);
    // Expected: 60 minutes OT

    // 3. Scenario B: Same but rule has includeEarlyArrival: false
    await rule.update({ includeEarlyArrival: false });
    console.log('\nScenario B: 1h Early Arrival, 0h Late Stay (includeEarlyArrival: false)');
    const resB = await calculateOvertime(attA, org);
    console.log('Result B:', resB);
    // Expected: 0 minutes OT

    // 4. Scenario C: 1h early AND 1h late stay
    await rule.update({ includeEarlyArrival: true });
    const attC = {
      userId: user.id,
      orgAccountId: org.id,
      date: '2024-01-01',
      punchedInAt: '2024-01-01T08:00:00Z',
      punchedOutAt: '2024-01-01T19:00:00Z',
      totalWorkHours: 11
    };
    console.log('\nScenario C: 1h Early + 1h Late (includeEarlyArrival: true)');
    const resC = await calculateOvertime(attC, org);
    console.log('Result C:', resC);
    // Expected: 120 minutes OT

    console.log('\n--- Test Complete ---');
  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    process.exit();
  }
}

test();
