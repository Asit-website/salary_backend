const { sequelize, ShiftRotationGroup, ShiftRotationRule, User } = require('./src/models');

(async () => {
  console.log('--- Shift Rotation Database Sync Script Started ---');
  try {
    // 1. Authenticate connection
    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');

    // 2. Sync new models
    console.log('⏳ Synchronizing ShiftRotationGroup and ShiftRotationRule...');
    await ShiftRotationGroup.sync({ alter: true });
    await ShiftRotationRule.sync({ alter: true });
    console.log('✅ New tables created/updated.');

    // 3. Alter existing User model
    console.log('⏳ Updating User columns to include shiftRotationGroupId...');
    await User.sync({ alter: true });
    console.log('✅ User table updated.');

    console.log('\n--- Sync Completed Successfully! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during sync:', error);
    process.exit(1);
  }
})();
