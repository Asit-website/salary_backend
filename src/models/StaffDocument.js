const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffDocument = sequelize.define(
    'StaffDocument',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      documentTypeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      fileUrl: { type: DataTypes.STRING(255), allowNull: false },
      fileName: { type: DataTypes.STRING(255), allowNull: true },
      status: { type: DataTypes.ENUM('SUBMITTED', 'APPROVED', 'REJECTED'), allowNull: false, defaultValue: 'SUBMITTED' },
    },
    {
      tableName: 'staff_documents',
      underscored: true,
    }
  );

  return StaffDocument;
};
