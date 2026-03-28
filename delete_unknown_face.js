const { deleteFace } = require('./src/services/awsService');
require('dotenv').config();

async function run() {
  const faceId = '21ebd15a-251e-488f-a266-c5f8fb29acdc';
  console.log(`Deleting face: ${faceId}...`);
  try {
    await deleteFace(faceId);
    console.log('SUCCESS: Face deleted from AWS.');
  } catch (err) {
    console.error('FAILED:', err.message);
  }
  process.exit(0);
}

run();
