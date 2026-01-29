const { sequelize, User } = require('./src/models');

async function updateSampleUsersSalary() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Get all users with salary templates
    const users = await User.findAll({
      where: {
        role: 'staff',
        salaryTemplateId: { [sequelize.Sequelize.Op.ne]: null }
      }
    });

    console.log(`Found ${users.length} users with salary templates`);

    for (const user of users) {
      try {
        console.log(`Calculating salary for user: ${user.phone}`);
        
        await user.calculateSalaryFromTemplate({
          workingDays: 26,
          presentDays: 24
        });
        
        console.log(`✅ Updated salary for user: ${user.phone}`);
        console.log(`   Basic Salary: ₹${user.basicSalary}`);
        console.log(`   HRA: ₹${user.hra}`);
        console.log(`   DA: ₹${user.da}`);
        console.log(`   Gross Salary: ₹${user.grossSalary}`);
        console.log(`   Net Salary: ₹${user.netSalary}`);
        console.log('');
      } catch (error) {
        console.error(`❌ Error calculating salary for user ${user.phone}:`, error.message);
      }
    }

    console.log('Sample users salary update completed!');
  } catch (error) {
    console.error('Error updating sample users salary:', error);
  } finally {
    await sequelize.close();
  }
}

updateSampleUsersSalary();
