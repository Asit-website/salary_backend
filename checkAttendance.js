const { sequelize, Attendance } = require('./src/models');
const fs = require('fs');

async function check() {
    try {
        await sequelize.authenticate();
        const row = await Attendance.findOne({ order: [['id', 'DESC']], raw: true });
        if (!row) {
            fs.writeFileSync('attendanceResults.txt', 'No records found');
            process.exit(0);
        }
        let output = '';
        for (const [key, value] of Object.entries(row)) {
            output += `${key}: ${value}\n`;
        }
        fs.writeFileSync('attendanceResults.txt', output);
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('attendanceResults.txt', 'Error: ' + err.message);
        process.exit(1);
    }
}

check();
