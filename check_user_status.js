const { User, StaffProfile } = require('./src/models');
const { initDb } = require('./src/db');

async function run() {
  await initDb();
  const userId = 4;
  const user = await User.findByPk(userId, {
    include: [{ model: StaffProfile, as: 'profile' }]
  });

  if (user) {
    console.log('User Found:');
    console.log('  ID:', user.id);
    console.log('  Active:', user.active);
    console.log('  Role:', user.role);
    console.log('  Name:', user.profile?.name);
    console.log('  OrgID:', user.orgAccountId);
  } else {
    console.log(`User ${userId} NOT FOUND in database.`);
    
    // Check what users DO exist
    const count = await User.count();
    console.log('Total users in DB:', count);
    const someUsers = await User.findAll({ limit: 5 });
    console.log('IDs in DB:', someUsers.map(u => u.id).join(', '));
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
