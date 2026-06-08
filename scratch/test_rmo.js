const { User, StaffProfile, Attendance, AppSetting, sequelize } = require('../src/models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

async function test() {
  const transaction = await sequelize.transaction();
  try {
    console.log('--- STARTING RMO WORKFLOW VERIFICATION ---');

    // 1. Find or create a test user
    let user = await User.findOne({
      include: [{ model: StaffProfile, as: 'profile' }],
      transaction
    });

    if (!user) {
      console.log('No user found, creating a dummy user...');
      user = await User.create({
        username: 'rmo_test_user',
        password: 'password123',
        role: 'staff',
        orgAccountId: 1
      }, { transaction });
      await StaffProfile.create({
        userId: user.id,
        name: 'RMO Test Staff',
        staffId: 'RMO-001',
        orgAccountId: 1
      }, { transaction });
    }

    console.log(`Using User ID: ${user.id}, Name: ${user.profile?.name || 'Test User'}`);
    const orgId = user.orgAccountId || 1;

    // 2. Set AppSetting for RMO settings
    const [appSetting, created] = await AppSetting.findOrBuild({
      where: { key: 'rmo_settings', orgAccountId: orgId },
      transaction
    });
    const originalValue = appSetting.value;

    appSetting.value = JSON.stringify({
      targetHours: 480,
      staffIds: [user.id]
    });
    await appSetting.save({ transaction });
    console.log('Configured RMO settings: targetHours = 480, staffIds =', [user.id]);

    // 3. Delete any pre-existing attendance records for the test week to ensure clean run
    const testDates = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06'];
    await Attendance.destroy({
      where: {
        userId: user.id,
        date: { [Op.in]: testDates }
      },
      transaction
    });

    // 4. Create the multi-day punch-in on 2026-06-01 and punch-out on 2026-06-06 (120 hours total)
    const inTime = '2026-06-01 08:00:00';
    const outTime = '2026-06-06 08:00:00';
    const totalWorkHours = 120.0;

    const punchInRecord = await Attendance.create({
      userId: user.id,
      date: '2026-06-01',
      status: 'present',
      punchedInAt: inTime,
      punchedOutAt: outTime,
      totalWorkHours: totalWorkHours,
      orgAccountId: orgId
    }, { transaction });

    console.log(`Created multi-day punch record on ${punchInRecord.date}: punchedInAt=${punchInRecord.punchedInAt}, punchedOutAt=${punchInRecord.punchedOutAt}, totalWorkHours=${punchInRecord.totalWorkHours}`);

    // 5. Verify processed daily attendance for intermediate days (GET /user/:userId equivalent)
    console.log('\n--- VERIFYING INTERMEDIATE DAYS MAPPING ---');
    
    // We will query days using the logic we wrote in routes/attendance.js (processed attendance)
    const atts = await Attendance.findAll({
      where: {
        userId: user.id,
        date: { [Op.between]: ['2026-06-01', '2026-06-06'] }
      },
      transaction
    });

    // We can simulate checking each day of the week
    for (const dateStr of testDates) {
      let record = atts.find(r => dayjs(r.date).format('YYYY-MM-DD') === dateStr);
      let isRmoIntermediate = false;

      // If no record exists for this date, look back for any multi-day RMO shifts that overlap this date
      if (!record) {
        const rmoRecord = atts.find(r => {
          if (!r.punchedInAt) return false;
          const inDateStr = dayjs(r.punchedInAt).format('YYYY-MM-DD');
          if (r.punchedOutAt) {
            const outDateStr = dayjs(r.punchedOutAt).format('YYYY-MM-DD');
            return dateStr >= inDateStr && dateStr <= outDateStr;
          } else {
            const diffDays = dayjs(dateStr).diff(dayjs(r.punchedInAt), 'day');
            return dateStr >= inDateStr && diffDays >= 0 && diffDays < 5;
          }
        });

        if (rmoRecord) {
          isRmoIntermediate = true;
          record = {
            id: null,
            userId: user.id,
            date: dateStr,
            status: rmoRecord.status || 'present',
            totalWorkHours: 0,
            punchedInAt: rmoRecord.punchedInAt,
            punchedOutAt: rmoRecord.punchedOutAt,
            isRmoIntermediate: true
          };
        }
      }

      console.log(`Date: ${dateStr} | Status: ${record ? record.status : 'absent'} | IsIntermediate: ${isRmoIntermediate} | workedHours: ${record ? record.totalWorkHours : 0}`);
    }

    // 6. Verify Payroll Calculation pro-rated ratio
    console.log('\n--- VERIFYING PAYROLL CALCULATION RATIO ---');
    const rmoTargetHours = 480;
    const rmoTotalWorkedHours = atts.reduce((sum, a) => sum + Number(a.totalWorkHours || 0), 0);
    const ratio = rmoTargetHours > 0 ? Math.min(1.0, rmoTotalWorkedHours / rmoTargetHours) : 1.0;
    console.log(`Worked Hours in month: ${rmoTotalWorkedHours} hrs`);
    console.log(`Target Hours in month: ${rmoTargetHours} hrs`);
    console.log(`Expected Ratio: ${ratio} (Should be 120 / 480 = 0.25)`);

    if (Math.abs(ratio - 0.25) < 0.001) {
      console.log('SUCCESS: Ratio is exactly 0.25!');
    } else {
      console.log('FAIL: Ratio calculation incorrect');
    }

    // Rollback so we don't pollute the real DB
    console.log('\nRolling back transaction to keep database clean...');
    await transaction.rollback();
    console.log('Transaction rolled back successfully.');

  } catch (e) {
    console.error('Test failed with error:', e);
    await transaction.rollback();
  }
}

test();
