const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WorkUnit = sequelize.define(
    'WorkUnit',
    {   
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      siteId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      workDate: { type: DataTypes.DATEONLY, allowNull: false },
      unitType: { type: DataTypes.STRING(50), allowNull: false },
      quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      notes: { type: DataTypes.STRING(255), allowNull: true },
      checkInLat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      checkInLng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      checkInTime: { type: DataTypes.DATE, allowNull: true },
      supervisorVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      verifiedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'work_units', underscored: true }
  );

  return WorkUnit;
};
