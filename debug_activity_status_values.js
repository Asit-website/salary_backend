const { sequelize, Activity } = require('./src/models');

async function check() {
  try {
    const statuses = await Activity.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('status')), 'status']
      ],
      raw: true
    });
    console.log('Unique statuses in Activity table:', statuses.map(s => s.status));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
