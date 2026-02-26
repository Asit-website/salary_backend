const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const StaffIncentiveRule = sequelize.define(
        'StaffIncentiveRule',
        {
            id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
            staffUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'staff_user_id' },
            incentiveRuleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'incentive_rule_id' },
            orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
            active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        { tableName: 'staff_incentive_rules', underscored: true }
    );

    return StaffIncentiveRule;
};
