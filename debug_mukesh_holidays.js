
const { HolidayTemplate, HolidayDate, StaffHolidayAssignment, User } = require('./src/models');
const { Op } = require('sequelize');

async function checkHolidays() {
    const userId = 28; // Mukesh
    const dateKey = '2026-02-01'; // Any date in Feb

    const asg = await StaffHolidayAssignment.findOne({
        where: {
            userId,
            effectiveFrom: { [Op.lte]: '2026-02-28' }
        },
        order: [['effectiveFrom', 'DESC']]
    });

    if (!asg) {
        console.log('No Holiday Assignment found for Mukesh in Feb 2026');
        process.exit(0);
    }

    console.log(`Found Holiday Assignment: TemplateId=${asg.holidayTemplateId}, EffectiveFrom=${asg.effectiveFrom}`);

    const tpl = await HolidayTemplate.findByPk(asg.holidayTemplateId, {
        include: [{ model: HolidayDate, as: 'holidays' }]
    });

    if (!tpl) {
        console.log('No Holiday Template found');
        process.exit(0);
    }

    console.log(`Holiday Template: ${tpl.name}`);
    tpl.holidays.forEach(h => {
        if (String(h.date).startsWith('2026-02')) {
            console.log(`Holiday in Feb 2026: ${h.date} - ${h.name} (Active: ${h.active})`);
        }
    });

    process.exit(0);
}

checkHolidays();
