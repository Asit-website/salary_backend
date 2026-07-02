const { initDb } = require('./src/db');
const { Subscription, OrgAccount } = require('./src/models');
const { Op } = require('sequelize');

async function run() {
  await initDb();
  console.log('Database initialized successfully.');

  // Try to find by ID 40 first, then by name 'R R ELECTRONICS'
  let org = await OrgAccount.findByPk(40);
  if (!org || !org.name.toLowerCase().includes('r r electronics')) {
    org = await OrgAccount.findOne({
      where: {
        name: {
          [Op.like]: '%R R ELECTRONICS%'
        }
      }
    });
  }

  if (!org) {
    console.error('❌ Could not find "R R ELECTRONICS" in this database by ID 40 or by name search.');
    console.log('Available organizations in your database:');
    const all = await OrgAccount.findAll({ order: [['id', 'ASC']] });
    all.forEach(o => console.log(`- ID: ${o.id} | Name: ${o.name}`));
    process.exit(1);
  }

  console.log(`Found Organization: ${org.name} (ID: ${org.id})`);

  // Find active subscription
  const sub = await Subscription.findOne({
    where: { orgAccountId: org.id, status: 'ACTIVE' },
    order: [['endAt', 'DESC']]
  });

  if (!sub) {
    console.error(`❌ No active subscription found for ${org.name}.`);
    process.exit(1);
  }

  console.log(`Active Subscription ID: ${sub.id}`);

  let metaObj = {};
  if (sub.meta) {
    try {
      metaObj = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta;
    } catch (e) {
      metaObj = {};
    }
  }

  // Set the requested addons to true
  metaObj.esiAsTaEnabled = true;
  metaObj.pfSettingsEnabled = true;
  metaObj.weeklyOffDeductionEnabled = true;
  metaObj.rmoEnabled = true;

  // Update in database using a fresh object clone to ensure Sequelize dirty-checking writes to DB
  await sub.update({ meta: { ...metaObj } });
  console.log(`\n✅ Subscription addons updated for ${org.name} successfully!`);
  console.log('New Meta:', JSON.stringify(metaObj, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
