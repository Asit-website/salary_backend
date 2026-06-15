const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, LeaveTemplate, LeaveTemplateCategory } = require('../src/models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    const template = await LeaveTemplate.findOne({
      where: { id: 5 },
      include: [{ model: LeaveTemplateCategory, as: 'categories' }]
    });

    if (!template) {
      console.log('Template not found.');
      return;
    }

    console.log('\n--- TEMPLATE 5 DETAILS ---');
    console.log(`Name: ${template.name}, Cycle: ${template.cycle}`);
    console.log('Categories:');
    for (const c of template.categories || []) {
      console.log(`  Key: ${c.key}, Name: ${c.name}, Count: ${c.leaveCount}, Carry Forward: ${c.carryForward}, Unused Rule: ${c.unusedRule}`);
    }

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await sequelize.close();
  }
}

run();
