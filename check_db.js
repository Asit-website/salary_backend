const { User, OrgAccount } = require('./src/models');

async function check() {
  try {
    const staffPhone = '3333333333';
    const adminPhone = '9090909090';

    console.log('--- Staff Memberships ---');
    const staffUsers = await User.findAll({ where: { phone: staffPhone } });
    for (const u of staffUsers) {
      const org = await OrgAccount.findByPk(u.orgAccountId);
      console.log(`Org: ${org?.name} (ID: ${u.orgAccountId}), Role: ${u.role}`);
    }

    console.log('\n--- Admin Memberships ---');
    const adminUsers = await User.findAll({ where: { phone: adminPhone } });
    for (const u of adminUsers) {
      const org = await OrgAccount.findByPk(u.orgAccountId);
      console.log(`Org: ${org?.name} (ID: ${u.orgAccountId}), Role: ${u.role}`);
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
