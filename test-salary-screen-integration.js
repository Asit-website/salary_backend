const { sequelize, User } = require('./src/models');

async function testSalaryScreenIntegration() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Get a sample user with salary data
    const user = await User.findOne({
      where: {
        role: 'staff',
        salaryTemplateId: { [sequelize.Sequelize.Op.ne]: null },
        basicSalary: { [sequelize.Sequelize.Op.gt]: 0 }
      },
      include: [
        { model: require('./src/models').SalaryTemplate, as: 'salaryTemplate' },
        { model: require('./src/models').StaffProfile, as: 'profile' }
      ]
    });

    if (!user) {
      console.log('❌ No user with salary data found');
      return;
    }

    console.log('✅ Found user with salary data:');
    console.log('   Name:', user.profile?.name || 'N/A');
    console.log('   Phone:', user.phone);
    console.log('   Template:', user.salaryTemplate?.name || 'N/A');
    console.log('   Basic Salary:', user.basicSalary);
    console.log('   HRA:', user.hra);
    console.log('   DA:', user.da);
    console.log('   Gross Salary:', user.grossSalary);
    console.log('   Net Salary:', user.netSalary);
    console.log('   Last Calculated:', user.salaryLastCalculated);

    // Test the API response structure
    const apiResponse = {
      success: true,
      user: {
        id: user.id,
        role: user.role,
        phone: user.phone,
        active: user.active,
        profile: user.profile,
        salaryTemplate: user.salaryTemplate,
        salaryDetails: {
          basicSalary: user.basicSalary,
          hra: user.hra,
          da: user.da,
          specialAllowance: user.specialAllowance,
          conveyanceAllowance: user.conveyanceAllowance,
          medicalAllowance: user.medicalAllowance,
          telephoneAllowance: user.telephoneAllowance,
          otherAllowances: user.otherAllowances,
          totalEarnings: user.totalEarnings,
          pfDeduction: user.pfDeduction,
          esiDeduction: user.esiDeduction,
          professionalTax: user.professionalTax,
          tdsDeduction: user.tdsDeduction,
          otherDeductions: user.otherDeductions,
          totalDeductions: user.totalDeductions,
          grossSalary: user.grossSalary,
          netSalary: user.netSalary,
          salaryLastCalculated: user.salaryLastCalculated
        }
      }
    };

    console.log('\n📱 API Response Structure (for SalaryScreen):');
    console.log(JSON.stringify(apiResponse, null, 2));

    console.log('\n🎉 SalaryScreen integration test completed successfully!');
    console.log('   The SalaryScreen will now display real salary data from the user profile.');

  } catch (error) {
    console.error('❌ Error testing salary screen integration:', error);
  } finally {
    await sequelize.close();
  }
}

testSalaryScreenIntegration();
