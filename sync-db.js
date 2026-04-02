const { sequelize, BreakRule, StaffBreakAssignment, Attendance, OrgAccount } = require('./src/models');

(async () => {
  console.log('--- Database Sync Script Started ---');
  try {
    // 1. Authenticate connection
    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');

    // 2. Sync new models (This creates the tables if they don't exist)
    console.log('⏳ Synchronizing BreakRule and StaffBreakAssignment...');
    await BreakRule.sync({ alter: true });
    await StaffBreakAssignment.sync({ alter: true });
    console.log('✅ New tables created/updated.');

    // 3. Alter existing models (This adds new columns like breakRuleId, etc.)
    console.log('⏳ Updating Attendance and OrgAccount columns...');
    await Attendance.sync({ alter: true });
    await OrgAccount.sync({ alter: true });
    console.log('✅ Existing tables updated with new columns.');

    console.log('\n--- Sync Completed Successfully! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during sync:', error);
    process.exit(1);
  }
})();
