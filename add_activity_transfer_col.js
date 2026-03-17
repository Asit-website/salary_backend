const { Sequelize } = require('sequelize');
const config = require('./config/config.json')['development'];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: console.log,
});

async function run() {
  try {
    await sequelize.query(`
      ALTER TABLE activities 
      ADD COLUMN transferred_to_id BIGINT UNSIGNED NULL AFTER is_closed
    `);
    console.log('Successfully added transferred_to_id to activities table');
    process.exit(0);
  } catch (err) {
    if (err.message.includes('Duplicate column name')) {
      console.log('Column already exists, skipping.');
      process.exit(0);
    }
    console.error('Error adding column:', err);
    process.exit(1);
  }
}

run();
