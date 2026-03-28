const { User, StaffProfile } = require('./src/models');
const { initDb } = require('./src/db');

async function run() {
  await initDb();
  const userId = 34;
  const user = await User.findByPk(userId, {
    include: [{ model: StaffProfile, as: 'profile' }]
  });

  if (user) {
    console.log('User 34 Found:');
    console.log('  Active:', user.active);
    console.log('  Name (Profile):', user.profile?.name);
    console.log('  Role:', user.role);
  } else {
    console.log('User 34 NOT FOUND in database.');
  }
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
