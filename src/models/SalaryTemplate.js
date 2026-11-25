const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SalaryTemplate = sequelize.define(
    'SalaryTemplate',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      code: { type: DataTypes.STRING(50), allowNull: true, unique: true },
      payableDaysMode: {
        type: DataTypes.ENUM('calendar_month', 'every_30', 'every_28', 'every_26', 'exclude_weekly_offs'),
        allowNull: false,
        defaultValue: 'calendar_month',
      },
      weeklyOffs: { type: DataTypes.JSON, allowNull: true },
      hoursPerDay: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 8 },
      // Structured compensation blocks
      // Each is an array of items: { key, label, type: 'fixed'|'percent', valueNumber, meta? }
      earnings: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        get() {
          const raw = this.getDataValue('earnings');
          if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch (e) { return []; }
          }
          return raw || [];
        }
      },
      incentives: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        get() {
          const raw = this.getDataValue('incentives');
          if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch (e) { return []; }
          }
          return raw || [];
        }
      },
      deductions: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        get() {
          const raw = this.getDataValue('deductions');
          if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch (e) { return []; }
          }
          return raw || [];
        }
      },
      // Additional metadata: currency, rounding preferences, notes
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
          const raw = this.getDataValue('metadata');
          if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch (e) { return {}; }
          }
          return raw || {};
        }
      },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    { tableName: 'salary_templates', underscored: true }
  );
  return SalaryTemplate;
};
