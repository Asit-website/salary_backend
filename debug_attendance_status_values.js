const { sequelize, Attendance } = require('./src/models');
const { Op } = require('sequelize');

async function check() {
  try {
    const statuses = await Attendance.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('status')), 'status']
      ],
      raw: true
    });
    console.log('Unique statuses in Attendance table:', statuses.map(s => s.status));

    const samples = await Attendance.findAll({
      limit: 5,
      raw: true
    });
    console.log('Sample rows:', JSON.stringify(samples, null, 2));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
