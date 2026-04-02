const { sequelize } = require('./src/models');

async function main() {
  try {
    console.log('--- GLOBAL SANJAY SEARCH ---');
    
    // 1. Search staff_profiles for ANY Sanjay
    const [profiles] = await sequelize.query("SELECT userId, user_id, name, gross_salary FROM staff_profiles WHERE name LIKE '%Sanjay%'");
    if (profiles.length === 0) {
      console.log('X No Sanjay found in staff_profiles');
    } else {
      for (const p of profiles) {
        const uid = p.userId || p.user_id;
        console.log(`-> Profile Found: ${p.name}, UserID: ${uid}, Gross: ${p.gross_salary}`);
        
        // Find attendance for this user for April
        const [atts] = await sequelize.query(`SELECT id, date, breakTotalSeconds, break_total_seconds FROM attendances WHERE userId = ${uid} OR user_id = ${uid}`);
        console.log(`   Found ${atts.length} attendance records total for this user.`);
        for (const a of atts) {
          if (a.date && a.date.includes('2026-04')) {
             console.log(`   [!] April Record: ID=${a.id}, Date=${a.date}, BreakSec=${a.breakTotalSeconds || a.break_total_seconds}`);
          }
        }
      }
    }

    // 2. Search users table for ANY name (if it exists)
    try {
      const [users] = await sequelize.query("SELECT id, name FROM users WHERE name LIKE '%Sanjay%'");
      console.log(`-> Users with Sanjay in name (if column exists): ${users.length}`);
    } catch (e) {}

  } catch (err) {
    console.error('X Search Error:', err.message);
  } finally {
    process.exit();
  }
}

main();
