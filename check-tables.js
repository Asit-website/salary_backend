const { sequelize } = require('./src/models');

async function checkTables() {
  try {
    const [results] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND TABLE_NAME LIKE 'asset%'
    `);
    
    console.log('Asset-related tables:');
    results.forEach(row => {
      console.log(`- ${row.TABLE_NAME}`);
    });
    
    if (results.length === 0) {
      console.log('No asset tables found. Running the SQL script...');
      
      // Run the SQL script to create tables
      const fs = require('fs');
      const sqlScript = fs.readFileSync('./assets-sql-queries.sql', 'utf8');
      
      // Split the script by semicolons and execute each statement
      const statements = sqlScript
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        try {
          await sequelize.query(statement);
          console.log('✅ Executed:', statement.substring(0, 50) + '...');
        } catch (error) {
          console.log('❌ Error:', error.message);
        }
      }
      
      console.log('Tables creation completed!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkTables();
