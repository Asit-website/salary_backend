const { Subscription } = require('../src/models');
const { sequelize } = require('../src/sequelize');

async function check() {
  try {
    const subs = await Subscription.findAll({
      where: { orgAccountId: 10, status: 'ACTIVE' },
      order: [['endAt', 'DESC']]
    });
    console.log('ACTIVE Subscriptions for Org 10:');
    subs.forEach(s => {
      console.log(`ID: ${s.id}, Start: ${s.startAt}, End: ${s.endAt}`);
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
