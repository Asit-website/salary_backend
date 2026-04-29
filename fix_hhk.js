const { User, StaffProfile, OrgAccount } = require('./src/models');

async function fix() {
  try {
    const adminPhone = '9090909090';
    const hhkOrgId = 30; // From previous check

    const hhkOrg = await OrgAccount.findByPk(hhkOrgId);
    if (!hhkOrg) {
      console.log('Org hhk not found');
      process.exit(1);
    }

    // Check if already linked
    const existing = await User.findOne({ where: { phone: adminPhone, orgAccountId: hhkOrgId } });
    if (existing) {
      console.log('Already linked');
    } else {
      // Find another user record for this admin to get password hash
      const otherAdmin = await User.findOne({ where: { phone: adminPhone } });
      
      const newUser = await User.create({
        role: 'admin',
        orgAccountId: hhkOrgId,
        phone: adminPhone,
        passwordHash: otherAdmin.passwordHash,
        active: true
      });

      const adminProfile = await StaffProfile.findOne({ where: { phone: adminPhone } });
      await StaffProfile.create({
        userId: newUser.id,
        orgAccountId: hhkOrgId,
        name: adminProfile?.name || 'Parent Admin',
        phone: adminPhone
      });

      console.log('Successfully linked hhk to 9090909090');
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

fix();
