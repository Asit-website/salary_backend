const { User, Attendance, StaffLatePunchInAssignment, LatePunchInRule, StaffProfile, StaffShiftAssignment, ShiftTemplate } = require('./src/models');
const { Op } = require('sequelize');

async function debugCompare() {
  try {
    const names = ['Raghav', 'raghu', 'mayank', 'sanjay sinh'];
    console.log('--- COMPARING LATENESS DATA ---');

    for (const name of names) {
      console.log(`\n[User: ${name}]`);
      const profile = await StaffProfile.findOne({
        where: { name: { [Op.like]: `%${name}%` } }
      });

      if (!profile) {
        console.log('Profile not found.');
        continue;
      }

      const user = await User.findByPk(profile.userId);
      if (!user) {
        console.log('User not found.');
        continue;
      }

      console.log(`ID: ${user.id}, Org: ${user.orgAccountId}`);
      
      const asg = await StaffLatePunchInAssignment.findOne({
        where: { userId: user.id },
        include: [{ model: LatePunchInRule, as: 'rule' }]
      });
      console.log(`Assignment: ${asg ? 'YES (Rule ' + asg.ruleId + ')' : 'NO'}`);
      if (asg) {
          console.log(`Rule Active: ${asg.rule?.active}, Type: ${asg.rule?.penaltyType}`);
      }

      const shiftAsg = await StaffShiftAssignment.findOne({
        where: { userId: user.id },
        include: [{ model: ShiftTemplate, as: 'template' }],
        order: [['id', 'DESC']]
      });
      console.log(`Shift: ${shiftAsg?.template?.startTime || 'None'}`);

      const atts = await Attendance.findAll({
        where: { userId: user.id, date: { [Op.between]: ['2026-03-01', '2026-04-30'] } },
        order: [['date', 'ASC']]
      });
      console.log(`March-April Records: ${atts.length}`);
      atts.forEach(a => {
        console.log(`  ${a.date}: In=${a.punchedInAt}, LateMin=${a.latePunchInMinutes}, Status=${a.status}`);
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

debugCompare();
