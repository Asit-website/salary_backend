const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PmsKraTemplate = sequelize.define(
    'PmsKraTemplate',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orgAccountId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'org_account_id',
      },
      kraName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'kra_name',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      department: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      designation: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'General',
        comment: 'Financial, Customer, Operational, Sales, Learning & Growth, Quality, Teamwork, General',
      },
      weightage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Weightage in percentage (e.g. 40.00 for 40%)',
      },
      measurementType: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Percentage',
        field: 'measurement_type',
        comment: 'Percentage, Numeric, Currency, Score, Boolean',
      },
      target: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      minTarget: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'min_target',
      },
      maxTarget: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'max_target',
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '%, INR, Units, Count, Days, Hours, Score',
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'pms_kra_templates',
      timestamps: true,
      underscored: true,
    }
  );

  return PmsKraTemplate;
};
