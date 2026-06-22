const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'thinktech_attendance',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
  }
);

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Successfully connected to the database.');

    // 1. Get all tables and their row counts
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME, TABLE_ROWS 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = :dbName 
      ORDER BY TABLE_ROWS DESC
    `, {
      replacements: { dbName: process.env.DB_NAME || 'thinktech_attendance' }
    });

    console.log('\n--- Tables and Row Counts (Approximate) ---');
    tables.forEach(t => {
      console.log(`${t.TABLE_NAME}: ${t.TABLE_ROWS} rows`);
    });

    // 2. Find all foreign key columns that do not have an index
    console.log('\n--- Checking for missing indexes on common columns/foreign keys ---');
    
    const [columnsWithNoIndexes] = await sequelize.query(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME 
      FROM 
        INFORMATION_SCHEMA.COLUMNS 
      WHERE 
        TABLE_SCHEMA = :dbName 
        AND COLUMN_NAME LIKE '%_id' 
        AND COLUMN_NAME NOT IN ('id')
        AND (TABLE_NAME, COLUMN_NAME) NOT IN (
          SELECT TABLE_NAME, COLUMN_NAME 
          FROM INFORMATION_SCHEMA.STATISTICS 
          WHERE TABLE_SCHEMA = :dbName
        )
      ORDER BY TABLE_NAME, COLUMN_NAME;
    `, {
      replacements: { dbName: process.env.DB_NAME || 'thinktech_attendance' }
    });

    if (columnsWithNoIndexes.length === 0) {
      console.log('All _id columns have indexes.');
    } else {
      console.log('Found columns ending in _id that DO NOT have an index (Potential foreign keys without index):');
      columnsWithNoIndexes.forEach(c => {
        console.log(`- Table: ${c.TABLE_NAME}, Column: ${c.COLUMN_NAME}`);
      });
    }

    // 3. Find indexes on location_pings specifically
    console.log('\n--- Indexes on location_pings ---');
    const [lpIndexes] = await sequelize.query(`
      SHOW INDEX FROM location_pings
    `).catch(() => [[]]);
    if (lpIndexes.length === 0) {
      console.log('No indexes found or table location_pings does not exist.');
    } else {
      lpIndexes.forEach(idx => {
        console.log(`- Index Name: ${idx.Key_name}, Column: ${idx.Column_name}, Unique: ${!idx.Non_unique}`);
      });
    }

    // 4. Find indexes on attendance specifically
    console.log('\n--- Indexes on attendance ---');
    const [attIndexes] = await sequelize.query(`
      SHOW INDEX FROM attendance
    `).catch(() => [[]]);
    if (attIndexes.length === 0) {
      console.log('No indexes found or table attendance does not exist.');
    } else {
      attIndexes.forEach(idx => {
        console.log(`- Index Name: ${idx.Key_name}, Column: ${idx.Column_name}, Unique: ${!idx.Non_unique}`);
      });
    }

  } catch (error) {
    console.error('Error running DB audit:', error);
  } finally {
    await sequelize.close();
  }
}

run();
