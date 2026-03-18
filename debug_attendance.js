const { Attendance, User, StaffProfile } = require('./src/models');
const { Op } = require('sequelize');

async function debug() {
  try {
    const profile = await StaffProfile.findOne({
      where: { name: { [Op.like]: '%mukta%' } }
    });

    if (!profile) {
      console.log('Profile not found for "mukta"');
      process.exit(0);
    }

    const userId = profile.userId;
    const user = await User.findByPk(userId);
    console.log('Found Mukta:', profile.name, 'ID:', userId, 'Org:', user?.orgAccountId);

    const startDate = '2026-03-01';
    const endDate = '2026-03-31';

    const records = await Attendance.findAll({
      where: {
        userId,
        date: { [Op.between]: [startDate, endDate] }
      }
    });

    console.log(`Found ${records.length} records in March 2026`);
    records.forEach(r => {
      console.log(`Date: ${r.date}, Status: ${r.status}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
