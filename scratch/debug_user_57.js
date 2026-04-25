const { User } = require('../src/models');
const { sequelize } = require('../src/sequelize');

async function debug() {
  try {
    const user = await User.findByPk(57);
    if (!user) {
      console.log('User 57 not found');
      return;
    }
    
    console.log('User ID:', user.id);
    console.log('Role:', user.role);
    console.log('Permissions (raw):', user.permissions);
    console.log('Permissions type:', typeof user.permissions);
    
    let p = user.permissions;
    if (typeof p === 'string') {
      try {
        const p2 = JSON.parse(p);
        console.log('Parsed Permissions:', p2);
        console.log('superadmin_access:', p2.superadmin_access);
        console.log('type of superadmin_access:', typeof p2.superadmin_access);
      } catch (e) {
        console.error('Failed to parse permissions string');
      }
    } else if (p && typeof p === 'object') {
       console.log('superadmin_access:', p.superadmin_access);
    }

    process.exit(0);
  } catch (e) {
    console.error('Debug failed:', e);
    process.exit(1);
  }
}

debug();
