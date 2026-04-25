const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LeadConfig = sequelize.define('LeadConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    key: {
      type: DataTypes.STRING, // e.g., 'customerTypes', 'categories', 'statuses', 'handledBy', 'services'
      unique: true,
      allowNull: false
    },
    options: {
      type: DataTypes.TEXT, // JSON string of array of options
      allowNull: false,
      defaultValue: '[]'
    }
  }, {
    tableName: 'lead_configs',
    timestamps: true
  });

  return LeadConfig;
};
