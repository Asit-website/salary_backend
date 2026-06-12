const { Subscription, OrgAccount } = require('../src/models');

async function updatePF() {
  try {
    const org = await OrgAccount.findOne({ where: { name: 'frinktech' } });
    if (!org) {
      console.log('Org frinktech not found');
      return;
    }
    console.log(`Found org frinktech (ID: ${org.id})`);

    const sub = await Subscription.findOne({
      where: { orgAccountId: org.id, status: 'ACTIVE' }
    });

    if (!sub) {
      console.log('No active subscription found for frinktech');
      return;
    }

    console.log('Current Subscription Meta:', sub.meta);

    let metaObj = {};
    if (sub.meta) {
      metaObj = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : { ...sub.meta };
    }

    metaObj.pfSettingsEnabled = false;
    sub.meta = metaObj;
    await sub.save();

    console.log('Successfully updated subscription meta to:', sub.meta);
  } catch (e) {
    console.error('Error during update:', e);
  } finally {
    process.exit();
  }
}

updatePF();
