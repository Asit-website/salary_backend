const { User, StaffLatePunchInAssignment, LatePunchInRule, StaffProfile, StaffShiftAssignment, ShiftTemplate } = require('./src/models');
const { Op } = require('sequelize');

async function checkUser59() {
  try {
    const userId = 59;
    console.log(`--- AUDITING USER ID: ${userId} ---`);
    const user = await User.findByPk(userId, {
        include: [{ model: StaffProfile, as: 'profile' }]
    });

    if (!user) {
        console.log('User 59 not found in database!');
        process.exit(1);
    }

    console.log(`Name: ${user.profile?.name || 'No Profile Name'}`);
    console.log(`Org ID: ${user.orgAccountId}`);

    const lateAsg = await StaffLatePunchInAssignment.findOne({
        where: { userId: userId },
        include: [{ model: LatePunchInRule, as: 'rule' }]
    });

    console.log(`Late Assignment: ${lateAsg ? 'FOUND (Rule ID ' + lateAsg.ruleId + ')' : 'NOT FOUND'}`);
    if (lateAsg) {
        console.log(`Rule Thresholds: ${lateAsg.rule?.thresholds}`);
        console.log(`Rule Type: ${lateAsg.rule?.penaltyType}`);
    }

    const shiftAsg = await StaffShiftAssignment.findOne({
        where: { userId: userId },
        include: [{ model: ShiftTemplate, as: 'template' }],
        order: [['id', 'DESC']]
    });

    console.log(`Shift Template: ${shiftAsg?.template?.name || 'NONE'} (${shiftAsg?.template?.startTime || 'N/A'})`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkUser59();
