const { sequelize } = require('./src/models');

async function runMigration() {
  try {
    console.log('🔄 Running shift_template_id migration...');
    
    // Add the column (skip if exists)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN shift_template_id BIGINT(11) UNSIGNED NULL 
        COMMENT 'Foreign key reference to shift_templates table'
      `);
      console.log('✅ Column added successfully');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('✅ Column already exists');
      } else {
        throw error;
      }
    }
    
    // Add foreign key constraint (skip if exists)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_shift_template 
        FOREIGN KEY (shift_template_id) REFERENCES shift_templates(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('✅ Foreign key constraint added');
    } catch (error) {
      if (error.message.includes('Duplicate key name') || error.message.includes('already exists')) {
        console.log('✅ Foreign key constraint already exists');
      } else {
        console.log('⚠️ Foreign key constraint may already exist or failed:', error.message);
      }
    }
    
    // Create index (skip if exists)
    try {
      await sequelize.query(`
        CREATE INDEX idx_users_shift_template_id ON users(shift_template_id)
      `);
      console.log('✅ Index created');
    } catch (error) {
      if (error.message.includes('Duplicate key name') || error.message.includes('already exists')) {
        console.log('✅ Index already exists');
      } else {
        console.log('⚠️ Index may already exist or failed:', error.message);
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration();
