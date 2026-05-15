const { OrgAccount, OrgBrand, OrgBusinessInfo } = require('./src/models');
const { sequelize } = require('./src/sequelize');

async function test() {
  await sequelize.authenticate();
  
  const accounts = await OrgAccount.findAll({
    order: [['createdAt', 'DESC']],
    limit: 5
  });

  for (let acc of accounts) {
    console.log(`\nAccount: ${acc.id} - ${acc.name} (Status: ${acc.status})`);
    const brand = await OrgBrand.findOne({ where: { orgAccountId: acc.id } });
    console.log(`Brand:`, brand ? brand.displayName : 'NULL');
    const info = await OrgBusinessInfo.findOne({ where: { orgAccountId: acc.id } });
    console.log(`Info:`, info ? `${info.state}, ${info.city}, ${info.addressLine1}` : 'NULL');
  }

  process.exit();
}

test();
