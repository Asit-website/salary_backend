const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Ticket = sequelize.define('Ticket', {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
        allocatedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
        allocatedTo: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
        updatedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'updated_by' },
        title: { type: DataTypes.STRING(255), allowNull: false },
        ticketId: { type: DataTypes.STRING(100), allowNull: false, unique: true, field: 'ticket_id' },
        attachment: { type: DataTypes.STRING(255), allowNull: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        remarks: { type: DataTypes.TEXT, allowNull: true },
        status: {
            type: DataTypes.ENUM('SCHEDULE', 'IN_PROGRESS', 'REVIEW', 'DONE'),
            allowNull: false,
            defaultValue: 'SCHEDULE'
        },
        priority: {
            type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
            allowNull: false,
            defaultValue: 'MEDIUM'
        },
        dueDate: { type: DataTypes.DATEONLY, allowNull: true },
        isClosed: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_closed' },
        closedById: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'closed_by_id' },
    }, {
        tableName: 'tickets',
        underscored: true,
        timestamps: true,
    });

    return Ticket;
};
