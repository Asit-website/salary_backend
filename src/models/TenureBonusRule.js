const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TenureBonusRule = sequelize.define(
    'TenureBonusRule',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false },
      paymentMonth: { type: DataTypes.STRING, allowNull: true, field: 'payment_month' }, // e.g., '2026-04'
      config: { type: DataTypes.JSON, allowNull: true }, // [{min, max, percent}]
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' },
    },
    {
      tableName: 'tenure_bonus_rules',
      underscored: true,
    }
  );

  return TenureBonusRule;
};
