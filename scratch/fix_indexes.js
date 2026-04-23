const { sequelize } = require('../src/sequelize');

async function fix() {
  try {
    const [results] = await sequelize.query("SHOW INDEX FROM plans WHERE Column_name = 'code'");
    console.log(`Found ${results.length} indexes on column 'code'`);
    
    // Drop all but one index if possible, or just drop the extras
    for (let i = 1; i < results.length; i++) {
      const indexName = results[i].Key_name;
      console.log(`Dropping index: ${indexName}`);
      await sequelize.query(`ALTER TABLE plans DROP INDEX ${indexName}`);
    }
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

fix();
