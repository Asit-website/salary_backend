const { sequelize } = require('./src/models');

async function createRoleTables() {
  try {
    console.log('Creating role and permission tables...');
    
    // Create permissions table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        displayName VARCHAR(100) NOT NULL,
        description TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create roles table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        displayName VARCHAR(100) NOT NULL,
        description TEXT,
        org_account_id BIGINT UNSIGNED,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_role_name (name, org_account_id)
      )
    `);
    
    // Create role_permissions table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        role_id BIGINT UNSIGNED NOT NULL,
        permission_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_role_permission (role_id, permission_id)
      )
    `);
    
    // Create user_roles table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        role_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_role (user_id, role_id)
      )
    `);
    
    console.log('✅ Role and permission tables created successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (sequelize && sequelize.close) {
      await sequelize.close();
    }
    process.exit(0);
  }
}

createRoleTables();
