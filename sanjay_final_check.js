const { sequelize } = require('./src/models');

async function main() {
  try {
    console.log('--- SANJAY FINAL DATABASE CHECK ---');
    
    // 1. Check Sanjay profile and user
    const [pResults] = await sequelize.query("SELECT * FROM staff_profiles WHERE name LIKE '%Sanjay%'");
    for (const p of pResults) {
      const [uResults] = await sequelize.query(`SELECT id, gross_salary FROM users WHERE id = ${p.user_id}`);
      console.log(`-> Profile: ${p.name}, UserID: ${p.user_id}, Gross: ${uResults[0]?.gross_salary}`);
      
      // 2. Check ALL attendance records for today for this userId
      const [atts] = await sequelize.query(`SELECT * FROM attendance WHERE user_id = ${p.user_id} AND date = '2026-04-01'`);
      console.log(`   Found ${atts.length} records today in singular 'attendance' table.`);
      for (const a of atts) {
         console.log(`   [!] ID: ${a.id}, BreakSec: ${a.break_total_seconds}, Ded: ${a.break_deduction_amount}, RuleID: ${a.break_rule_id}, Excess: ${a.excess_break_minutes}`);
      }
    }

  } catch (err) {
    console.error('X ERROR:', err.message);
  } finally {
    process.exit();
  }
}

main();
