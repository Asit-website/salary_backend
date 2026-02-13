-- ========================================
-- ASSETS MANAGEMENT SYSTEM SQL QUERIES
-- ========================================

-- 1. Create Assets Table
-- ========================================
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
  `condition` ENUM('excellent', 'good', 'fair', 'poor') NOT NULL DEFAULT 'good',
  `status` ENUM('available', 'in_use', 'maintenance', 'retired', 'lost') NOT NULL DEFAULT 'available',
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
  
  -- Indexes for performance
  INDEX idx_assets_orgId (orgId),
  INDEX idx_assets_category (category),
  INDEX idx_assets_status (`status`),
  INDEX idx_assets_assignedTo (assignedTo),
  INDEX idx_assets_serialNumber (serialNumber),
  INDEX idx_assets_createdAt (createdAt)
);

-- 2. Create Asset Assignments Table
-- ========================================
CREATE TABLE IF NOT EXISTS asset_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assetId BIGINT UNSIGNED NOT NULL,
  assignedTo BIGINT UNSIGNED NOT NULL,
  assignedBy BIGINT UNSIGNED NOT NULL,
  assignedDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  returnedDate DATETIME,
  `status` ENUM('active', 'returned') NOT NULL DEFAULT 'active',
  notes TEXT,
  conditionAtAssignment ENUM('excellent', 'good', 'fair', 'poor') NOT NULL,
  conditionAtReturn ENUM('excellent', 'good', 'fair', 'poor'),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_assignments_assetId (assetId),
  INDEX idx_assignments_assignedTo (assignedTo),
  INDEX idx_assignments_assignedBy (assignedBy),
  INDEX idx_assignments_status (`status`),
  INDEX idx_assignments_assignedDate (assignedDate),
  INDEX idx_assignments_createdAt (createdAt)
);

-- 3. Create Asset Maintenance Table
-- ========================================
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
  `status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  attachments JSON DEFAULT '[]',
  createdBy BIGINT UNSIGNED NOT NULL,
  updatedBy BIGINT UNSIGNED,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_maintenance_assetId (assetId),
  INDEX idx_maintenance_maintenanceType (maintenanceType),
  INDEX idx_maintenance_status (`status`),
  INDEX idx_maintenance_scheduledDate (scheduledDate),
  INDEX idx_maintenance_performedBy (performedBy),
  INDEX idx_maintenance_createdAt (createdAt)
);

-- ========================================
-- FOREIGN KEY CONSTRAINTS
-- ========================================

-- Assets table foreign keys
ALTER TABLE assets 
ADD CONSTRAINT fk_assets_assignedTo 
FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE assets 
ADD CONSTRAINT fk_assets_createdBy 
FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE assets 
ADD CONSTRAINT fk_assets_updatedBy 
FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Asset Assignments table foreign keys
ALTER TABLE asset_assignments 
ADD CONSTRAINT fk_assignments_assetId 
FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE asset_assignments 
ADD CONSTRAINT fk_assignments_assignedTo 
FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE asset_assignments 
ADD CONSTRAINT fk_assignments_assignedBy 
FOREIGN KEY (assignedBy) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Asset Maintenance table foreign keys
ALTER TABLE asset_maintenance 
ADD CONSTRAINT fk_maintenance_assetId 
FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE asset_maintenance 
ADD CONSTRAINT fk_maintenance_performedBy 
FOREIGN KEY (performedBy) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE asset_maintenance 
ADD CONSTRAINT fk_maintenance_createdBy 
FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE asset_maintenance 
ADD CONSTRAINT fk_maintenance_updatedBy 
FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ========================================
-- SAMPLE DATA INSERTS (Optional)
-- ========================================

-- Sample Asset Categories (if you want to pre-populate)
-- INSERT INTO assets (orgId, name, category, description, serialNumber, brand, model, purchaseDate, purchaseCost, currentValue, location, `condition`, `status`, createdBy, updatedBy) VALUES
-- (1, 'Laptop Dell XPS 15', 'laptop', 'High-performance laptop for developers', 'DXP15-2024-001', 'Dell', 'XPS 15', '2024-01-15', 1500.00, 1200.00, 'Office', 'excellent', 'available', 1, 1),
-- (1, 'Office Chair Ergonomic', 'furniture', 'Ergonomic office chair with lumbar support', 'CHAIR-ERG-001', 'Herman Miller', 'Aeron', '2024-01-10', 800.00, 750.00, 'Office', 'good', 'available', 1, 1),
-- (1, 'iPhone 14 Pro', 'mobile', 'Company mobile phone for sales team', 'IP14P-2024-001', 'Apple', 'iPhone 14 Pro', '2024-02-01', 999.00, 850.00, 'Mobile', 'excellent', 'in_use', 1, 1);

-- ========================================
-- USEFUL QUERIES FOR TESTING
-- ========================================

-- Check if tables exist
SELECT TABLE_NAME, TABLE_COMMENT 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME IN ('assets', 'asset_assignments', 'asset_maintenance');

-- View table structures
DESCRIBE assets;
DESCRIBE asset_assignments;
DESCRIBE asset_maintenance;

-- Count records in each table
SELECT 'assets' as table_name, COUNT(*) as record_count FROM assets
UNION ALL
SELECT 'asset_assignments', COUNT(*) FROM asset_assignments
UNION ALL
SELECT 'asset_maintenance', COUNT(*) FROM asset_maintenance;

-- View assets with assignments
SELECT 
  a.name,
  a.category,
  a.`status`,
  a.`condition`,
  u.name as assigned_user_name,
  aa.assignedDate,
  aa.`status` as assignment_status
FROM assets a
LEFT JOIN asset_assignments aa ON a.id = aa.assetId AND aa.`status` = 'active'
LEFT JOIN users u ON aa.assignedTo = u.id;

-- View maintenance schedule
SELECT 
  a.name,
  a.category,
  am.maintenanceType,
  am.scheduledDate,
  am.`status` as maintenance_status,
  am.cost,
  am.vendor
FROM assets a
LEFT JOIN asset_maintenance am ON a.id = am.assetId
WHERE am.`status` IN ('scheduled', 'in_progress')
ORDER BY am.scheduledDate;

-- Assets due for maintenance (next 30 days)
SELECT 
  a.name,
  a.category,
  a.nextMaintenanceDate,
  DATEDIFF(a.nextMaintenanceDate, CURDATE()) as days_until_maintenance
FROM assets a
WHERE a.nextMaintenanceDate IS NOT NULL 
  AND a.nextMaintenanceDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
  AND a.`status` != 'retired';
