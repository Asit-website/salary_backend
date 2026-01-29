const { sequelize, SalaryTemplate } = require('./src/models');

async function checkTemplates() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    const templates = await SalaryTemplate.findAll();
    console.log('Existing templates:', templates.length);
    
    templates.forEach(template => {
      console.log(`- ${template.name} (${template.code})`);
    });

    // Try to create a simple template
    try {
      const simpleTemplate = await SalaryTemplate.create({
        name: 'Test Template',
        code: 'TEST',
        payableDaysMode: 'calendar_month',
        weeklyOffs: JSON.stringify(['sunday']),
        hoursPerDay: 8,
        earnings: JSON.stringify([]),
        incentives: JSON.stringify([]),
        deductions: JSON.stringify([]),
        metadata: JSON.stringify({}),
        active: true
      });
      console.log('Simple template created successfully!');
    } catch (error) {
      console.error('Error creating simple template:', error.message);
      console.error('Validation errors:', error.errors?.map(e => e.message));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkTemplates();
