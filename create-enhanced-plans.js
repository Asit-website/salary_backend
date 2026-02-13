const { sequelize } = require('./src/models');

async function createEnhancedPlans() {
  try {
    console.log('Creating enhanced subscription plans...');
    
    // Update existing plans with new features
    await sequelize.query(`
      UPDATE plans SET 
        sales_enabled = false,
        geolocation_enabled = false,
        max_geolocation_staff = 0
      WHERE code = 'BASIC'
    `);
    
    await sequelize.query(`
      UPDATE plans SET 
        sales_enabled = true,
        geolocation_enabled = false,
        max_geolocation_staff = 0
      WHERE code = 'PRO'
    `);
    
    await sequelize.query(`
      UPDATE plans SET 
        sales_enabled = true,
        geolocation_enabled = true,
        max_geolocation_staff = 50
      WHERE code = 'ENTERPRISE'
    `);
    
    console.log('✅ Enhanced plans created successfully!');
    
    // Show all plans
    const plans = await sequelize.query('SELECT * FROM plans ORDER BY price ASC');
    console.log('\n📋 Enhanced Plans:');
    plans[0].forEach(plan => {
      console.log(`- ${plan.name}: ₹${plan.price}/month, ${plan.staff_limit} staff`);
      console.log(`  Sales: ${plan.sales_enabled ? '✅' : '❌'}, Geolocation: ${plan.geolocation_enabled ? '✅' : '❌'}, Max Geo Staff: ${plan.max_geolocation_staff}`);
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

createEnhancedPlans();
