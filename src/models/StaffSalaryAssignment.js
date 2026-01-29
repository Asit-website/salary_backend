const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffSalaryAssignment = sequelize.define(
    'StaffSalaryAssignment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      salaryTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
    },
    {
      tableName: 'staff_salary_assignments',
      underscored: true,
      indexes: [{ unique: true, fields: ['user_id', 'effective_from'] }],
    }
  );

  return StaffSalaryAssignment;
};
