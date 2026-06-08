const { OrgAccount, User, sequelize } = require('../src/models');
const { Op } = require('sequelize');

async function restore() {
  const transaction = await sequelize.transaction();
  try {
    console.log('=== RUNNING CLIENT PHONE RESTORATION SCRIPT ===');

    // 1. Fetch all organization accounts
    const orgs = await OrgAccount.findAll({ transaction });
    console.log(`Found ${orgs.length} total organizations.`);

    let restoredCount = 0;

    for (const org of orgs) {
      // 2. Find the admin user(s) for this organization
      const admins = await User.findAll({
        where: {
          orgAccountId: org.id,
          role: 'admin'
        },
        order: [['id', 'ASC']], // Oldest admin first (usually the creator)
        transaction
      });

      if (admins.length === 0) {
        console.log(`[Skip] Org ID ${org.id} (${org.name}): No admin user found.`);
        continue;
      }

      const admin = admins[0];
      const adminPhone = admin.phone ? admin.phone.replace(/[^0-9]/g, '').slice(-10) : null;
      const orgPhone = org.phone ? org.phone.replace(/[^0-9]/g, '').slice(-10) : null;

      if (!adminPhone) {
        console.log(`[Skip] Org ID ${org.id} (${org.name}): Admin user ${admin.id} has no phone number.`);
        continue;
      }

      // 3. If there is a mismatch, restore the OrgAccount's phone to the admin's phone
      if (orgPhone !== adminPhone) {
        console.log(`\n[MISMATCH FOUND]`);
        console.log(`  Org: ${org.name} (ID: ${org.id})`);
        console.log(`  Current Org Phone: ${org.phone}`);
        console.log(`  Original Admin Phone: ${admin.phone}`);
        
        console.log(`  Restoring Org Phone to ${admin.phone}...`);
        await org.update({ phone: admin.phone }, { transaction });
        console.log(`  Successfully restored!`);
        restoredCount++;
      }
    }

    console.log(`\nTotal mismatch records restored: ${restoredCount}`);
    
    // Commit transaction
    await transaction.commit();
    console.log('=== RESTORATION COMPLETED SUCCESSFULLY (TRANSACTION COMMITTED) ===');

  } catch (e) {
    console.error('Restoration failed:', e);
    await transaction.rollback();
  } finally {
    process.exit();
  }
}

restore();
