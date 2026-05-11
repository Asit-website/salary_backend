const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ClientAssignment = sequelize.define(
    'ClientAssignment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      clientId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      staffUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    { tableName: 'client_assignments', underscored: true }
  );

  return ClientAssignment;
};
