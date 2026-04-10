const path = require('path');
const { Attendance, OrgAccount, User, StaffProfile } = require('./src/models');
const { Op } = require('sequelize');
const latePunchInService = require('./src/services/latePunchInService');

async function debugPayroll() {
  try {
    const userId = 65; // Rambhu
    const monthKey = '2026-04';
    const start = '2026-04-01';
    const endKey = '2026-04-30';

    const rows = await Attendance.findAll({
      where: { userId, date: { [Op.gte]: start, [Op.lte]: endKey } },
      attributes: ['id', 'userId', 'orgAccountId', 'latePunchInMinutes', 'latePunchInAmount', 'latePunchInRuleId', 'isLate', 'date', 'status', 'punchedInAt'],
      order: [['date', 'ASC']]
    });

    console.log(`Found ${rows.length} attendance rows for User ${userId}`);

    const orgAccount = await OrgAccount.findByPk(10); // From logs

    let lateCount = 0;
    for (const row of rows) {
      console.log(`Checking row: Date=${row.date}, PunchIn=${row.punchedInAt}`);
      if (!row.punchedInAt) {
          console.log('  SKIP: No punchedInAt');
          continue;
      }

      const lpResult = await latePunchInService.calculateLatePenalty(row, orgAccount, row.punchedInAt, 30);
      console.log(`  lpResult: ${JSON.stringify(lpResult)}`);
      
      if (lpResult.latePunchInMinutes > 0) {
        lateCount += 1;
        console.log(`  MATCH: lateCount now ${lateCount}`);
      }
    }

    console.log(`Final lateCount for ${monthKey}: ${lateCount}`);

  } catch (err) {
    console.error(err);
  }
}

debugPayroll().then(() => process.exit());
