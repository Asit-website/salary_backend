const { sequelize, EarlyOvertimeRule, StaffEarlyOvertimeAssignment } = require('../src/models');

async function migrate() {
  try {
    console.log('--- Starting Early Overtime Migration ---');

    console.log('1. Syncing new models (EarlyOvertimeRule, StaffEarlyOvertimeAssignment)...');
    await EarlyOvertimeRule.sync({ alter: true });
    await StaffEarlyOvertimeAssignment.sync({ alter: true });

    console.log('2. Adding columns to attendance table...');
    await sequelize.query(`
      ALTER TABLE attendance 
      ADD COLUMN IF NOT EXISTS early_overtime_minutes INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS early_overtime_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS early_overtime_rule_id BIGINT UNSIGNED NULL
    `).catch(e => console.log('Attendance Table Columns Note:', e.message));

    // Separate step for FK to avoid errors if already exists or table issue
    await sequelize.query(`
      ALTER TABLE attendance
      ADD CONSTRAINT fk_attendance_early_ot_rule 
      FOREIGN KEY (early_overtime_rule_id) REFERENCES early_overtime_rules(id)
    `).catch(e => console.log('Attendance FK Note:', e.message));

    console.log('3. Adding column to org_accounts table...');
    await sequelize.query(`
      ALTER TABLE org_accounts
      ADD COLUMN IF NOT EXISTS early_overtime_rule_id BIGINT UNSIGNED NULL
    `).catch(e => console.log('OrgAccount Table Column Note:', e.message));

    await sequelize.query(`
      ALTER TABLE org_accounts
      ADD CONSTRAINT fk_org_early_ot_rule 
      FOREIGN KEY (early_overtime_rule_id) REFERENCES early_overtime_rules(id)
    `).catch(e => console.log('OrgAccount FK Note:', e.message));

    console.log('--- Migration Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
