const { sequelize } = require('./src/sequelize');
const { DataTypes } = require('sequelize');

async function run() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS activity_histories (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        activity_id BIGINT UNSIGNED NOT NULL,
        updated_by_id BIGINT UNSIGNED NOT NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        remarks TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ activity_histories table created');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating table:', err);
    process.exit(1);
  }
}

run();
