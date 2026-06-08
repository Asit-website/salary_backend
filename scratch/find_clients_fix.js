const { OrgAccount, User, StaffProfile } = require('../src/models');
const { Op } = require('sequelize');

async function run() {
  try {
    console.log('=== ALL CLIENTS IN DATABASE ===');
    const orgs = await OrgAccount.findAll({
      order: [['id', 'DESC']]
    });

    for (const org of orgs) {
      console.log(`Org ID: ${org.id} | Name: ${org.name} | Phone: ${org.phone} | CreatedBy: ${org.createdBy} | Status: ${org.status}`);
      const admins = await User.findAll({ where: { orgAccountId: org.id, role: 'admin' } });
      if (admins.length > 0) {
        console.log(`  Admins: ${admins.map(a => `${a.id} (${a.phone})`).join(', ')}`);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

run();
