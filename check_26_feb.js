
const { Attendance } = require('./src/models');

async function checkAttendanceDetail() {
    const userId = 28; // Mukesh
    const dateStr = '2026-02-26';

    const record = await Attendance.findOne({
        where: { userId, date: dateStr }
    });

    if (record) {
        console.log(`Record for ${dateStr}:`);
        console.log(JSON.stringify(record.toJSON(), null, 2));
    } else {
        console.log(`No record found for ${dateStr}`);
    }

    process.exit(0);
}

checkAttendanceDetail();
