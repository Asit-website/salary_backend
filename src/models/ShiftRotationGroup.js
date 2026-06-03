const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ShiftRotationGroup = sequelize.define(
    'ShiftRotationGroup',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' },
      name: { type: DataTypes.STRING(150), allowNull: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'shift_rotation_groups',
      underscored: true,
    }
  );

  ShiftRotationGroup.associate = (models) => {
    ShiftRotationGroup.belongsTo(models.OrgAccount, { foreignKey: 'orgAccountId', as: 'orgAccount' });
    ShiftRotationGroup.hasMany(models.User, { foreignKey: 'shiftRotationGroupId', as: 'staff' });
    ShiftRotationGroup.hasOne(models.ShiftRotationRule, { foreignKey: 'shiftRotationGroupId', as: 'rule' });
  };

  return ShiftRotationGroup;
};
