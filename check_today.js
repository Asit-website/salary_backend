const { sequelize } = require('./src/models');

async function main() {
  try {
    console.log('--- TODAY ATTENDANCE (2026-04-01) ---');
    
    const [results] = await sequelize.query(`
      SELECT 
        a.id as attId, 
        a.userId, 
        a.date, 
        a.breakTotalSeconds,
        p.name,
        p.gross_salary
      FROM attendances a
      JOIN staff_profiles p ON a.userId = p.user_id
      WHERE a.date = '2026-04-01'
    `);

    console.log(`-> Found ${results.length} present employees today.`);
    
    for (const r of results) {
      console.log(`   [!] ${r.name} (ID: ${r.userId}): Break ${r.breakTotalSeconds}s, Gross: ${r.gross_salary}`);
      if (r.name.toLowerCase().includes('sanjay')) {
        console.log(`      ✅ FOUND SANJAY!`);
      }
    }

  } catch (err) {
    console.error('X Error:', err.message);
  } finally {
    process.exit();
  }
}

main();
