const { User, StaffProfile, OrgAccount } = require('./src/models');

async function cleanup() {
  try {
    const staffPhone = '3333333333';
    const orgNamesToDelete = ['bk', 'mk', 'tk'];

    for (const name of orgNamesToDelete) {
      const org = await OrgAccount.findOne({ where: { name } });
      if (org) {
        const userRecord = await User.findOne({ where: { phone: staffPhone, orgAccountId: org.id } });
        if (userRecord) {
          console.log(`Deleting record for ${staffPhone} in Org ${name} (ID: ${org.id})`);
          // Delete staff profile first if exists
          await StaffProfile.destroy({ where: { userId: userRecord.id } });
          await userRecord.destroy();
        }
      }
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

cleanup();
