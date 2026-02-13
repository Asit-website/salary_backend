const { sequelize } = require('./src/models');

async function fixMigration() {
  try {
    // Check if loans table exists
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'loans'
    `);
    
    if (results[0].count > 0) {
      console.log('Loans table exists, marking migration as completed...');
      
      // Insert the migration record
      await sequelize.query(`
        INSERT IGNORE INTO SequelizeMeta (name) VALUES ('20260121123000-create-loans.js')
      `);
      
      console.log('Migration marked as completed');
    } else {
      console.log('Loans table does not exist');
    }
    
    // Now run the assets migrations
    console.log('Running assets migrations...');
    
    // Create assets table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        orgId BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        serialNumber VARCHAR(100) UNIQUE,
        model VARCHAR(100),
        brand VARCHAR(100),
        purchaseDate DATE,
        purchaseCost DECIMAL(10,2),
        currentValue DECIMAL(10,2),
        location VARCHAR(255),
        \`condition\` ENUM('excellent', 'good', 'fair', 'poor') NOT NULL DEFAULT 'good',
        \`status\` ENUM('available', 'in_use', 'maintenance', 'retired', 'lost') NOT NULL DEFAULT 'available',
        assignedTo BIGINT UNSIGNED,
        assignedDate DATETIME,
        warrantyExpiry DATE,
        lastMaintenanceDate DATE,
        nextMaintenanceDate DATE,
        notes TEXT,
        attachments JSON DEFAULT '[]',
        createdBy BIGINT UNSIGNED NOT NULL,
        updatedBy BIGINT UNSIGNED,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_assets_orgId (orgId),
        INDEX idx_assets_category (category),
        INDEX idx_assets_status (\`status\`),
        INDEX idx_assets_assignedTo (assignedTo),
        INDEX idx_assets_serialNumber (serialNumber),
        INDEX idx_assets_createdAt (createdAt)
      )
    `);
    
    // Create asset_assignments table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_assignments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        assetId BIGINT UNSIGNED NOT NULL,
        assignedTo BIGINT UNSIGNED NOT NULL,
        assignedBy BIGINT UNSIGNED NOT NULL,
        assignedDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        returnedDate DATETIME,
        \`status\` ENUM('active', 'returned') NOT NULL DEFAULT 'active',
        notes TEXT,
        conditionAtAssignment ENUM('excellent', 'good', 'fair', 'poor') NOT NULL,
        conditionAtReturn ENUM('excellent', 'good', 'fair', 'poor'),
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_assignments_assetId (assetId),
        INDEX idx_assignments_assignedTo (assignedTo),
        INDEX idx_assignments_assignedBy (assignedBy),
        INDEX idx_assignments_status (\`status\`),
        INDEX idx_assignments_assignedDate (assignedDate),
        INDEX idx_assignments_createdAt (createdAt)
      )
    `);
    
    // Create asset_maintenance table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_maintenance (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        assetId BIGINT UNSIGNED NOT NULL,
        maintenanceType ENUM('preventive', 'corrective', 'emergency') NOT NULL,
        description TEXT NOT NULL,
        scheduledDate DATE NOT NULL,
        completedDate DATE,
        cost DECIMAL(10,2),
        vendor VARCHAR(255),
        performedBy BIGINT UNSIGNED,
        \`status\` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
        notes TEXT,
        attachments JSON DEFAULT '[]',
        createdBy BIGINT UNSIGNED NOT NULL,
        updatedBy BIGINT UNSIGNED,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_maintenance_assetId (assetId),
        INDEX idx_maintenance_maintenanceType (maintenanceType),
        INDEX idx_maintenance_status (\`status\`),
        INDEX idx_maintenance_scheduledDate (scheduledDate),
        INDEX idx_maintenance_performedBy (performedBy),
        INDEX idx_maintenance_createdAt (createdAt)
      )
    `);
    
    // Add foreign key constraints
    try {
      await sequelize.query(`
        ALTER TABLE assets 
        ADD CONSTRAINT fk_assets_assignedTo 
        FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      `);
    } catch (e) {
      console.log('Foreign key for assets.assignedTo may already exist');
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE assets 
        ADD CONSTRAINT fk_assets_createdBy 
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
      `);
    } catch (e) {
      console.log('Foreign key for assets.createdBy may already exist');
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE assets 
        ADD CONSTRAINT fk_assets_updatedBy 
        FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      `);
    } catch (e) {
      console.log('Foreign key for assets.updatedBy may already exist');
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE asset_assignments 
        ADD CONSTRAINT fk_assignments_assetId 
        FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE ON UPDATE CASCADE
      `);
    } catch (e) {
      console.log('Foreign key for asset_assignments.assetId may already exist');
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE asset_assignments 
        ADD CONSTRAINT fk_assignments_assignedTo 
        FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
      `);
    } catch (e) {
      console.log('Foreign key for asset_assignments.assignedTo may already exist');
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE asset_assignments 
        ADD CONSTRAINT fk_assignments_assignedBy 
        FOREIGN KEY (assignedBy) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
      `);
    } catch (e) {
      console.log('Foreign key for asset_assignments.assignedBy may already exist');
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE asset_maintenance 
        ADD CONSTRAINT fk_maintenance_assetId 
        FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE ON UPDATE CASCADE
      `);
    } catch (e) {
      console.log('Foreign key for asset_maintenance.assetId may already exist');
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE asset_maintenance 
        ADD CONSTRAINT fk_maintenance_performedBy 
        FOREIGN KEY (performedBy) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      `);
    } catch (e) {
      console.log('Foreign key for asset_maintenance.performedBy may already exist');
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE asset_maintenance 
        ADD CONSTRAINT fk_maintenance_createdBy 
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
      `);
    } catch (e) {
      console.log('Foreign key for asset_maintenance.createdBy may already exist');
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE asset_maintenance 
        ADD CONSTRAINT fk_maintenance_updatedBy 
        FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      `);
    } catch (e) {
      console.log('Foreign key for asset_maintenance.updatedBy may already exist');
    }
    
    console.log('Assets tables created successfully!');
    
    // Mark the new migrations as completed
    await sequelize.query(`
      INSERT IGNORE INTO SequelizeMeta (name) VALUES 
      ('20260211060000-create-assets.js'),
      ('20260211061000-create-asset-assignments.js'),
      ('20260211062000-create-asset-maintenance.js')
    `);
    
    console.log('Asset migrations marked as completed');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixMigration();
