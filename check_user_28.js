const { User, OrderProduct } = require('./src/models');
const { sequelize } = require('./src/sequelize');

async function checkUserOrg() {
    try {
        await sequelize.authenticate();
        const user = await User.findOne({ where: { id: 28 } });
        if (user) {
            console.log('User 28 OrgID:', user.orgAccountId);
            const products = await OrderProduct.findAll({ where: { orgAccountId: user.orgAccountId } });
            console.log('Products for this org:', products.length);
            products.forEach(p => console.log(`- ${p.name}`));
        } else {
            console.log('User 28 not found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkUserOrg();
