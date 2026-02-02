const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrgBankAccount = sequelize.define('OrgBankAccount', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    accountHolderName: { type: DataTypes.STRING(128), allowNull: false, field: 'account_holder_name' },
    accountNumber: { type: DataTypes.STRING(64), allowNull: false, field: 'account_number' },
    ifsc: { type: DataTypes.STRING(32), allowNull: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
  }, {
    tableName: 'org_bank_accounts',
    underscored: true,
    timestamps: true,
  });

  return OrgBankAccount;
};
