const { User, StaffProfile, Attendance, StaffShiftAssignment, ShiftTemplate } = require('./src/models');
const { Op } = require('sequelize');
const latePunchInService = require('./src/services/latePunchInService');

async function debug() {
  try {
    const user = await User.findOne({
      include: [{
        model: StaffProfile,
        as: 'profile',
        where: {
          name: { [Op.like]: '%rambhu%' }
        }
      }]
    });

    if (!user) {
      console.log('Rambhu not found');
      return;
    }

    console.log(`Found Rambhu: ID ${user.id}, Name: ${user.profile.name}`);

    // Check April 2026 attendance
    const attendance = await Attendance.findAll({
      where: {
        userId: user.id,
        date: { [Op.between]: ['2026-04-01', '2026-04-30'] }
      },
      order: [['date', 'ASC']]
    });

    console.log(`Found ${attendance.length} records for April`);

    for (const record of attendance) {
      const shift = await latePunchInService.getEffectiveShiftTemplate(user.id, record.date);
      const lpResult = await latePunchInService.calculateLatePenalty(record, { id: record.orgAccountId });
      
      console.log(`Date: ${record.date}`);
      console.log(`  PunchIn: ${record.punchedInAt}`);
      console.log(`  Shift: ${shift ? shift.startTime : 'NONE'}`);
      console.log(`  LateMins (Service): ${lpResult.latePunchInMinutes}`);
      console.log(`  LateMins (Stored): ${record.latePunchInMinutes}`);
    }

    // Check Shift Assignment
    const asg = await StaffShiftAssignment.findAll({
      where: { userId: user.id },
      include: [{ model: ShiftTemplate }]
    });
    console.log('Shift Assignments:', JSON.stringify(asg, null, 2));

  } catch (e) {
    console.error(e);
  }
}

debug().then(() => process.exit());
