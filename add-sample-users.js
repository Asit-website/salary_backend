const { sequelize, User, StaffProfile, SalaryTemplate } = require('./src/models');
const bcrypt = require('bcryptjs');

async function addSampleUsers() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Get salary templates
    const templates = await SalaryTemplate.findAll();
    console.log(`Found ${templates.length} salary templates`);

    // Create sample users
    const users = [
      {
        role: 'staff',
        phone: '9876543210',
        passwordHash: await bcrypt.hash('123456', 10),
        salaryTemplateId: 1, // Basic Staff Template
        active: true
      },
      {
        role: 'staff',
        phone: '9876543211',
        passwordHash: await bcrypt.hash('123456', 10),
        salaryTemplateId: 2, // Senior Staff Template
        active: true
      },
      {
        role: 'staff',
        phone: '9876543212',
        passwordHash: await bcrypt.hash('123456', 10),
        salaryTemplateId: 3, // Manager Template
        active: true
      },
      {
        role: 'staff',
        phone: '9876543213',
        passwordHash: await bcrypt.hash('123456', 10),
        salaryTemplateId: 4, // Executive Template
        active: true
      }
    ];

    for (const userData of users) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ where: { phone: userData.phone } });
        if (existingUser) {
          console.log(`User with phone ${userData.phone} already exists`);
          continue;
        }

        const user = await User.create(userData);
        console.log(`Created user: ${userData.phone}`);

        // Create staff profile
        const staffProfile = await StaffProfile.create({
          userId: user.id,
          staffId: `STAFF${String(user.id).padStart(3, '0')}`,
          phone: userData.phone,
          name: `User ${userData.phone.slice(-4)}`,
          email: `user${userData.phone.slice(-4)}@company.com`
        });
        console.log(`Created staff profile: ${staffProfile.staffId}`);

      } catch (error) {
        console.error(`Error creating user ${userData.phone}:`, error.message);
      }
    }

    console.log('Sample users added successfully!');
  } catch (error) {
    console.error('Error adding sample users:', error);
  } finally {
    await sequelize.close();
  }
}

addSampleUsers();
