const { sequelize } = require('./src/models');

async function createSamplePlans() {
  try {
    console.log('Creating sample plans...');
    
    // Create sample plans
    await sequelize.query(`
      INSERT IGNORE INTO plans (code, name, period_days, staff_limit, price, features, active, created_at, updated_at)
      VALUES 
      ('BASIC', 'Basic Plan', 30, 5, 999.00, '{"attendance": true, "leave": true}', true, NOW(), NOW()),
      ('PRO', 'Professional Plan', 30, 20, 2999.00, '{"attendance": true, "leave": true, "sales": true}', true, NOW(), NOW()),
      ('ENTERPRISE', 'Enterprise Plan', 30, 100, 9999.00, '{"attendance": true, "leave": true, "sales": true, "geolocation": true}', true, NOW(), NOW())
    `);
    
    console.log('✅ Sample plans created successfully!');
    
    // Show all plans
    const plans = await sequelize.query('SELECT * FROM plans ORDER BY price ASC');
    console.log('\n📋 Available Plans:');
    plans[0].forEach(plan => {
      console.log(`- ${plan.name}: ₹${plan.price}/month, ${plan.staff_limit} staff`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (sequelize && sequelize.close) {
      await sequelize.close();
    }
    process.exit(0);
  }
}

createSamplePlans();
