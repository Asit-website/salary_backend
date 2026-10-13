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
      kraCode: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'kra_code',
        comment: 'Unique identifier for each KRA',
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
      performanceDirection: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'Higher is Better',
        field: 'performance_direction',
        comment: 'Higher is Better, Lower is Better, Exact Target',
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '%, INR, Units, Count, Days, Hours, Score',
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'Active',
        comment: 'Active, Inactive',
      },
      effectiveFrom: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'effective_from',
      },
      effectiveTo: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'effective_to',
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
