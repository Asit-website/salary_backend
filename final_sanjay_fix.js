const { sequelize } = require('./src/models');

async function main() {
  try {
    // 1. Get Sanjay ID safely
    const [uResults] = await sequelize.query("SELECT id, name FROM users WHERE name LIKE '%Sanjay%' LIMIT 1");
    if (uResults.length === 0) { console.log('Sanjay not found'); return; }
    const userId = uResults[0].id;
    console.log(`User ID: ${userId}, Name: ${uResults[0].name}`);

    // 2. Get Gross Salary safely
    const [pResults] = await sequelize.query(`SELECT gross_salary FROM staff_profiles WHERE user_id = ${userId} LIMIT 1`);
    const grossSalary = pResults.length > 0 ? Number(pResults[0].gross_salary || 0) : 0;
    console.log(`Gross Salary: ${grossSalary}`);

    // 3. Find today's attendance record
    const [aResults] = await sequelize.query(`SELECT id, break_total_seconds FROM attendances WHERE user_id = ${userId} AND date = '2026-04-01' LIMIT 1`);
    if (aResults.length === 0) { console.log('Attendance not found for today'); return; }
    const attendanceId = aResults[0].id;
    const breakMinutes = Math.floor((aResults[0].break_total_seconds || 0) / 60);
    console.log(`Attendance ID: ${attendanceId}, Break: ${breakMinutes} min`);

    // 4. Calculate deduction (break1 rule: Multiplier=1 if > 5m)
    let deduction = 0;
    let excessMins = 0;
    if (breakMinutes > 5) {
      deduction = (grossSalary / 30) * 1; // Multiplier 1
      excessMins = breakMinutes - 5;
    }
    console.log(`Final Deduction: ${deduction.toFixed(2)}, Excess: ${excessMins}`);

    // 5. Update attendance directly
    const [rResults] = await sequelize.query("SELECT id FROM break_rules WHERE name LIKE '%break1%' LIMIT 1");
    const ruleId = rResults.length > 0 ? rResults[0].id : null;

    await sequelize.query(`
      UPDATE attendances 
      SET break_deduction_amount = ${deduction}, 
          excess_break_minutes = ${excessMins},
          break_rule_id = ${ruleId || 'NULL'}
      WHERE id = ${attendanceId}
    `);

    console.log('Successfully updated Sanjay\'s attendance today!');
  } catch (err) {
    console.error('SQL Error:', err);
  } finally {
    process.exit();
  }
}

main();
