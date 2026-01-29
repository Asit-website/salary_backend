module.exports = (sequelize, DataTypes) => {
  const ExpenseClaim = sequelize.define('ExpenseClaim', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    claimId: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    expenseType: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    expenseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    billNumber: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'settled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approvedAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    approvedBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    settledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    attachmentUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  }, {
    tableName: 'expense_claims',
    timestamps: true,
  });

  ExpenseClaim.associate = (models) => {
    if (models.User) {
      ExpenseClaim.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  };

  return ExpenseClaim;
};
