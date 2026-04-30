const { SalaryTemplate } = require('../src/models');

async function check() {
  try {
    const templates = await SalaryTemplate.findAll({ limit: 5 });
    templates.forEach(t => {
      console.log(`Template Name: ${t.name}`);
      console.log(`Deductions: ${JSON.stringify(t.deductions, null, 2)}`);
      console.log('-------------------');
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
