const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const StaffLetter = sequelize.define('StaffLetter', {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        staffId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'staff_id' },
        letterTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'letter_template_id' },
        title: { type: DataTypes.STRING(150), allowNull: false },
        content: { type: DataTypes.TEXT('long'), allowNull: false },
        issuedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'issued_at' },
        issuedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'issued_by' },
        orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    }, {
        tableName: 'staff_letters',
        underscored: true,
        timestamps: true,
    });

    return StaffLetter;
};
