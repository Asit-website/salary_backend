const { sequelize } = require('./src/models');

async function main() {
  try {
    console.log('--- FORCE SYNC SANJAY (ID 32) ---');
    
    // We know: 
    // - Gross: 20000 -> Daily: 666.67
    // - Break: 10m -> Excess: 5m
    // - Rule: break1 (ID 4)
    
    await sequelize.query(`
      UPDATE attendance 
      SET 
        break_deduction_amount = 666.67, 
        excess_break_minutes = 5,
        break_rule_id = 4
      WHERE id = 32
    `);

    console.log('✅ FORCE UPDATE COMPLETED FOR ID 32');
    
    // Check it immediately
    const [results] = await sequelize.query('SELECT break_deduction_amount, break_rule_id, excess_break_minutes FROM attendance WHERE id = 32');
    console.log('-> Data now in DB:', JSON.stringify(results[0]));

  } catch (err) {
    console.error('X FORCE UPDATE FAILED:', err.message);
  } finally {
    process.exit();
  }
}

main();
