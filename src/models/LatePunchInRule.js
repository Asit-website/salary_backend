const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LatePunchInRule = sequelize.define(
    'LatePunchInRule',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(255), allowNull: false },
      
      penaltyType: {
        type: DataTypes.ENUM(
          'FIXED_AMOUNT', 
          'FIXED_AMOUNT_PER_HOUR', 
          'SALARY_MULTIPLIER',
          'HALF_DAY',
          'FULL_DAY',
          'SLABS'
        ),
        allowNull: false,
        defaultValue: 'SLABS'
      },

      thresholds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },

      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      bufferMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'buffer_minutes' },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' }
    },
    {
      tableName: 'late_punchin_rules',
      underscored: true,
    }
  );

  return LatePunchInRule;
};
