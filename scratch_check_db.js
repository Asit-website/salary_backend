const { sequelize, Attendance, User, StaffProfile } = require('./src/models');
const { Op } = require('sequelize');

async function run() {
  try {
    const all = await Attendance.findAll({
      include: [
        {
          model: User,
          as: 'user',
          include: [{ model: StaffProfile, as: 'profile' }]
        }
      ]
    });
    console.log(`Total records: ${all.length}`);
    for (const r of all) {
      if (r.user?.profile?.name?.toLowerCase().includes('biswarup') || 
          r.user?.profile?.name?.toLowerCase().includes('dipankar')) {
        console.log({
          id: r.id,
          userId: r.userId,
          name: r.user?.profile?.name,
          date: r.date,
          punchedInAt: r.punchedInAt,
          punchedOutAt: r.punchedOutAt,
          status: r.status
        });
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
