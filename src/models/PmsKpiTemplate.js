const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PmsKpiTemplate = sequelize.define(
    'PmsKpiTemplate',
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
      kraTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'kra_template_id',
      },
      kpiName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'kpi_name',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      target: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      minTarget: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'min_target',
        comment: 'Min Acceptable Target threshold',
      },
      maxTarget: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'max_target',
        comment: 'Max Target (Cap) ceiling',
      },
      performanceDirection: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'Higher is Better',
        field: 'performance_direction',
        comment: 'Higher is Better, Lower is Better, Exact Target, Rating-Based',
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '%, ₹, Count, Units, Days, Hours',
      },
      weightage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Weightage of KPI within parent KRA (%)',
      },
      measurementMethod: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Direct Value',
        field: 'measurement_method',
        comment: 'Direct Value, Percentage, Milestone, Formula, Rating',
      },
      dataSource: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Manual Input',
        field: 'data_source',
        comment: 'System Generated, Manual Input, Sales CRM, Attendance, ERP',
      },
      frequency: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Monthly',
        comment: 'Monthly, Quarterly, Half-Yearly, Annual',
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'pms_kpi_templates',
      timestamps: true,
      underscored: true,
    }
  );

  return PmsKpiTemplate;
};
