const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrgAccount = sequelize.define(
    'OrgAccount',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      businessEmail: { type: DataTypes.STRING(150), allowNull: true },
      state: { type: DataTypes.STRING(100), allowNull: true },
      city: { type: DataTypes.STRING(100), allowNull: true },
      channelPartnerId: { type: DataTypes.STRING(100), allowNull: true },
      roleDescription: { type: DataTypes.TEXT, allowNull: true },
      employeeCount: { type: DataTypes.STRING(50), allowNull: true },
      clientType: { type: DataTypes.STRING(50), allowNull: true },
      location: { type: DataTypes.STRING(255), allowNull: true },
      extra: { type: DataTypes.JSON, allowNull: true },
      contactPersonName: { type: DataTypes.STRING(150), allowNull: true },
      address: { type: DataTypes.TEXT, allowNull: true },
      birthDate: { type: DataTypes.DATEONLY, allowNull: true },
      anniversaryDate: { type: DataTypes.DATEONLY, allowNull: true },
      gstNumber: { type: DataTypes.STRING(50), allowNull: true },
      status: { type: DataTypes.ENUM('ACTIVE', 'DISABLED', 'SUSPENDED'), allowNull: false, defaultValue: 'ACTIVE' },
      createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      overtimeRuleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'overtime_rule_id' },
      earlyExitRuleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'early_exit_rule_id' },
      breakRuleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'break_rule_id' },
      earlyOvertimeRuleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'early_overtime_rule_id' },
    },
    { tableName: 'org_accounts', underscored: true }
  );

  return OrgAccount;
};
