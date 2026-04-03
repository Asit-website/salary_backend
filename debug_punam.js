
const { Attendance, User } = require('./src/models');
const { Op } = require('sequelize');

async function debugPunam() {
  const userId = 3;
  const start = '2026-03-01';
  const end = '2026-03-31';

  const atts = await Attendance.findAll({
    where: { userId, date: { [Op.between]: [start, end] } },
    order: [['date', 'ASC']]
  });

  console.log(`Found ${atts.length} records for Punam in March.`);
  atts.forEach(a => {
    console.log(`Date: ${a.date}, Status: ${a.status}, In: ${a.punchedInAt}, Out: ${a.punchedOutAt}`);
  });

  process.exit(0);
}

debugPunam();
