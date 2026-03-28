const { listFaces, deleteFace, enrollFace } = require('../src/services/awsService');
const { User, StaffProfile } = require('../src/models');
const { initDb } = require('../src/db');
require('dotenv').config();

const API_BASE_URL = 'https://backend.vetansutra.com'; // Change if needed

async function run() {
  await initDb();
  console.log('--- STARTING FACE SYNC ---');

  // 1. Get all faces from AWS
  const rawFaces = await listFaces();
  console.log(`Found ${rawFaces.length} faces in AWS.`);

  // 2. Identify stale faces
  for (const face of rawFaces) {
    const userId = face.ExternalImageId;
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.log(`Deleting stale FaceId: ${face.FaceId} (User ID ${userId} not found in DB)`);
      await deleteFace(face.FaceId);
    } else {
      console.log(`FaceId: ${face.FaceId} matches User ID: ${userId} (${user.active ? 'Active' : 'Inactive'})`);
    }
  }

  // 3. Re-enroll active staff with photos
  const staffToSync = await StaffProfile.findAll({
    where: {
      photoUrl: { [require('sequelize').Op.ne]: null }
    },
    include: [{ model: User, as: 'user', where: { active: true } }]
  });

  console.log(`Found ${staffToSync.length} active staff with photos in DB.`);

  for (const profile of staffToSync) {
    const userId = profile.userId;
    const fullPhotoUrl = profile.photoUrl.startsWith('http') 
      ? profile.photoUrl 
      : `${API_BASE_URL}${profile.photoUrl}`;

    console.log(`Syncing face for User ${userId} (${profile.name})...`);
    
    try {
      // NOTE: We don't delete by faceId here because it might already be correct. 
      // But to be safe and ensure the LATEST photo is used, we can re-enroll.
      // AWS Rekognition will index the new face. 
      // If the face is ALREADY there with the SAME ExternalImageId, it might create a duplicate unless we manage it.
      
      // Best approach: If user already has a faceId in DB, let's keep it OR refresh it.
      // For now, let's just enroll everyone who is not already correctly mapped.
      
      const faceId = await enrollFace(fullPhotoUrl, userId);
      if (faceId) {
        await profile.update({ faceId });
        console.log(`  SUCCESS: Enrolled with FaceId: ${faceId}`);
      }
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
    }
  }

  console.log('--- FACE SYNC COMPLETED ---');
  process.exit(0);
}

run().catch(err => {
  console.error('Critical Error:', err);
  process.exit(1);
});
