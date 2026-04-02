const { User, StaffProfile, Attendance, BreakRule, StaffBreakAssignment } = require('./src/models');
const { Op } = require('sequelize');

async function main() {
  try {
    const user = await User.findOne({
      where: { name: { [Op.like]: '%Sanjay%' } },
      attributes: ['id', 'name', 'orgAccountId'],
      include: [{ model: StaffProfile, as: 'profile' }]
    });

    if (!user) {
      console.log('Sanjay not found');
      return;
    }

    const grossSalary = Number(user.profile?.grossSalary || user.grossSalary || 0);
    console.log(`Found Sanjay: ID=${user.id}, Name=${user.name}, Gross=${grossSalary}`);

    const today = '2026-04-01';
    const att = await Attendance.findOne({ where: { userId: user.id, date: today } });
    if (!att) {
      console.log(`Attendance not found for Sanjay on ${today}`);
      return;
    }

    console.log(`Today's Attendance: BreakSec=${att.breakTotalSeconds}, In=${att.punchedInAt}, Out=${att.punchedOutAt}`);

    const breakRule = await BreakRule.findOne({ where: { name: { [Op.like]: '%break1%' } } });
    if (!breakRule) {
      console.log('Break rule "break1" not found');
      return;
    }

    console.log(`Applying rule: ${breakRule.name} (Amount=${breakRule.deductionAmount}, Type=${breakRule.deductionType})`);

    const { calculateBreakDeduction } = require('./src/services/breakService');
    const result = await calculateBreakDeduction(att, { id: att.orgAccountId }, new Date(), 30);
    console.log('Calculated Deduction Result:', JSON.stringify(result));

    await att.update({
      breakDeductionAmount: result.breakDeductionAmount,
      breakRuleId: result.breakRuleId,
      excessBreakMinutes: result.excessBreakMinutes
    });

    console.log('Attendance updated successfully with new penalty');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

main();
