const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: false
});

async function fix() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected! Fixing database schema (REVERTING TO LOWER CASE NAMES)...');

    // Helper to check if table exists
    const tableExists = async (table) => {
      const [results] = await sequelize.query(`SHOW TABLES LIKE '${table}'`);
      return results.length > 0;
    };

    // Helper to check if column exists
    const columnExists = async (table, column) => {
      try {
        const [results] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
        return results.length > 0;
      } catch (e) { return false; }
    };

    // 1. Rename Tables to lowercase if PascalCase exists
    try {
      if (await tableExists('OrgAccounts') && !await tableExists('org_accounts')) {
        await sequelize.query("RENAME TABLE `OrgAccounts` TO `org_accounts` ");
        console.log('✅ Renamed OrgAccounts to org_accounts');
      }
      if (await tableExists('Attendance') && !await tableExists('attendance')) {
        await sequelize.query("RENAME TABLE `Attendance` TO `attendance` ");
        console.log('✅ Renamed Attendance to attendance');
      }
    } catch (e) { console.log('⚠️ Rename table error:', e.message); }

    const curOrg = await tableExists('org_accounts') ? 'org_accounts' : (await tableExists('OrgAccounts') ? 'OrgAccounts' : null);
    const curAtt = await tableExists('attendance') ? 'attendance' : (await tableExists('Attendance') ? 'Attendance' : null);

    if (!curOrg || !curAtt) {
        console.log('❌ Could not find tables to update columns');
    } else {
        // 2. Fix OrgAccount columns
        try {
          if (await columnExists(curOrg, 'earlyExitRuleId') && !await columnExists(curOrg, 'early_exit_rule_id')) {
            await sequelize.query(`ALTER TABLE \`${curOrg}\` CHANGE \`earlyExitRuleId\` \`early_exit_rule_id\` BIGINT UNSIGNED DEFAULT NULL`);
            console.log(`✅ Renamed earlyExitRuleId to early_exit_rule_id in ${curOrg}`);
          } else if (!await columnExists(curOrg, 'early_exit_rule_id')) {
            await sequelize.query(`ALTER TABLE \`${curOrg}\` ADD COLUMN \`early_exit_rule_id\` BIGINT UNSIGNED DEFAULT NULL`);
            console.log(`✅ Added early_exit_rule_id to ${curOrg}`);
          }
        } catch (e) { console.log(`⚠️ ${curOrg} error:`, e.message); }

        // 3. Fix Attendance columns
        try {
          const mappings = [
            { old: 'earlyExitMinutes', new: 'early_exit_minutes', type: 'DECIMAL(10, 2) DEFAULT 0' },
            { old: 'earlyExitAmount', new: 'early_exit_amount', type: 'DECIMAL(10, 2) DEFAULT 0' },
            { old: 'earlyExitRuleId', new: 'early_exit_rule_id', type: 'BIGINT UNSIGNED DEFAULT NULL' },
            { old: 'isAutoMarked', new: 'is_auto_marked', type: 'TINYINT(1) DEFAULT 0' }
          ];

          for (const m of mappings) {
            if (await columnExists(curAtt, m.old) && !await columnExists(curAtt, m.new)) {
              await sequelize.query(`ALTER TABLE \`${curAtt}\` CHANGE \`${m.old}\` \`${m.new}\` ${m.type}`);
              console.log(`✅ Renamed ${m.old} to ${m.new} in ${curAtt}`);
            } else if (!await columnExists(curAtt, m.new)) {
              await sequelize.query(`ALTER TABLE \`${curAtt}\` ADD COLUMN \`${m.new}\` ${m.type}`);
              console.log(`✅ Added ${m.new} to ${curAtt}`);
            }
          }
        } catch (e) { console.log(`⚠️ ${curAtt} error:`, e.message); }
    }

    // 4. Create EarlyExitRules table if not exists (lowercase name)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`early_exit_rules\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(255) NOT NULL,
        \`deduction_type\` ENUM('FIXED_AMOUNT', 'SALARY_MULTIPLIER') NOT NULL DEFAULT 'FIXED_AMOUNT',
        \`thresholds\` JSON DEFAULT NULL,
        \`deduct_half_day\` TINYINT(1) DEFAULT 0,
        \`half_day_threshold_minutes\` INT DEFAULT NULL,
        \`deduct_full_day\` TINYINT(1) DEFAULT 0,
        \`full_day_threshold_minutes\` INT DEFAULT NULL,
        \`active\` TINYINT(1) DEFAULT 1,
        \`org_account_id\` BIGINT UNSIGNED NOT NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ early_exit_rules table checked/created');

    // Add deduction_type if it was missing from a previous run
    if (!await columnExists('early_exit_rules', 'deduction_type')) {
      await sequelize.query("ALTER TABLE `early_exit_rules` ADD COLUMN `deduction_type` ENUM('FIXED_AMOUNT', 'SALARY_MULTIPLIER') NOT NULL DEFAULT 'FIXED_AMOUNT' AFTER `name` ");
      console.log('✅ Added deduction_type to early_exit_rules');
    }

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`staff_early_exit_assignments\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`user_id\` BIGINT UNSIGNED NOT NULL,
        \`early_exit_rule_id\` BIGINT UNSIGNED NOT NULL,
        \`org_account_id\` BIGINT UNSIGNED NOT NULL,
        \`effective_from\` DATE NOT NULL,
        \`effective_to\` DATE DEFAULT NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ staff_early_exit_assignments table checked/created');

    console.log('\n✨ Database REVERT fix complete! Restarting backend...');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing database:', error.message);
    process.exit(1);
  }
}

fix();
