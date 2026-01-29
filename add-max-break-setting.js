const { sequelize } = require('./src/models');
const { AppSetting } = require('./src/models');

async function addMaxBreakSetting() {
  try {
    console.log('Adding MAX_BREAK_DURATION setting to app_settings table...');
    
    // Check if setting already exists
    const existingSetting = await AppSetting.findOne({
      where: { key: 'MAX_BREAK_DURATION' }
    });
    
    if (existingSetting) {
      console.log('MAX_BREAK_DURATION setting already exists with value:', existingSetting.value);
      return;
    }
    
    // Add the new setting
    await AppSetting.create({
      key: 'MAX_BREAK_DURATION',
      value: '30' // Default 30 minutes
    });
    
    console.log('✅ MAX_BREAK_DURATION setting added successfully with default value: 30 minutes');
    
  } catch (error) {
    console.error('❌ Error adding MAX_BREAK_DURATION setting:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the function
addMaxBreakSetting();
