const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffRoster = sequelize.define(
    'StaffRoster',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      shiftTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'shift_template_id' },
      status: { 
        type: DataTypes.ENUM('SHIFT', 'WEEKLY_OFF', 'HOLIDAY'), 
        allowNull: false, 
        defaultValue: 'SHIFT' 
      },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' },
    },
    {
      tableName: 'staff_rosters',
      underscored: true,
      indexes: [
        { unique: true, fields: ['user_id', 'date'] },
        { fields: ['org_account_id'] },
        { fields: ['date'] }
      ],
    }
  );

  StaffRoster.associate = (models) => {
    StaffRoster.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    StaffRoster.belongsTo(models.ShiftTemplate, { foreignKey: 'shiftTemplateId', as: 'shiftTemplate' });
    StaffRoster.belongsTo(models.OrgAccount, { foreignKey: 'orgAccountId', as: 'orgAccount' });
  };

  return StaffRoster;
};
