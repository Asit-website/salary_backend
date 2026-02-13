const { sequelize } = require('./src/models');

async function addSubscriptionColumns() {
  try {
    console.log('Adding subscription columns to plans table...');
    
    // Add new columns to plans table
    await sequelize.query(`
      ALTER TABLE plans 
      ADD COLUMN sales_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN geolocation_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN max_geolocation_staff INT UNSIGNED DEFAULT 0
    `);
    
    console.log('✅ Columns added to plans table!');
    
    // Add column to clients table
    await sequelize.query(`
      ALTER TABLE clients 
      ADD COLUMN max_geolocation_staff INT UNSIGNED DEFAULT 0
    `);
    
    console.log('✅ Column added to clients table!');
    
    // Update existing plans
    await sequelize.query(`
      UPDATE plans SET 
        sales_enabled = FALSE,
        geolocation_enabled = FALSE,
        max_geolocation_staff = 0
      WHERE code = 'BASIC'
    `);
    
    await sequelize.query(`
      UPDATE plans SET 
        sales_enabled = TRUE,
        geolocation_enabled = FALSE,
        max_geolocation_staff = 0
      WHERE code = 'PRO'
    `);
    
    await sequelize.query(`
      UPDATE plans SET 
        sales_enabled = TRUE,
        geolocation_enabled = TRUE,
        max_geolocation_staff = 50
      WHERE code = 'ENTERPRISE'
    `);
    
    console.log('✅ Plans updated successfully!');
    
    // Show all plans
    const plans = await sequelize.query('SELECT * FROM plans ORDER BY price ASC');
    console.log('\n📋 Enhanced Plans:');
    plans[0].forEach(plan => {
      console.log(`- ${plan.name}: ₹${plan.price}/month, ${plan.staff_limit} staff`);
      console.log(`  Sales: ${plan.sales_enabled ? '✅' : '❌'}, Geolocation: ${plan.geolocation_enabled ? '✅' : '❌'}, Max Geo Staff: ${plan.max_geolocation_staff}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (sequelize && sequelize.close) {
      await sequelize.close();
    }
    process.exit(0);
  }
}

addSubscriptionColumns();
