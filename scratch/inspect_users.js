const { User, StaffProfile, Attendance } = require('../src/models');
const { Op } = require('sequelize');

async function run() {
  try {
    const profiles = await StaffProfile.findAll({
      where: {
        name: {
          [Op.like]: '%DIPANKAR%'
        }
      }
    });
    
    console.log(`Found ${profiles.length} profiles for DIPANKAR:`);
    for (const p of profiles) {
      console.log(`Profile: ${p.name}, userId: ${p.userId}, phone: ${p.phone}`);
      // Find attendance records for this user
      const records = await Attendance.findAll({
        where: { userId: p.userId },
        limit: 10,
        order: [['date', 'DESC']]
      });
      records.forEach(r => {
        console.log(`  Attendance date: ${r.date}`);
        console.log(`    punchedInAt: ${r.punchedInAt} (type: ${typeof r.punchedInAt})`);
        console.log(`    punchedOutAt: ${r.punchedOutAt} (type: ${typeof r.punchedOutAt})`);
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
