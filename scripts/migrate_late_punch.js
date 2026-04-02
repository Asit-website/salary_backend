const { sequelize } = require('../src/models');
const { DataTypes } = require('sequelize');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  const tableExists = await queryInterface.showAllTables();

  console.log('--- Starting Late Punch-In Penalty Migration ---');

  // 1. Create late_punchin_rules table if not exists
  if (!tableExists.includes('late_punchin_rules')) {
    console.log('Creating late_punchin_rules table...');
    await queryInterface.createTable('late_punchin_rules', {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(255), allowNull: false },
      penalty_type: {
        type: DataTypes.ENUM('FIXED_AMOUNT', 'FIXED_AMOUNT_PER_HOUR', 'SALARY_MULTIPLIER', 'HALF_DAY', 'FULL_DAY', 'SLABS'),
        allowNull: false,
        defaultValue: 'SLABS'
      },
      thresholds: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      org_account_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    });
    console.log('late_punchin_rules table created.');
  } else {
    console.log('late_punchin_rules table already exists.');
  }

  // 2. Create staff_late_punchin_assignments table if not exists
  if (!tableExists.includes('staff_late_punchin_assignments')) {
    console.log('Creating staff_late_punchin_assignments table...');
    await queryInterface.createTable('staff_late_punchin_assignments', {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      late_punch_in_rule_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      effective_from: { type: DataTypes.DATEONLY, allowNull: false },
      effective_to: { type: DataTypes.DATEONLY, allowNull: true },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      org_account_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    });
    console.log('staff_late_punchin_assignments table created.');
  } else {
    console.log('staff_late_punchin_assignments table already exists.');
  }

  // 3. Add columns to attendance table
  const attendanceCols = await queryInterface.describeTable('attendance');
  
  if (!attendanceCols.late_punchin_minutes) {
    console.log('Adding late_punchin_minutes to attendance...');
    await queryInterface.addColumn('attendance', 'late_punchin_minutes', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  }
  
  if (!attendanceCols.late_punchin_amount) {
    console.log('Adding late_punchin_amount to attendance...');
    await queryInterface.addColumn('attendance', 'late_punchin_amount', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
  }
  
  if (!attendanceCols.late_punchin_rule_id) {
    console.log('Adding late_punchin_rule_id to attendance...');
    await queryInterface.addColumn('attendance', 'late_punchin_rule_id', {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    });
  }

  if (!attendanceCols.is_late) {
    console.log('Adding is_late to attendance...');
    await queryInterface.addColumn('attendance', 'is_late', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  }

  console.log('--- Migration Completed Successfully ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
