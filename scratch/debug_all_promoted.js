const { User } = require('../src/models');
const { sequelize } = require('../src/sequelize');

async function debug() {
  try {
    const allUsers = await User.findAll();
    const promoted = allUsers.filter(u => {
      let p = u.permissions;
      if (typeof p === 'string') {
        try { p = JSON.parse(p); } catch(e) {}
      }
      return p && p.superadmin_access === true;
    });
    
    console.log(`Total users with superadmin_access: ${promoted.length}`);
    promoted.forEach(u => {
       console.log(`ID: ${u.id}, Phone: ${u.phone}, Role: ${u.role}, Permissions: ${JSON.stringify(u.permissions)}`);
    });

    process.exit(0);
  } catch (e) {
    console.error('Debug failed:', e);
    process.exit(1);
  }
}

debug();
