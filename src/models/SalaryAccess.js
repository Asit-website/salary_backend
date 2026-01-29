const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SalaryAccess = sequelize.define(
    'SalaryAccess',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      allowCurrentCycle: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'salary_access',
      underscored: true,
    }
  );

  return SalaryAccess;
};
