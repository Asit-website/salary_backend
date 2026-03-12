const { SalaryTemplate } = require('./src/models/index');
const { sequelize } = require('./src/sequelize');

async function check() {
    try {
        await sequelize.authenticate();
        const tpl = await SalaryTemplate.findByPk(13);
        if (!tpl) {
            console.log('Template 13 not found');
            return;
        }
        console.log('Template:', JSON.stringify({
            id: tpl.id,
            name: tpl.name,
            earnings: typeof tpl.earnings === 'string' ? JSON.parse(tpl.earnings) : tpl.earnings,
            deductions: typeof tpl.deductions === 'string' ? JSON.parse(tpl.deductions) : tpl.deductions
        }, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

check().then(() => process.exit()).catch(e => { console.error(e); process.exit(1); });
