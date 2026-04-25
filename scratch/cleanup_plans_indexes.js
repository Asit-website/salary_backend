const { sequelize } = require('../src/sequelize');

async function cleanupIndexes() {
  try {
    const [results] = await sequelize.query('SHOW INDEX FROM plans');
    const indexNames = results.map(r => r.Key_name);
    
    console.log('Current indexes:', indexNames);
    
    const toDrop = indexNames.filter(name => name.startsWith('code_') && name !== 'code');
    
    for (const name of toDrop) {
      console.log(`Dropping index ${name}...`);
      await sequelize.query(`ALTER TABLE plans DROP INDEX ${name}`);
    }
    
    console.log('Cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanupIndexes();
