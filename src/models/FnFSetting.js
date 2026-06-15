const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FnFSetting = sequelize.define(
    'FnFSetting',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      orgAccountId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'org_account_id'
      },
      leaveBasis: {
        type: DataTypes.ENUM('basic_da', 'basic', 'gross'),
        allowNull: false,
        defaultValue: 'basic_da',
        field: 'leave_basis'
      },
      leaveDivisor: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'calendar_month',
        field: 'leave_divisor'
      },
      leaveMaxDays: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'leave_max_days'
      },
      noticeBasis: {
        type: DataTypes.ENUM('basic_da', 'basic', 'gross'),
        allowNull: false,
        defaultValue: 'gross',
        field: 'notice_basis'
      },
      noticeDivisor: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'calendar_month',
        field: 'notice_divisor'
      },
      gratuityEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'gratuity_enabled'
      },
      gratuityMinYears: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 4.80,
        field: 'gratuity_min_years'
      },
      gratuityDivisor: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 26,
        field: 'gratuity_divisor'
      },
      gratuityMultiplierDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15,
        field: 'gratuity_multiplier_days'
      }
    },
    {
      tableName: 'fnf_settings',
      timestamps: true,
      underscored: true
    }
  );

  FnFSetting.associate = (models) => {
    FnFSetting.belongsTo(models.OrgAccount, {
      foreignKey: 'orgAccountId',
      as: 'orgAccount'
    });
  };

  return FnFSetting;
};
