const { sequelize, User, StaffProfile, SalaryTemplate } = require('./src/models');
const bcrypt = require('bcryptjs');

async function testStaffCreation() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Get the first salary template
    const template = await SalaryTemplate.findOne({ where: { code: 'BASIC_STAFF' } });
    if (!template) {
      console.log('No basic staff template found');
      return;
    }

    console.log('Testing staff creation with salary template:', template.name);

    // Create a new staff user with salary template
    const passwordHash = await bcrypt.hash('123456', 10);
    
    const staffUser = await User.create({
      role: 'staff',
      phone: '666666' + Date.now().toString().slice(-4),
      passwordHash: passwordHash,
      active: true,
      salaryTemplateId: template.id
    });

    console.log('✅ Created staff user:', staffUser.phone);

    // Create staff profile
    const staffProfile = await StaffProfile.create({
      userId: staffUser.id,
      staffId: 'TEST' + Date.now().toString().slice(-6),
      phone: staffUser.phone,
      name: 'Test User',
      email: 'test.user@company.com'
    });

    console.log('✅ Created staff profile:', staffProfile.staffId);

    // Calculate salary using the template
    await staffUser.calculateSalaryFromTemplate({
      workingDays: 26,
      presentDays: 25
    });

    console.log('✅ Salary calculated successfully!');
    console.log('   Basic Salary: ₹' + staffUser.basicSalary);
    console.log('   HRA: ₹' + staffUser.hra);
    console.log('   DA: ₹' + staffUser.da);
    console.log('   Gross Salary: ₹' + staffUser.grossSalary);
    console.log('   Net Salary: ₹' + staffUser.netSalary);

    // Test the API endpoint
    const staffWithSalary = await User.findOne({
      where: { id: staffUser.id },
      include: [
        { model: StaffProfile, as: 'profile' },
        { model: SalaryTemplate, as: 'salaryTemplate' }
      ]
    });

    console.log('\n📋 Staff Details with Salary:');
    console.log('   Name:', staffWithSalary.profile?.name);
    console.log('   Phone:', staffWithSalary.phone);
    console.log('   Template:', staffWithSalary.salaryTemplate?.name);
    console.log('   Net Salary:', staffWithSalary.netSalary);
    console.log('   Last Calculated:', staffWithSalary.salaryLastCalculated);

    console.log('\n🎉 Staff creation with salary template test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing staff creation:', error);
  } finally {
    await sequelize.close();
  }
}

testStaffCreation();
