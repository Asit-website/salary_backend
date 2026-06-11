const { User, StaffProfile, Attendance, StaffHolidayWorkPayAssignment, HolidayWorkPayRule } = require('../src/models');
const { Op } = require('sequelize');

async function test() {
  try {
    const profile = await StaffProfile.findOne({
      where: {
        name: {
          [Op.like]: '%ranju das%'
        }
      },
      include: [{ model: User, as: 'user' }]
    });
    if (!profile) {
      console.log('ranju das profile not found');
      process.exit(1);
    }
    const user = profile.user;
    console.log('User found via profile:', { id: user.id, name: profile.name, orgAccountId: user.orgAccountId });

    const assignments = await StaffHolidayWorkPayAssignment.findAll({
      where: { userId: user.id },
      include: [{ model: HolidayWorkPayRule, as: 'rule' }]
    });
    console.log('Holiday & Weekly Off Pay Rule Assignments:');
    assignments.forEach(a => {
      console.log({
        id: a.id,
        effectiveFrom: a.effectiveFrom,
        effectiveTo: a.effectiveTo,
        rule: a.rule ? { id: a.rule.id, name: a.rule.name, holidayMultiplier: a.rule.holidayMultiplier, weeklyOffMultiplier: a.rule.weeklyOffMultiplier } : null
      });
    });

    const attendances = await Attendance.findAll({
      where: {
        userId: user.id,
        date: {
          [Op.between]: ['2026-05-01', '2026-05-31']
        }
      }
    });
    console.log(`Attendances in May 2026: ${attendances.length}`);
    attendances.forEach(att => {
      console.log({
        date: att.date,
        status: att.status,
        totalWorkHours: att.totalWorkHours
      });
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
