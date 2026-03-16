const { sequelize } = require('./src/models');

async function migrate() {
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS ticket_histories (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              ticket_id BIGINT UNSIGNED NOT NULL,
              updated_by_id BIGINT UNSIGNED NOT NULL,
              old_status VARCHAR(50),
              new_status VARCHAR(50) NOT NULL,
              remarks TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
              FOREIGN KEY (updated_by_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log("Migration successful");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}

migrate();
