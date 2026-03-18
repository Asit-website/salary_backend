const { StaffRoster } = require('./src/models');

async function createTable() {
  try {
    console.log('Creating staff_rosters table...');
    await StaffRoster.sync({ alter: true });
    console.log('staff_rosters table created/updated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating staff_rosters table:', error);
    process.exit(1);
  }
}

createTable();
