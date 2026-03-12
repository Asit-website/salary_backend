const { User, StaffProfile, SalaryTemplate } = require('./src/models');
const sequelize = require('./src/sequelize');

async function debug() {
    try {
        const user = await User.findOne({
            where: { phone: '7878787878' },
            include: [
                { model: StaffProfile, as: 'profile' },
                { model: SalaryTemplate, as: 'salaryTemplate' }
            ]
        });

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('--- User Info ---');
        console.log('ID:', user.id);
        console.log('Phone:', user.phone);
        console.log('SalaryTemplateId:', user.salaryTemplateId);
        console.log('SalaryTemplate Found:', !!user.salaryTemplate);

        if (user.salaryTemplate) {
            console.log('--- Template Info ---');
            console.log('Name:', user.salaryTemplate.name);
            console.log('Deductions:', JSON.stringify(user.salaryTemplate.deductions, null, 2));
        }

        console.log('--- Salary Values ---');
        console.log('SalaryValues:', user.salaryValues);
        console.log('basicSalary:', user.basicSalary);
        console.log('pfDeduction:', user.pfDeduction);
        console.log('esiDeduction:', user.esiDeduction);

    } catch (error) {
        console.error('Debug error:', error);
    } finally {
        process.exit();
    }
}

debug();
