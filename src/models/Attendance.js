const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attendance = sequelize.define(
    'Attendance',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: false,
        field: 'user_id'
      },
      date: { type: DataTypes.DATEONLY, allowNull: false },

      punchedInAt: { type: DataTypes.DATE, allowNull: true, field: 'punched_in_at' },
      punchedOutAt: { type: DataTypes.DATE, allowNull: true, field: 'punched_out_at' },

      status: { type: DataTypes.STRING(20), allowNull: true },

      isOnBreak: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_on_break' },
      breakStartedAt: { type: DataTypes.DATE, allowNull: true, field: 'break_started_at' },
      breakTotalSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'break_total_seconds' },
      totalWorkHours: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'total_work_hours' },
      overtimeMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'overtime_minutes' },
      autoPunchout: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'auto_punchout' },

      punchInPhotoUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'punch_in_photo_url' },
      punchOutPhotoUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'punch_out_photo_url' },

      latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
      address: { type: DataTypes.TEXT, allowNull: true },

      punchOutLatitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true, field: 'punch_out_latitude' },
      punchOutLongitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true, field: 'punch_out_longitude' },
      punchOutAddress: { type: DataTypes.TEXT, allowNull: true, field: 'punch_out_address' },

      note: { type: DataTypes.TEXT, allowNull: true },
      source: { type: DataTypes.STRING(30), allowNull: true, defaultValue: 'mobile' },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
      
      overtimeAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'overtime_amount' },
      overtimeRuleId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'overtime_rule_id',
        references: { model: 'overtime_rules', key: 'id' }
      },
      earlyOvertimeMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'early_overtime_minutes'
      },
      earlyOvertimeAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'early_overtime_amount'
      },
      earlyOvertimeRuleId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'early_overtime_rule_id',
        references: { model: 'early_overtime_rules', key: 'id' }
      },
      earlyExitMinutes: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'early_exit_minutes'
      },
      earlyExitAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'early_exit_amount'
      },
      earlyExitRuleId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'early_exit_rule_id',
        references: { model: 'early_exit_rules', key: 'id' }
      },
      isAutoMarked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_auto_marked'
      },
      breakDeductionAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'break_deduction_amount'
      },
      breakRuleId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'break_rule_id',
        references: { model: 'break_rules', key: 'id' }
      },
      excessBreakMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: 'excess_break_minutes'
      },
      latePunchInMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'late_punchin_minutes'
      },
      latePunchInAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'late_punchin_amount'
      },
      latePunchInRuleId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'late_punchin_rule_id',
        references: { model: 'late_punchin_rules', key: 'id' }
      },
      isLate: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_late'
      },
    },
    {
      tableName: 'attendance', // SINGULAR table
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['user_id', 'date'] }],
    }
  );

  return Attendance;
};
