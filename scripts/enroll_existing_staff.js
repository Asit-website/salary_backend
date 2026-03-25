/**
 * Bulk Face Enrollment Script
 * Enrolls all existing staff members who have a profile photo but no Face ID.
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { StaffProfile, sequelize } = require('../src/models');
const { enrollFace } = require('../src/services/awsService');

async function runEnrollment() {
  console.log('--- Starting Bulk Face Enrollment ---');
  
  try {
    // 1. Fetch all profiles with photo but no Face ID
    const profiles = await StaffProfile.findAll({
      where: {
        photoUrl: { [require('sequelize').Op.ne]: null },
        faceId: null
      }
    });

    console.log(`Found ${profiles.length} staff profiles to enroll.`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      let photoUrlRaw = profile.photoUrl || '';
      let photoSource = photoUrlRaw.trim();

      // Skip empty, whitespace, or invalid indicator strings
      if (!photoSource || photoSource === '/' || photoSource.length < 2) {
        console.log(`[${i + 1}/${profiles.length}] Skipping Staff ID: ${profile.userId} (Empty/Invalid photo path: "${photoUrlRaw}")`);
        continue;
      }

      console.log(`[${i + 1}/${profiles.length}] Processing Staff ID: ${profile.userId}...`);

      try {
        // Handle relative paths
        if (!photoSource.startsWith('http')) {
          // Resolve absolute path on disk
          // Remove leading slash if present
          const cleanPath = photoSource.startsWith('/') ? photoSource.substring(1) : photoSource;
          photoSource = path.join(__dirname, '../', cleanPath);
          
          if (!fs.existsSync(photoSource)) {
            console.warn(`  ! Photo file not found: ${photoSource}`);
            failCount++;
            continue;
          }
        }

        const faceId = await enrollFace(photoSource, profile.userId);
        if (faceId) {
          await profile.update({ faceId });
          console.log(`  v Successfully enrolled. FaceID: ${faceId}`);
          successCount++;
        }
      } catch (err) {
        console.error(`  x Failed to enroll staff ${profile.userId}:`, err.message);
        failCount++;
      }
    }

    console.log('\n--- Enrollment Finished ---');
    console.log(`Total Success: ${successCount}`);
    console.log(`Total Failed: ${failCount}`);
    console.log('Note: If a face was not detected, please update the staff profile with a clearer front-facing photo.');

  } catch (error) {
    console.error('Fatal Error during enrollment:', error);
  } finally {
    await sequelize.close();
  }
}

runEnrollment().catch(err => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
