const { sequelize, Plan } = require('./src/models');

async function testPlansAPI() {
  try {
    console.log('Testing Plans API...');
    
    // Test the same query as the API
    const rows = await Plan.findAll({ order: [['name', 'ASC']] });
    
    console.log('✅ API Query Success!');
    console.log('Plans found:', rows.length);
    
    const response = { success: true, plans: rows };
    console.log('Response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ API Query Failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (sequelize && sequelize.close) {
      await sequelize.close();
    }
    process.exit(0);
  }
}

testPlansAPI();
