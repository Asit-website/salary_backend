const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SalesVisitAttachment = sequelize.define(
    'SalesVisitAttachment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      visitId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      fileUrl: { type: DataTypes.STRING(255), allowNull: false },
    },
    { tableName: 'sales_visit_attachments', underscored: true }
  );

  return SalesVisitAttachment;
};
