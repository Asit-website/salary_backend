const { OrderProduct, OrgAccount } = require('./src/models');
const { sequelize } = require('./src/sequelize');

async function checkData() {
    try {
        await sequelize.authenticate();
        const orgs = await OrgAccount.findAll({ limit: 5 });
        console.log('Orgs found:', orgs.length);
        if (orgs.length > 0) {
            const orgId = orgs[0].id;
            console.log('Checking products for org:', orgId);
            const products = await OrderProduct.findAll({ where: { orgAccountId: orgId } });
            console.log('Products found:', products.length);
            products.forEach(p => console.log(`- ${p.name} (Active: ${p.isActive})`));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkData();
