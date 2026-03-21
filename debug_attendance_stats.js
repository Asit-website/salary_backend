const { sequelize, User, Attendance, StaffProfile } = require('./src/models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

async function check() {
  try {
    const month = 3;
    const year = 2026;
    const startDate = dayjs(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');

    console.log(`Checking attendance between ${startDate} and ${endDate}`);

    const users = await User.findAll({
      where: { role: 'staff' },
      include: [{ model: StaffProfile, as: 'profile' }],
      limit: 10
    });

    for (const u of users) {
      const count = await Attendance.count({
        where: {
          userId: u.id,
          date: { [Op.between]: [startDate, endDate] }
        }
      });
      console.log(`User: ${u.profile?.name || u.phone} (ID: ${u.id}) - Attendance Count: ${count}`);
      
      if (count > 0) {
        const samples = await Attendance.findAll({
          where: { userId: u.id, date: { [Op.between]: [startDate, endDate] } },
          limit: 3
        });
        console.log('Sample dates:', samples.map(s => s.date));
      }
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
