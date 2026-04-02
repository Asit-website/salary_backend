const { sequelize } = require('./src/models');

async function main() {
  try {
    console.log('--- MEGA SANJAY FIX STARTING ---');
    
    // 1. Find the User ID for Sanjay from staff_profiles (Case Insensitive)
    const [profiles] = await sequelize.query("SELECT * FROM staff_profiles WHERE LOWER(name) LIKE '%sanjay%' LIMIT 5");
    if (profiles.length === 0) {
      console.log('X Sanjay not found in staff_profiles');
      return;
    }

    console.log(`-> Found ${profiles.length} potential Sanjay records.`);
    
    for (const profile of profiles) {
      const userId = profile.userId || profile.user_id;
      const grossSalary = Number(profile.grossSalary || profile.gross_salary || 0);
      console.log(`   Processing: ${profile.name} (User ID: ${userId}, Gross: ₹${grossSalary})`);

      // 2. Find attendance records for this user for ANY date in 2026-04
      const [atts] = await sequelize.query(`SELECT * FROM attendances WHERE userId = ${userId}`);
      console.log(`   Found ${atts.length} attendance records total.`);

      for (const att of atts) {
        const attDateStr = String(att.date);
        if (attDateStr.includes('2026-04-01')) {
          console.log(`   [!] MATCH FOUND for today (ID: ${att.id})`);
          
          const breakSec = Number(att.breakTotalSeconds || att.break_total_seconds || 0);
          const breakMin = Math.floor(breakSec / 60);
          
          if (breakMin > 5) {
            const deduction = (grossSalary / 30);
            const excess = breakMin - 5;
            
            // Apply Update (Using existing column names found in DESCRIBE)
            await sequelize.query(`
              UPDATE attendances SET 
                breakDeductionAmount = ${deduction},
                excessBreakMinutes = ${excess},
                breakRuleId = (SELECT id FROM break_rules WHERE name LIKE '%break1%' LIMIT 1)
              WHERE id = ${att.id}
            `);
            console.log(`   ✅ SUCCESS: Applied ₹${deduction.toFixed(2)} penalty to Attendance ID ${att.id}`);
          } else {
            console.log(`   (i) Break was only ${breakMin} min, no deduction needed.`);
          }
        }
      }
    }
    
    console.log('--- MEGA FIX COMPLETED ---');
  } catch (err) {
    console.error('X MEGA FIX FAILED:', err.message);
  } finally {
    process.exit();
  }
}

main();
