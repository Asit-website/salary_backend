const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DocumentType = sequelize.define(
    'DocumentType',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      key: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      allowedMime: { type: DataTypes.STRING(255), allowNull: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    {
      tableName: 'document_types',
      underscored: true,
    }
  );

  return DocumentType;
};
