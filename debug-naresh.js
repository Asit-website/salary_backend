const { StaffProfile, sequelize } = require('./src/models');
const dayjs = require('dayjs');

(async () => {
    try {
        const monthDay = dayjs().format('MM-DD');
        console.log('Target Month-Day:', monthDay);

        const naresh = await StaffProfile.findOne({ where: { name: 'naresh' } });
        if (!naresh) {
            console.log('Naresh not found');
            return;
        }

        console.log('Naresh Details:');
        console.log(' - DOB:', naresh.dob);
        console.log(' - OrgID:', naresh.orgAccountId);
        console.log(' - UserID:', naresh.userId);

        const [results] = await sequelize.query(`
            SELECT id, name, dob, DATE_FORMAT(dob, '%m-%d') as formatted
            FROM staff_profiles 
            WHERE id = ${naresh.id}
        `);
        console.log('SQL Check Result:', results[0]);

        if (results[0].formatted === monthDay) {
            console.log('✅ Date Matches!');
        } else {
            console.log('❌ Date Does Not Match!');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
