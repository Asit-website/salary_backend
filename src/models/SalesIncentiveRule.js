const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SalesIncentiveRule = sequelize.define(
        'SalesIncentiveRule',
        {
            id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
            orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
            name: { type: DataTypes.STRING(120), allowNull: false },
            ruleType: {
                type: DataTypes.ENUM('fixed', 'value_slab', 'unit_slab'),
                allowNull: false,
                field: 'rule_type'
            },
            config: {
                type: DataTypes.JSON,
                allowNull: false,
                get() {
                    const val = this.getDataValue('config');
                    if (typeof val === 'string') {
                        try { return JSON.parse(val); } catch (e) { return val; }
                    }
                    return val;
                }
            },
            active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        { tableName: 'sales_incentive_rules', underscored: true }
    );

    return SalesIncentiveRule;
};
