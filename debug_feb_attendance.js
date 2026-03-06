
const { Attendance, User } = require('./src/models');
const { Op } = require('sequelize');

async function checkAttendance() {
    const userId = 28; // Mukesh
    const start = '2026-02-01';
    const end = '2026-02-28';

    const rows = await Attendance.findAll({
        where: {
            userId,
            date: { [Op.between]: [start, end] }
        },
        order: [['date', 'ASC']]
    });

    console.log('Attendance Records for Mukesh (User 28) in Feb 2026:');
    rows.forEach(r => {
        console.log(`${r.date}: Status=${r.status}, In=${r.punchedInAt}, Out=${r.punchedOutAt}`);
    });

    process.exit(0);
}

checkAttendance();
