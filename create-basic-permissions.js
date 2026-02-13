const { sequelize } = require('./src/models');
const Permission = require('./src/models/Permission')(sequelize);

async function createBasicPermissions() {
  try {
    console.log('Creating basic permissions...');
    
    const permissions = [
      { name: 'sales_access', displayName: 'Sales Access', description: 'Can access sales module' },
      { name: 'geolocation_access', displayName: 'Geolocation Access', description: 'Can use geolocation features' },
      { name: 'attendance_manage', displayName: 'Manage Attendance', description: 'Can manage attendance records' },
      { name: 'staff_manage', displayName: 'Manage Staff', description: 'Can manage staff members' },
      { name: 'reports_view', displayName: 'View Reports', description: 'Can view reports' },
      { name: 'payroll_access', displayName: 'Payroll Access', description: 'Can access payroll module' },
    ];

    for (const perm of permissions) {
      await sequelize.query(`
        INSERT IGNORE INTO permissions (name, displayName, description) 
        VALUES (:name, :displayName, :description)
      `, {
        replacements: perm
      });
    }

    console.log('✅ Basic permissions created successfully!');
    
    const allPerms = await sequelize.query('SELECT * FROM permissions ORDER BY name');
    console.log('\n📋 Available Permissions:');
    allPerms[0].forEach(p => {
      console.log(`- ${p.displayName}: ${p.description}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (sequelize && sequelize.close) {
      await sequelize.close();
    }
    process.exit(0);
  }
}

createBasicPermissions();
