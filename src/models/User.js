const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      role: { type: DataTypes.ENUM('superadmin', 'admin', 'staff'), allowNull: false },
      orgAccountId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'org_account_id',
        references: { model: 'org_accounts', key: 'id' },
      },
      phone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      passwordHash: { 
        type: DataTypes.STRING(255), 
        allowNull: false,
        field: 'password_hash'
      },
      salaryTemplateId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'salary_template_id',
        references: {
          model: 'salary_templates',
          key: 'id'
        }
      },
      shiftTemplateId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'shift_template_id',
        references: {
          model: 'shift_templates',
          key: 'id'
        }
      },
      salaryValues: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'salary_values'
      },
      // Salary calculation fields
      basicSalary: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'basic_salary'
      },
      hra: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
      da: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
      specialAllowance: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'special_allowance'
      },
      conveyanceAllowance: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'conveyance_allowance'
      },
      medicalAllowance: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'medical_allowance'
      },
      telephoneAllowance: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'telephone_allowance'
      },
      otherAllowances: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'other_allowances'
      },
      totalEarnings: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'total_earnings'
      },
      pfDeduction: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'pf_deduction'
      },
      esiDeduction: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'esi_deduction'
      },
      professionalTax: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'professional_tax'
      },
      tdsDeduction: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'tds_deduction'
      },
      otherDeductions: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'other_deductions'
      },
      totalDeductions: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'total_deductions'
      },
      grossSalary: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'gross_salary'
      },
      netSalary: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true, 
        defaultValue: 0,
        field: 'net_salary'
      },
      salaryLastCalculated: { 
        type: DataTypes.DATE, 
        allowNull: true,
        field: 'salary_last_calculated'
      },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'users',
      underscored: true,
    }
  );

  User.associate = function(models) {
    User.belongsTo(models.SalaryTemplate, { foreignKey: 'salaryTemplateId', as: 'salaryTemplate' });
    User.belongsTo(models.ShiftTemplate, { foreignKey: 'shiftTemplateId', as: 'shiftTemplate' });
  };

  // Instance method to calculate salary based on template
  User.prototype.calculateSalaryFromTemplate = async function(attendanceData = {}) {
    if (!this.salaryTemplateId) {
      throw new Error('No salary template assigned');
    }

    const { SalaryTemplate } = require('./index');
    const template = await SalaryTemplate.findByPk(this.salaryTemplateId);
    
    if (!template) {
      throw new Error('Salary template not found');
    }

    const { workingDays = 26, presentDays = 26 } = attendanceData;
    
    // Calculate earnings
    let earnings = {};
    let totalEarnings = 0;
    
    const earningsData = typeof template.earnings === 'string' ? JSON.parse(template.earnings) : template.earnings;
    earningsData.forEach(item => {
      let value = 0;
      if (item.type === 'fixed') {
        value = item.valueNumber;
      } else if (item.type === 'percent') {
        const baseValue = earnings[item.meta?.basedOn] || 0;
        value = (baseValue * item.valueNumber) / 100;
      }
      earnings[item.key] = value;
      totalEarnings += value;
    });

    // Calculate incentives
    let incentives = {};
    let totalIncentives = 0;
    
    const incentivesData = typeof template.incentives === 'string' ? JSON.parse(template.incentives) : template.incentives;
    incentivesData.forEach(item => {
      let value = 0;
      if (item.type === 'fixed') {
        value = item.valueNumber;
      } else if (item.type === 'percent') {
        const baseValue = earnings[item.meta?.basedOn] || totalEarnings;
        value = (baseValue * item.valueNumber) / 100;
      }
      incentives[item.key] = value;
      totalIncentives += value;
    });

    // Calculate deductions
    let deductions = {};
    let totalDeductions = 0;
    
    const deductionsData = typeof template.deductions === 'string' ? JSON.parse(template.deductions) : template.deductions;
    deductionsData.forEach(item => {
      let value = 0;
      if (item.type === 'fixed') {
        value = item.valueNumber;
      } else if (item.type === 'percent') {
        const baseValue = item.meta?.basedOn === 'gross_salary' ? 
          totalEarnings + totalIncentives : 
          earnings[item.meta?.basedOn] || 0;
        value = (baseValue * item.valueNumber) / 100;
      }
      deductions[item.key] = value;
      totalDeductions += value;
    });

    // Calculate gross and net salary
    const grossSalary = totalEarnings + totalIncentives;
    const netSalary = grossSalary - totalDeductions;

    // Apply attendance factor
    const attendanceFactor = presentDays / workingDays;
    const finalNetSalary = netSalary * attendanceFactor;

    // Update user with calculated values
    await this.update({
      basicSalary: earnings.basic_salary || 0,
      hra: earnings.hra || 0,
      da: earnings.da || 0,
      specialAllowance: earnings.special_allowance || 0,
      conveyanceAllowance: earnings.conveyance || 0,
      medicalAllowance: earnings.medical || 0,
      telephoneAllowance: earnings.telephone || 0,
      otherAllowances: earnings.entertainment || 0,
      totalEarnings: totalEarnings,
      pfDeduction: deductions.pf || 0,
      esiDeduction: deductions.esi || 0,
      professionalTax: deductions.professional_tax || 0,
      tdsDeduction: deductions.tds || 0,
      otherDeductions: deductions.loan || 0,
      totalDeductions: totalDeductions,
      grossSalary: grossSalary,
      netSalary: finalNetSalary,
      salaryLastCalculated: new Date()
    });

    return {
      earnings,
      incentives,
      deductions,
      totalEarnings,
      totalIncentives,
      totalDeductions,
      grossSalary,
      netSalary,
      attendanceFactor,
      finalNetSalary,
      workingDays,
      presentDays
    };
  };

  return User;
};
