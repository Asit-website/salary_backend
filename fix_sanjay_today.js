const { sequelize } = require('./src/models');

async function main() {
  try {
    // 1. Find Sanjay's ID and Org ID
    const [users] = await sequelize.query("SELECT id, name, org_account_id FROM users WHERE name LIKE '%Sanjay%' LIMIT 1");
    if (users.length === 0) {
      console.log('Sanjay not found');
      return;
    }
    const user = users[0];
    const userId = user.id;
    const orgId = user.org_account_id;
    console.log(`Found Sanjay: ID=${userId}, OrgID=${orgId}`);

    // 2. Find Sanjay's Gross Salary from staff_profiles
    const [profiles] = await sequelize.query(`SELECT gross_salary FROM staff_profiles WHERE user_id = ${userId} LIMIT 1`);
    const grossSalary = profiles.length > 0 ? Number(profiles[0].gross_salary || 0) : 0;
    console.log(`Gross Salary: ${grossSalary}`);

    // 3. Find today's attendance
    const today = '2026-04-01';
    const [atts] = await sequelize.query(`SELECT id, break_total_seconds FROM attendances WHERE user_id = ${userId} AND date = '${today}' LIMIT 1`);
    if (atts.length === 0) {
      console.log('Attendance not found for today');
      return;
    }
    const att = atts[0];
    const breakTotalSeconds = att.break_total_seconds || 0;
    const breakMinutes = Math.floor(breakTotalSeconds / 60);
    console.log(`Today's Attendance: ID=${att.id}, BreakSec=${breakTotalSeconds} (${breakMinutes} min)`);

    // 4. Calculate Penalty (break1 rule: Multiplier=1 if > 5 min)
    let penalty = 0;
    let excessMins = 0;
    if (breakMinutes > 5) {
      penalty = grossSalary / 30; // Assuming 30 days
      excessMins = breakMinutes - 5;
    }

    console.log(`Calculated Penalty: ${penalty.toFixed(2)}, Excess Mins: ${excessMins}`);

    // 5. Update Database directly
    await sequelize.query(`
      UPDATE attendances 
      SET break_deduction_amount = ${penalty}, 
          excess_break_minutes = ${excessMins},
          break_rule_id = (SELECT id FROM break_rules WHERE name LIKE '%break1%' LIMIT 1)
      WHERE id = ${att.id}
    `);

    console.log('Attendance updated successfully with raw query');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

main();
