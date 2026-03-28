const { listFaces } = require('./src/services/awsService');
const { User, StaffProfile } = require('./src/models');
const { initDb } = require('./src/db');

async function run() {
  await initDb();
  console.log('Fetching AWS faces...');
  const faces = await listFaces();
  console.log(`Found ${faces.length} faces in AWS.`);

  const allUsers = await User.findAll({ limit: 10 });
  console.log('Sample User IDs in DB:', allUsers.map(u => u.id).join(', '));

  for (const f of faces) {
    console.log(`FaceId: ${f.FaceId}, ExternalImageId (UserId): ${f.ExternalImageId}`);
    if (f.ExternalImageId) {
      const u = await User.findByPk(f.ExternalImageId, { include: [{ model: StaffProfile, as: 'profile' }] });
      if (u) {
        console.log(`  MATCH: User ${u.id} - ${u.profile?.name} (Active: ${u.active})`);
      } else {
        console.log(`  MISSING: User ${f.ExternalImageId} NOT FOUND IN DATABASE`);
      }
    }
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
