const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffAdvance = sequelize.define('StaffAdvance', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    staffId: { type: DataTypes.INTEGER, allowNull: false },
    orgAccountId: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    advanceDate: { type: DataTypes.DATEONLY, allowNull: false },
    deductionMonth: { type: DataTypes.STRING(10), allowNull: false }, // Format: YYYY-MM
    status: { 
      type: DataTypes.ENUM('pending', 'deducted', 'cancelled'), 
      allowNull: false, 
      defaultValue: 'pending' 
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
    updatedBy: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'staff_advances',
    timestamps: true,
    underscored: true,
  });

  return StaffAdvance;
};
