const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffEarlyExitAssignment = sequelize.define(
    'StaffEarlyExitAssignment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: false, 
        field: 'user_id',
        references: { model: 'users', key: 'id' }
      },
      earlyExitRuleId: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: false, 
        field: 'early_exit_rule_id',
        references: { model: 'early_exit_rules', key: 'id' }
      },
      orgAccountId: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: false, 
        field: 'org_account_id',
        references: { model: 'org_accounts', key: 'id' }
      },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
    },
    {
      tableName: 'staff_early_exit_assignments',
      underscored: true,
    }
  );

  StaffEarlyExitAssignment.associate = function(models) {
    StaffEarlyExitAssignment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    StaffEarlyExitAssignment.belongsTo(models.EarlyExitRule, { foreignKey: 'earlyExitRuleId', as: 'rule' });
  };

  return StaffEarlyExitAssignment;
};
