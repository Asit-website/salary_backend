const { sequelize } = require('../src/sequelize');

async function debug() {
  try {
    const [allUsers] = await sequelize.query('SELECT id, phone, role, permissions, createdAt FROM users');
    
    console.log('Total users from Raw SQL:', allUsers.length);

    const staff = allUsers.filter(u => {
      let perms = u.permissions;
      let safety = 0;
      while (typeof perms === 'string' && safety < 5) {
        try {
          const parsed = JSON.parse(perms);
          if (parsed === perms) break;
          perms = parsed;
        } catch(e) { break; }
        safety++;
      }
      const hasAccess = perms && typeof perms === 'object' && perms.superadmin_access === true;
      if (hasAccess) console.log('Found staff:', u.id, u.phone);
      return hasAccess;
    });

    console.log('Filtered staff count:', staff.length);
    process.exit(0);
  } catch (e) {
    console.error('Debug failed:', e);
    process.exit(1);
  }
}

debug();
