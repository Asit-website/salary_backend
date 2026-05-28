const { sequelize, AuditLog } = require('../src/models');

(async () => {
  console.log('--- Syncing AuditLog Table ---');
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    await AuditLog.sync({ alter: true });
    console.log('✅ AuditLog table synchronized successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing AuditLog table:', error);
    process.exit(1);
  }
})();
