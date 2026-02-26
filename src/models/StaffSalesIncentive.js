const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const StaffSalesIncentive = sequelize.define(
        'StaffSalesIncentive',
        {
            id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
            orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' },
            staffUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'staff_user_id' },
            incentiveRuleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'incentive_rule_id' },
            orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'order_id' },
            achievedAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'achieved_amount' },
            incentiveAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'incentive_amount' },
            status: {
                type: DataTypes.ENUM('pending', 'approved', 'rejected'),
                allowNull: false,
                defaultValue: 'pending'
            },
            remarks: { type: DataTypes.TEXT, allowNull: true },
            approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
        },
        { tableName: 'staff_sales_incentives', underscored: true }
    );

    return StaffSalesIncentive;
};
