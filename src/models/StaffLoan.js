const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffLoan = sequelize.define('StaffLoan', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    staffId: { type: DataTypes.INTEGER, allowNull: false },
    orgId: { type: DataTypes.INTEGER, allowNull: false },
    loanType: { type: DataTypes.STRING(100), allowNull: false },
    amount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    interestRate: { type: DataTypes.DECIMAL(5,2), allowNull: false, defaultValue: 0 },
    tenure: { type: DataTypes.INTEGER, allowNull: false }, // in months
    emiAmount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    issueDate: { type: DataTypes.DATEONLY, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: { 
      type: DataTypes.ENUM('active', 'completed', 'defaulted'), 
      allowNull: false, 
      defaultValue: 'active' 
    },
    purpose: { type: DataTypes.TEXT, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'staff_loans',
    timestamps: true,
  });

  StaffLoan.associate = (models) => {
    StaffLoan.belongsTo(models.User, { foreignKey: 'staffId', as: 'staffMember' });
    StaffLoan.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    StaffLoan.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return StaffLoan;
};
