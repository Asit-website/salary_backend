const { sequelize } = require('./src/models');

async function run() {
    try {
        const [results] = await sequelize.query("SHOW COLUMNS FROM org_business_info LIKE 'sidebar_header_type'");
        if (results.length === 0) {
            console.log('Adding sidebar_header_type column...');
            await sequelize.query("ALTER TABLE org_business_info ADD COLUMN sidebar_header_type VARCHAR(20) NOT NULL DEFAULT 'name' AFTER logo_url");
            console.log('Column added successfully.');
        } else {
            console.log('Column already exists.');
        }
    } catch (e) {
        console.error('Error adding column:', e);
    } finally {
        await sequelize.close();
    }
}

run();
