const { Attendance, User, StaffProfile } = require('../src/models');
const { sequelize } = require('../src/sequelize');

async function queryAttendance() {
  try {
    const records = await Attendance.findAll({
      where: {
        date: ['2026-05-23', '2026-05-24']
      },
      include: [
        {
          model: User,
          as: 'user',
          include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'staffId'] }]
        }
      ],
      order: [['date', 'ASC'], ['userId', 'ASC']]
    });

    console.log(`Found ${records.length} records:`);
    records.forEach(r => {
      console.log({
        id: r.id,
        userId: r.userId,
        name: r.user?.profile?.name || r.user?.name,
        staffId: r.user?.profile?.staffId,
        date: r.date,
        status: r.status,
        punchedInAt: r.punchedInAt,
        punchedOutAt: r.punchedOutAt,
        source: r.source
      });
    });

    process.exit(0);
  } catch (e) {
    console.error('Error querying:', e);
    process.exit(1);
  }
}

queryAttendance();
