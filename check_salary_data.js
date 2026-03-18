const { User, StaffSalaryAssignment, SalaryTemplate } = require('./src/models');

async function check() {
  try {
    const users = await User.findAll({
      where: { role: 'staff', active: true },
      include: [
        {
          model: StaffSalaryAssignment,
          as: 'salaryAssignments',
          include: [{ model: SalaryTemplate, as: 'template' }]
        }
      ]
    });

    console.log(`Found ${users.length} active staff users.`);
    users.forEach(u => {
      console.log(`User: ${u.phone} (ID: ${u.id})`);
      const asgs = u.salaryAssignments || [];
      console.log(` - Assignments: ${asgs.length}`);
      asgs.forEach(a => {
        console.log(`   - Effective: ${a.effectiveFrom} to ${a.effectiveTo || 'Present'}`);
        console.log(`   - Template: ${a.template?.name || 'None'}`);
        console.log(`   - Earnings: ${JSON.stringify(a.template?.earnings)}`);
      });
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
