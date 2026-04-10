const { User, StaffProfile, AppSetting } = require('./src/models');
const { calculateSalary } = require('./src/services/payrollService');

async function test() {
    const userId = 65;
    const monthKey = '2026-04';

    const u = await User.findByPk(userId, {
        include: [{ association: 'profile' }]
    });

    console.log('User Profile found:', !!u.profile);
    if (u.profile) {
        console.log('Profile keys:', Object.keys(u.profile.get({ plain: true })));
        console.log('dateOfJoining:', u.profile.dateOfJoining);
        console.log('date_of_joining:', u.profile.date_of_joining);
    }

    const res = await calculateSalary(userId, monthKey);
    console.log('=== Salary Result ===');
    console.log('Earnings:', res.earnings);
    console.log('TENURE_BONUS:', res.earnings.TENURE_BONUS);
    console.log('Totals:', res.totals);
}

test().catch(console.error);
