const { DataTypes } = require('sequelize');
const { encrypt, decrypt } = require('../utils/encryption');

module.exports = (sequelize) => {
  const OrgBankAccount = sequelize.define('OrgBankAccount', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    accountHolderName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      get() {
        return decrypt(this.getDataValue('accountHolderName'), 'string');
      },
      set(value) {
        this.setDataValue('accountHolderName', encrypt(value));
      }
    },
    accountNumber: {
      type: DataTypes.STRING(255),
      allowNull: false,
      get() {
        return decrypt(this.getDataValue('accountNumber'), 'string');
      },
      set(value) {
        this.setDataValue('accountNumber', encrypt(value));
      }
    },
    ifsc: {
      type: DataTypes.STRING(255),
      allowNull: false,
      get() {
        return decrypt(this.getDataValue('ifsc'), 'string');
      },
      set(value) {
        this.setDataValue('ifsc', encrypt(value));
      }
    },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  }, {
    tableName: 'org_bank_accounts',
    timestamps: true,
  });

  return OrgBankAccount;
};
