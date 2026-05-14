const { StaffProfile } = require('./src/models');
const { Op } = require('sequelize');

async function debugAsit() {
  try {
    const profile = await StaffProfile.findOne({
      where: {
        name: {
          [Op.like]: '%Asit%'
        }
      }
    });

    if (!profile) {
      console.log('StaffProfile for Asit not found');
      return;
    }

    console.log(`Found Staff: ${profile.name} (UserId: ${profile.userId})`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

debugAsit();
