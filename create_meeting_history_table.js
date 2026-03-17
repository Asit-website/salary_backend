const { sequelize } = require('./src/models');

async function createTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS meeting_histories (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        meeting_id BIGINT UNSIGNED NOT NULL,
        updated_by_id BIGINT UNSIGNED NOT NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        remarks TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX (meeting_id),
        INDEX (updated_by_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ meeting_histories table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

createTable();
