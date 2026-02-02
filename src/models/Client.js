const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Client = sequelize.define(
    'Client',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      clientType: { type: DataTypes.STRING(50), allowNull: true },
      location: { type: DataTypes.STRING(255), allowNull: true },
      extra: { type: DataTypes.JSON, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
      createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    { tableName: 'clients', underscored: true }
  );

  return Client;
};
