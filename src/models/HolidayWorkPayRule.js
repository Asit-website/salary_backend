const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HolidayWorkPayRule = sequelize.define('HolidayWorkPayRule', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    holidayMultiplier: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
    },
    weeklyOffMultiplier: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
    },
    orgAccountId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }
  }, {
    tableName: 'holiday_work_pay_rules',
    underscored: true,
    timestamps: true,
  });

  return HolidayWorkPayRule;
};
