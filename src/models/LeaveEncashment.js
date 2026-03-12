const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const LeaveEncashment = sequelize.define(
        'LeaveEncashment',
        {
            id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
            userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
            categoryKey: { type: DataTypes.STRING(50), allowNull: false },
            days: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
            amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
            status: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING' },
            monthKey: { type: DataTypes.STRING(7), allowNull: false }, // YYYY-MM
            reviewedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
            reviewedAt: { type: DataTypes.DATE, allowNull: true },
            reviewNote: { type: DataTypes.STRING(500), allowNull: true },
            orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
        },
        { tableName: 'leave_encashments', underscored: true }
    );

    return LeaveEncashment;
};
