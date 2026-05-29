require('dotenv').config();
const { Sequelize } = require('sequelize');

const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'mysql',
  logging: false
});

async function main() {
  try {
    // Check column names related to lockout/failed attempts
    const [cols] = await s.query("SHOW COLUMNS FROM users");
    const lockCols = cols.filter(c => 
      c.Field.toLowerCase().includes('lock') || 
      c.Field.toLowerCase().includes('fail') ||
      c.Field.toLowerCase().includes('attempt')
    );
    console.log('Lockout related columns:', JSON.stringify(lockCols.map(c => c.Field)));

    // Try to reset lockout using actual column names
    if (lockCols.length > 0) {
      const setClauses = lockCols.map(c => {
        if (c.Field.toLowerCase().includes('lock') && c.Type.includes('datetime')) {
          return `\`${c.Field}\` = NULL`;
        }
        if (c.Field.toLowerCase().includes('fail') || c.Field.toLowerCase().includes('attempt')) {
          return `\`${c.Field}\` = 0`;
        }
        return null;
      }).filter(Boolean).join(', ');

      if (setClauses) {
        const [result] = await s.query(`UPDATE users SET ${setClauses} WHERE phone = '7488221503'`);
        console.log('Reset done, affected rows:', result.affectedRows);
      }
    }
  } catch(e) {
    console.log('Error:', e.message);
  } finally {
    await s.close();
  }
}

main();
