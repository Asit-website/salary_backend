const { User } = require('../src/models');
const { sequelize } = require('../src/sequelize');

async function debug() {
  try {
    const allUsers = await User.findAll({ attributes: ['id', 'phone', 'role', 'permissions'] });
    console.log(`Total users: ${allUsers.length}`);
    
    allUsers.forEach(u => {
      if (u.permissions) {
        console.log(`User ID ${u.id} (${u.phone}): type of permissions: ${typeof u.permissions}`);
        console.log(`Raw permissions: ${JSON.stringify(u.permissions)}`);
        
        let p = u.permissions;
        if (typeof p === 'string') {
          try { p = JSON.parse(p); } catch(e) {}
        }
        
        console.log(`superadmin_access value: ${p.superadmin_access} (type: ${typeof p.superadmin_access})`);
      }
    });

    process.exit(0);
  } catch (e) {
    console.error('Debug failed:', e);
    process.exit(1);
  }
}

debug();
