require('dotenv').config();
const { initDb } = require('../src/db');
const { checkMissingAttendanceAndNotify } = require('../src/jobs/attendanceReminder');

async function run() {
    try {
        console.log('Initializing DB...');
        await initDb();
        console.log('DB Initialized. Starting missing attendance check...');
        await checkMissingAttendanceAndNotify();
        console.log('Manual missing attendance check completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Trigger error:', err);
        process.exit(1);
    }
}

run();
