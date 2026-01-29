const { sequelize, SalaryTemplate } = require('./src/models');

async function testSalaryCalculation() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Get the first salary template
    const template = await SalaryTemplate.findOne({ where: { code: 'BASIC_STAFF' } });
    if (!template) {
      console.log('No basic staff template found');
      return;
    }

    console.log('Testing salary calculation for:', template.name);

    // Mock attendance data
    const attendanceData = {
      workingDays: 26,
      presentDays: 24
    };

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
    const attendanceFactor = attendanceData.presentDays / attendanceData.workingDays;
    const finalNetSalary = netSalary * attendanceFactor;

    console.log('\n=== Salary Calculation Results ===');
    console.log('Template:', template.name);
    console.log('Working Days:', attendanceData.workingDays);
    console.log('Present Days:', attendanceData.presentDays);
    console.log('Attendance Factor:', attendanceFactor);
    
    console.log('\n--- Earnings ---');
    Object.entries(earnings).forEach(([key, value]) => {
      console.log(`${key}: ₹${value.toFixed(2)}`);
    });
    console.log('Total Earnings: ₹' + totalEarnings.toFixed(2));
    
    console.log('\n--- Incentives ---');
    Object.entries(incentives).forEach(([key, value]) => {
      console.log(`${key}: ₹${value.toFixed(2)}`);
    });
    console.log('Total Incentives: ₹' + totalIncentives.toFixed(2));
    
    console.log('\n--- Deductions ---');
    Object.entries(deductions).forEach(([key, value]) => {
      console.log(`${key}: ₹${value.toFixed(2)}`);
    });
    console.log('Total Deductions: ₹' + totalDeductions.toFixed(2));
    
    console.log('\n--- Summary ---');
    console.log('Gross Salary: ₹' + grossSalary.toFixed(2));
    console.log('Net Salary: ₹' + netSalary.toFixed(2));
    console.log('Final Net Salary (with attendance): ₹' + finalNetSalary.toFixed(2));

  } catch (error) {
    console.error('Error testing salary calculation:', error);
  } finally {
    await sequelize.close();
  }
}

testSalaryCalculation();
