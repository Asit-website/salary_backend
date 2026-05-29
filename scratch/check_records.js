const { Attendance, User, StaffProfile } = require('../src/models');

async function check() {
  try {
    const records = await Attendance.findAll({
      limit: 20,
      order: [['id', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        include: [{ model: StaffProfile, as: 'profile' }]
      }]
    });
    
    console.log(`Found ${records.length} latest records:`);
    records.forEach(r => {
      console.log(`ID: ${r.id}, User: ${r.user?.profile?.name || r.user?.name || r.userId}, Date: ${r.date}`);
      console.log(`  punchedInAt: ${r.punchedInAt} (type: ${typeof r.punchedInAt})`);
      console.log(`  punchedOutAt: ${r.punchedOutAt} (type: ${typeof r.punchedOutAt})`);
      console.log(`  createdAt: ${r.createdAt}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

check();
