const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const AttendanceAutomationRule = sequelize.define(
        'AttendanceAutomationRule',
        {
            id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
            key: { type: DataTypes.STRING(100), allowNull: false },
            config: { type: DataTypes.TEXT, allowNull: true, comment: 'JSON configuration for the rule' },
            active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
        },
        {
            tableName: 'attendance_automation_rules',
            underscored: true,
            indexes: [
                { unique: true, fields: ['key', 'org_account_id'], name: 'unique_key_org_automation' }
            ]
        }
    );

    return AttendanceAutomationRule;
};
