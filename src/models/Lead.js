const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Lead = sequelize.define('Lead', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    personName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    customerType: {
      type: DataTypes.STRING, // Tally partner, CA, Direct
      allowNull: true
    },
    category: {
      type: DataTypes.STRING, // Security agencies, Construction
      allowNull: true
    },
    status: {
      type: DataTypes.STRING, // Demo, Partner
      allowNull: true
    },
    nextFollowUpDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    lastFollowUpDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    handledBy: {
      type: DataTypes.STRING, // Staff name
      allowNull: true
    },
    serviceRequired: {
      type: DataTypes.STRING, // Payroll, Sales, Task
      allowNull: true
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    }
  }, {
    tableName: 'leads',
    timestamps: true
  });

  return Lead;
};
