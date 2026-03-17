const { Meeting } = require('../src/models');

async function addStatusColumn() {
    try {
        const sequelize = Meeting.sequelize;
        const [results] = await sequelize.query("PRAGMA table_info(meetings);");
        const hasStatus = results.some(column => column.name === 'status');

        if (!hasStatus) {
            console.log('Adding status column to meetings table...');
            await sequelize.query("ALTER TABLE meetings ADD COLUMN status TEXT DEFAULT 'SCHEDULE';");
            console.log('Successfully added status column.');
        } else {
            console.log('Status column already exists.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error adding status column:', error);
        process.exit(1);
    }
}

addStatusColumn();
