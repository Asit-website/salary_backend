const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Plan = sequelize.define(
    'Plan',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      periodDays: { 
        type: DataTypes.INTEGER.UNSIGNED, 
        allowNull: false,
        field: 'period_days'
      },
      staffLimit: { 
        type: DataTypes.INTEGER.UNSIGNED, 
        allowNull: false, 
        defaultValue: 10,
        field: 'staff_limit'
      },
      price: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      salesEnabled: { 
        type: DataTypes.BOOLEAN, 
        allowNull: false, 
        defaultValue: false,
        field: 'sales_enabled'
      },
      geolocationEnabled: { 
        type: DataTypes.BOOLEAN, 
        allowNull: false, 
        defaultValue: false,
        field: 'geolocation_enabled'
      },
      maxGeolocationStaff: { 
        type: DataTypes.INTEGER.UNSIGNED, 
        allowNull: false, 
        defaultValue: 0,
        field: 'max_geolocation_staff'
      },
      features: { type: DataTypes.JSON, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { 
      tableName: 'plans', 
      underscored: true 
    }
  );

  return Plan;
};
