const { User, StaffProfile } = require('./src/models/index');
const { sequelize } = require('./src/sequelize');

async function check() {
    try {
        console.log('Authenticating...');
        await sequelize.authenticate();
        console.log('Authenticated successfully');

        const user = await User.findOne({
            include: [{
                model: StaffProfile,
                as: 'profile',
                where: { name: 'mahan' }
            }]
        });

        if (!user) {
            console.log('User mahan not found in profiles');
            const profiles = await StaffProfile.findAll({ limit: 5 });
            console.log('Found these profiles:', profiles.map(p => p.name));
            return;
        }

        console.log('User Found:', user.profile.name);
        console.log('Salary Data:', JSON.stringify({
            id: user.id,
            salaryValues: user.salaryValues,
            salaryTemplateId: user.salaryTemplateId,
            basicSalary: user.basicSalary,
            pfDeduction: user.pfDeduction,
            esiDeduction: user.esiDeduction,
            professionalTax: user.professionalTax,
            totalEarnings: user.totalEarnings,
            totalDeductions: user.totalDeductions,
            grossSalary: user.grossSalary,
            netSalary: user.netSalary
        }, null, 2));
    } catch (error) {
        console.error('Error in check script:', error);
    }
}

check().then(() => process.exit()).catch(e => { console.error(e); process.exit(1); });
