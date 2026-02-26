const { OrderProduct, OrgAccount } = require('./src/models');
const { sequelize } = require('./src/sequelize');

async function checkData() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const products = await OrderProduct.findAll();
        console.log('Total Products in DB:', products.length);
        products.forEach(p => {
            console.log(`- ID: ${p.id}, Name: ${p.name}, OrgID: ${p.orgAccountId}, Active: ${p.isActive}`);
        });

        const orgs = await OrgAccount.findAll({ limit: 5 });
        console.log('Org Accounts found:', orgs.length);
        orgs.forEach(o => {
            console.log(`- ID: ${o.id}, Name: ${o.name}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkData();
