const { sequelize, SalaryTemplate } = require('./src/models');

async function addSalaryTemplates() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    const templates = [
      {
        name: 'Basic Staff Template',
        code: 'BASIC_STAFF',
        payableDaysMode: 'calendar_month',
        weeklyOffs: JSON.stringify(['sunday']),
        hoursPerDay: 8,
        earnings: JSON.stringify([
          { key: 'basic_salary', label: 'Basic Salary', type: 'fixed', valueNumber: 15000 },
          { key: 'hra', label: 'House Rent Allowance', type: 'percent', valueNumber: 40, meta: { basedOn: 'basic_salary' } },
          { key: 'da', label: 'Dearness Allowance', type: 'percent', valueNumber: 20, meta: { basedOn: 'basic_salary' } },
          { key: 'conveyance', label: 'Conveyance Allowance', type: 'fixed', valueNumber: 800 },
          { key: 'medical', label: 'Medical Allowance', type: 'fixed', valueNumber: 500 }
        ]),
        incentives: JSON.stringify([
          { key: 'attendance_bonus', label: 'Attendance Bonus', type: 'fixed', valueNumber: 500 },
          { key: 'performance_bonus', label: 'Performance Bonus', type: 'fixed', valueNumber: 1000 },
          { key: 'overtime', label: 'Overtime', type: 'fixed', valueNumber: 0 }
        ]),
        deductions: JSON.stringify([
          { key: 'pf', label: 'Provident Fund', type: 'percent', valueNumber: 12, meta: { basedOn: 'basic_salary' } },
          { key: 'esi', label: 'ESI', type: 'percent', valueNumber: 1.75, meta: { basedOn: 'gross_salary' } },
          { key: 'professional_tax', label: 'Professional Tax', type: 'fixed', valueNumber: 200 },
          { key: 'tds', label: 'TDS', type: 'percent', valueNumber: 5, meta: { basedOn: 'gross_salary' } }
        ]),
        metadata: JSON.stringify({
          currency: 'INR',
          rounding: 'nearest',
          notes: 'Basic template for staff members'
        }),
        active: true
      },
      {
        name: 'Senior Staff Template',
        code: 'SENIOR_STAFF',
        payableDaysMode: 'calendar_month',
        weeklyOffs: JSON.stringify(['sunday']),
        hoursPerDay: 8,
        earnings: JSON.stringify([
          { key: 'basic_salary', label: 'Basic Salary', type: 'fixed', valueNumber: 25000 },
          { key: 'hra', label: 'House Rent Allowance', type: 'percent', valueNumber: 40, meta: { basedOn: 'basic_salary' } },
          { key: 'da', label: 'Dearness Allowance', type: 'percent', valueNumber: 25, meta: { basedOn: 'basic_salary' } },
          { key: 'special_allowance', label: 'Special Allowance', type: 'fixed', valueNumber: 5000 },
          { key: 'conveyance', label: 'Conveyance Allowance', type: 'fixed', valueNumber: 1600 },
          { key: 'medical', label: 'Medical Allowance', type: 'fixed', valueNumber: 1000 },
          { key: 'telephone', label: 'Telephone Allowance', type: 'fixed', valueNumber: 500 }
        ]),
        incentives: JSON.stringify([
          { key: 'attendance_bonus', label: 'Attendance Bonus', type: 'fixed', valueNumber: 1000 },
          { key: 'performance_bonus', label: 'Performance Bonus', type: 'fixed', valueNumber: 2000 },
          { key: 'experience_bonus', label: 'Experience Bonus', type: 'fixed', valueNumber: 1500 },
          { key: 'project_bonus', label: 'Project Bonus', type: 'fixed', valueNumber: 1000 },
          { key: 'overtime', label: 'Overtime', type: 'fixed', valueNumber: 0 }
        ]),
        deductions: JSON.stringify([
          { key: 'pf', label: 'Provident Fund', type: 'percent', valueNumber: 12, meta: { basedOn: 'basic_salary' } },
          { key: 'esi', label: 'ESI', type: 'percent', valueNumber: 1.75, meta: { basedOn: 'gross_salary' } },
          { key: 'professional_tax', label: 'Professional Tax', type: 'fixed', valueNumber: 400 },
          { key: 'tds', label: 'Income Tax (TDS)', type: 'percent', valueNumber: 10, meta: { basedOn: 'gross_salary' } },
          { key: 'insurance', label: 'Insurance', type: 'fixed', valueNumber: 800 }
        ]),
        metadata: JSON.stringify({
          currency: 'INR',
          rounding: 'nearest',
          notes: 'Template for senior staff with higher compensation'
        }),
        active: true
      },
      {
        name: 'Manager Template',
        code: 'MANAGER',
        payableDaysMode: 'calendar_month',
        weeklyOffs: JSON.stringify(['sunday']),
        hoursPerDay: 8,
        earnings: JSON.stringify([
          { key: 'basic_salary', label: 'Basic Salary', type: 'fixed', valueNumber: 40000 },
          { key: 'hra', label: 'House Rent Allowance', type: 'percent', valueNumber: 40, meta: { basedOn: 'basic_salary' } },
          { key: 'da', label: 'Dearness Allowance', type: 'percent', valueNumber: 30, meta: { basedOn: 'basic_salary' } },
          { key: 'special_allowance', label: 'Special Allowance', type: 'fixed', valueNumber: 10000 },
          { key: 'travel_allowance', label: 'Travel Allowance', type: 'fixed', valueNumber: 5000 },
          { key: 'conveyance', label: 'Conveyance Allowance', type: 'fixed', valueNumber: 2400 },
          { key: 'medical', label: 'Medical Allowance', type: 'fixed', valueNumber: 2000 },
          { key: 'telephone', label: 'Telephone Allowance', type: 'fixed', valueNumber: 1000 },
          { key: 'entertainment', label: 'Entertainment Allowance', type: 'fixed', valueNumber: 1500 },
          { key: 'driver', label: 'Driver Allowance', type: 'fixed', valueNumber: 3000 }
        ]),
        incentives: JSON.stringify([
          { key: 'attendance_bonus', label: 'Attendance Bonus', type: 'fixed', valueNumber: 2000 },
          { key: 'performance_bonus', label: 'Performance Bonus', type: 'fixed', valueNumber: 5000 },
          { key: 'experience_bonus', label: 'Experience Bonus', type: 'fixed', valueNumber: 3000 },
          { key: 'management_bonus', label: 'Management Bonus', type: 'fixed', valueNumber: 4000 },
          { key: 'project_bonus', label: 'Project Bonus', type: 'fixed', valueNumber: 2000 },
          { key: 'overtime', label: 'Overtime', type: 'fixed', valueNumber: 0 }
        ]),
        deductions: JSON.stringify([
          { key: 'pf', label: 'Provident Fund', type: 'percent', valueNumber: 12, meta: { basedOn: 'basic_salary' } },
          { key: 'esi', label: 'ESI', type: 'percent', valueNumber: 1.75, meta: { basedOn: 'gross_salary' } },
          { key: 'professional_tax', label: 'Professional Tax', type: 'fixed', valueNumber: 800 },
          { key: 'tds', label: 'Income Tax (TDS)', type: 'percent', valueNumber: 15, meta: { basedOn: 'gross_salary' } },
          { key: 'insurance', label: 'Insurance', type: 'fixed', valueNumber: 2000 },
          { key: 'loan', label: 'Loan Deduction', type: 'fixed', valueNumber: 0 }
        ]),
        metadata: JSON.stringify({
          currency: 'INR',
          rounding: 'nearest',
          notes: 'Template for managers with comprehensive benefits'
        }),
        active: true
      },
      {
        name: 'Executive Template',
        code: 'EXECUTIVE',
        payableDaysMode: 'calendar_month',
        weeklyOffs: JSON.stringify(['sunday']),
        hoursPerDay: 8,
        earnings: JSON.stringify([
          { key: 'basic_salary', label: 'Basic Salary', type: 'fixed', valueNumber: 60000 },
          { key: 'hra', label: 'House Rent Allowance', type: 'percent', valueNumber: 40, meta: { basedOn: 'basic_salary' } },
          { key: 'da', label: 'Dearness Allowance', type: 'percent', valueNumber: 35, meta: { basedOn: 'basic_salary' } },
          { key: 'special_allowance', label: 'Special Allowance', type: 'fixed', valueNumber: 15000 },
          { key: 'travel_allowance', label: 'Travel Allowance', type: 'fixed', valueNumber: 8000 },
          { key: 'conveyance', label: 'Conveyance Allowance', type: 'fixed', valueNumber: 3200 },
          { key: 'medical', label: 'Medical Allowance', type: 'fixed', valueNumber: 3000 },
          { key: 'telephone', label: 'Telephone Allowance', type: 'fixed', valueNumber: 2000 },
          { key: 'entertainment', label: 'Entertainment Allowance', type: 'fixed', valueNumber: 2500 },
          { key: 'driver', label: 'Driver Allowance', type: 'fixed', valueNumber: 5000 },
          { key: 'car', label: 'Car Allowance', type: 'fixed', valueNumber: 8000 }
        ]),
        incentives: JSON.stringify([
          { key: 'attendance_bonus', label: 'Attendance Bonus', type: 'fixed', valueNumber: 3000 },
          { key: 'performance_bonus', label: 'Performance Bonus', type: 'fixed', valueNumber: 8000 },
          { key: 'experience_bonus', label: 'Experience Bonus', type: 'fixed', valueNumber: 5000 },
          { key: 'management_bonus', label: 'Management Bonus', type: 'fixed', valueNumber: 6000 },
          { key: 'project_bonus', label: 'Project Bonus', type: 'fixed', valueNumber: 3000 },
          { key: 'overtime', label: 'Overtime', type: 'fixed', valueNumber: 0 }
        ]),
        deductions: JSON.stringify([
          { key: 'pf', label: 'Provident Fund', type: 'percent', valueNumber: 12, meta: { basedOn: 'basic_salary' } },
          { key: 'esi', label: 'ESI', type: 'percent', valueNumber: 1.75, meta: { basedOn: 'gross_salary' } },
          { key: 'professional_tax', label: 'Professional Tax', type: 'fixed', valueNumber: 1200 },
          { key: 'tds', label: 'Income Tax (TDS)', type: 'percent', valueNumber: 20, meta: { basedOn: 'gross_salary' } },
          { key: 'insurance', label: 'Insurance', type: 'fixed', valueNumber: 3000 },
          { key: 'loan', label: 'Loan Deduction', type: 'fixed', valueNumber: 0 }
        ]),
        metadata: JSON.stringify({
          currency: 'INR',
          rounding: 'nearest',
          notes: 'Template for executives with premium benefits'
        }),
        active: true
      }
    ];

    for (const template of templates) {
      try {
        await SalaryTemplate.create(template);
        console.log(`Created template: ${template.name}`);
      } catch (error) {
        console.error(`Error creating template ${template.name}:`, error.message);
      }
    }

    console.log('Salary templates added successfully!');
  } catch (error) {
    console.error('Error adding salary templates:', error);
  } finally {
    await sequelize.close();
  }
}

addSalaryTemplates();
