module.exports = (sequelize, DataTypes) => {
  const Loan = sequelize.define('Loan', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
    type: { type: DataTypes.ENUM('loan','payment'), allowNull: false, defaultValue: 'loan' },
    description: { type: DataTypes.STRING(500), allowNull: true },
    notifySms: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    tableName: 'loans',
  });

  Loan.associate = (models) => {
    Loan.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return Loan;
};
