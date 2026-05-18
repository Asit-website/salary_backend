const { sequelize, Attendance, User } = require('../src/models');
const dayjs = require('dayjs');

async function check() {
    const atts = await Attendance.findAll({
        where: {
            date: {
                [sequelize.Sequelize.Op.between]: ['2026-05-01', '2026-05-31']
            }
        },
        include: [{ model: User, as: 'user' }]
    });

    for (const a of atts) {
        if (a.punchedInAt && a.punchedOutAt) {
            const gross = dayjs(a.punchedOutAt).diff(dayjs(a.punchedInAt), 'minute');
            console.log(`Date: ${a.date}, User: ${a.user?.name}, Gross: ${gross}m, Net: ${a.totalWorkHours}h, OT: ${a.overtimeMinutes}m, BreakSec: ${a.breakTotalSeconds}`);
        }
    }
    process.exit(0);
}

check();
