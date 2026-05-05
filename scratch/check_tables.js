const { sequelize } = require('../src/sequelize');

async function checkTables() {
  try {
    const [results] = await sequelize.query("SHOW TABLES LIKE 'holiday_work_pay_rules'");
    const [results2] = await sequelize.query("SHOW TABLES LIKE 'staff_holiday_work_pay_assignments'");
    
    console.log('holiday_work_pay_rules exists:', results.length > 0);
    console.log('staff_holiday_work_pay_assignments exists:', results2.length > 0);
    
    process.exit(0);
  } catch (e) {
    console.error('Error checking tables:', e);
    process.exit(1);
  }
}

checkTables();
