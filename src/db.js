const bcrypt = require('bcryptjs');

const { sequelize, User, StaffProfile, OrgAccount, MailCampaign, MailQueue, JobPosting, Candidate, Interview, RefreshToken } = require('./models');

async function initDb() {
  const maxAttempts = 3;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sequelize.authenticate();
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      const code = err?.parent?.code || err?.code || '';
      console.error(
        `MySQL connect attempt ${attempt}/${maxAttempts} failed (${code || err.message}). ` +
          `Host ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}`,
      );
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  if (lastErr) {
    console.error(
      '\nCannot reach MySQL. Start XAMPP → MySQL (or restart MySQL if it is already running), ' +
        'then run npm run dev again.\n',
    );
    throw lastErr;
  }

  try {
    const { runAggressiveSchemaFix } = require('./models');
    await runAggressiveSchemaFix();
  } catch (e) {
    console.log('⚠️ Schema repair skipped or failed:', e.message);
  }

  // Ensure RefreshToken table exists
  try {
    await RefreshToken.sync({ alter: true });
    console.log('⏰ RefreshToken table synced.');
  } catch (err) {
    console.log('⚠️ Error syncing RefreshToken table:', err.message);
  }

  // Ensure notifications table exists
  try {
    try {
      await sequelize.query('SELECT 1 FROM notifications LIMIT 1');
    } catch (queryErr) {
      if (String(queryErr.message).includes("doesn't exist in engine")) {
        console.log('⏰ Notifications table is corrupted in InnoDB engine. Dropping and recreating...');
        await sequelize.query('DROP TABLE IF EXISTS notifications');
      }
    }

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        org_account_id BIGINT UNSIGNED NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('⏰ Ensure notifications table exists - verified.');
  } catch (err) {
    console.log('⚠️ Error ensuring notifications table exists:', err.message);
  }

  // Ensure ShiftRotationGroup and ShiftRotationRule tables exist
  try {
    const { ShiftRotationGroup, ShiftRotationRule, User } = require('./models');
    await ShiftRotationGroup.sync({ alter: true });
    await ShiftRotationRule.sync({ alter: true });
    await User.sync({ alter: true });
    console.log('⏰ ShiftRotationGroup, ShiftRotationRule, and User tables synced.');
  } catch (err) {
    console.log('⚠️ Error syncing shift rotation tables:', err.message);
  }

  // Sync models to create/update tables
  // These are causing duplicate index issues with 'alter: true'. 
  // Use migrations for schema changes.
  /*
  await MailCampaign.sync({ alter: true });
  await MailQueue.sync({ alter: true });
  await JobPosting.sync({ alter: true });
  await Candidate.sync({ alter: true });
  await Interview.sync({ alter: true });
  */
  const { Plan, Subscription } = require('./models');
  // await Plan.sync({ alter: true });
  // await Subscription.sync({ alter: true });

  // Ensure face_id column exists
  try {
    await sequelize.query('ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS face_id VARCHAR(255) NULL AFTER photo_url');
  } catch (err) {
    // IF NOT EXISTS might not work in some MySQL versions, so we catch error
    console.log('AWS Rekognition: Note on face_id column (might already exist):', err.message);
  }

  // Ensure financial_year column exists in holiday_templates
  try {
    await sequelize.query('ALTER TABLE holiday_templates ADD COLUMN IF NOT EXISTS financial_year VARCHAR(16) NULL');
    console.log('⏰ financial_year column in holiday_templates checked/verified.');
  } catch (err) {
    console.log('Note on financial_year column in holiday_templates (might already exist):', err.message);
  }

  // Ensure qr_punch_enabled column exists in users
  try {
    await sequelize.query('ALTER TABLE users ADD COLUMN qr_punch_enabled BOOLEAN NOT NULL DEFAULT TRUE');
  } catch (err) {
    console.log('Note on qr_punch_enabled column (might already exist):', err.message);
  }

  // Ensure pardon_limit column exists in late_punchin_rules
  try {
    await sequelize.query('ALTER TABLE late_punchin_rules ADD COLUMN pardon_limit INT NOT NULL DEFAULT 0');
  } catch (err) {
    console.log('Note on pardon_limit column (might already exist):', err.message);
  }

  // Ensure salary_register_enabled and other report columns exist in plans and subscriptions
  const reportCols = [
    'salary_register_enabled',
    'monthly_summary_enabled',
    'per_day_salary_enabled',
    'comparison_enabled',
    'ot_impact_enabled',
    'late_penalty_enabled'
  ];

  for (const col of reportCols) {
    try {
      await sequelize.query(`ALTER TABLE plans ADD COLUMN ${col} BOOLEAN NOT NULL DEFAULT TRUE`);
    } catch (err) {
      console.log(`${col} column in plans already exists or error:`, err.message);
    }

    try {
      await sequelize.query(`ALTER TABLE subscriptions ADD COLUMN ${col} BOOLEAN NOT NULL DEFAULT TRUE`);
    } catch (err) {
      console.log(`${col} column in subscriptions already exists or error:`, err.message);
    }
  }

  // Ensure attendance_location_enabled column exists in plans and subscriptions, defaulting to false
  try {
    await sequelize.query('ALTER TABLE plans ADD COLUMN attendance_location_enabled BOOLEAN NOT NULL DEFAULT FALSE');
  } catch (err) {
    console.log('attendance_location_enabled column in plans already exists or error:', err.message);
  }

  try {
    await sequelize.query('ALTER TABLE subscriptions ADD COLUMN attendance_location_enabled BOOLEAN NOT NULL DEFAULT FALSE');
  } catch (err) {
    console.log('attendance_location_enabled column in subscriptions already exists or error:', err.message);
  }

  // Ensure attendance_punches has all required columns for multi-punch / punch tracking
  const punchCols = [
    'date VARCHAR(10) NULL',
    'punch_number INT DEFAULT 1',
    'punched_in_at DATETIME NULL',
    'punched_out_at DATETIME NULL',
    'latitude DECIMAL(10,8) NULL',
    'longitude DECIMAL(11,8) NULL',
    'address TEXT NULL',
  ];
  for (const pColDef of punchCols) {
    try {
      await sequelize.query('ALTER TABLE attendance_punches ADD COLUMN ' + pColDef);
    } catch (_) {
      // Column already exists
    }
  }

  // Ensure attendance_punches references attendance(id) instead of legacy attendances(id)
  try {
    await sequelize.query('ALTER TABLE attendance_punches MODIFY COLUMN punch_in_at DATETIME NULL');
  } catch (_) {}
  try {
    const [fkRows] = await sequelize.query(`
      SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'attendance_punches' 
        AND COLUMN_NAME = 'attendance_id' 
        AND REFERENCED_TABLE_NAME = 'attendances'
    `);
    if (fkRows && fkRows.length > 0) {
      for (const fk of fkRows) {
        await sequelize.query('ALTER TABLE attendance_punches DROP FOREIGN KEY `' + fk.CONSTRAINT_NAME + '`');
      }
      await sequelize.query('ALTER TABLE attendance_punches ADD CONSTRAINT fk_att_punches_attendance FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE');
    }
  } catch (_) {}

  // Align staff_profiles with Sequelize model (partial migrations may omit newer columns)
  try {
    await StaffProfile.sync({ alter: true });
    console.log('⏰ StaffProfile table synced.');
  } catch (err) {
    console.log('⚠️ Error syncing StaffProfile table:', err.message);
  }

  const orgAccountRuleCols = [
    'overtime_rule_id BIGINT UNSIGNED NULL',
    'early_exit_rule_id BIGINT UNSIGNED NULL',
    'break_rule_id BIGINT UNSIGNED NULL',
    'early_overtime_rule_id BIGINT UNSIGNED NULL',
    'community_enabled TINYINT(1) NOT NULL DEFAULT 0',
  ];
  for (const colDef of orgAccountRuleCols) {
    const colName = colDef.split(' ')[0];
    try {
      await sequelize.query(`ALTER TABLE org_accounts ADD COLUMN ${colDef}`);
    } catch (err) {
      if (!String(err.message).includes('Duplicate column')) {
        console.log(`Note on org_accounts.${colName} (might already exist):`, err.message);
      }
    }
  }

  try {
    await OrgAccount.sync({ alter: true });
    console.log('⏰ OrgAccount table synced.');
  } catch (err) {
    console.log('⚠️ Error syncing OrgAccount table:', err.message);
  }

  const phone = process.env.SUPERADMIN_PHONE;
  const password = process.env.SUPERADMIN_PASSWORD;

  try {
    if (phone && password) {
      const existing = await User.findOne({ where: { role: 'superadmin' } });
      if (!existing) {
        const passwordHash = await bcrypt.hash(String(password), 10);
        const superadmin = await User.create({
          role: 'superadmin',
          phone: String(phone),
          passwordHash,
          active: true,
        });

        await StaffProfile.create({
          userId: superadmin.id,
          name: 'Super Admin',
          phone: String(phone),
          email: null,
          staffId: null,
        });
      }
    }

    const samplePhone = process.env.SAMPLE_STAFF_PHONE;
    const sampleStaffId = process.env.SAMPLE_STAFF_ID;
    const sampleName = process.env.SAMPLE_STAFF_NAME;
    const sampleEmail = process.env.SAMPLE_STAFF_EMAIL;

    if (samplePhone && sampleStaffId) {
      const staffUser = await User.findOne({ where: { phone: String(samplePhone) } });
      if (!staffUser) {
        const passwordHash = await bcrypt.hash(String(process.env.SAMPLE_STAFF_PASSWORD || process.env.DEFAULT_USER_PASSWORD || 'Thinktech@123'), 10);
        const created = await User.create({
          role: 'staff',
          phone: String(samplePhone),
          passwordHash,
          active: true,
        });

        await StaffProfile.create({
          userId: created.id,
          staffId: String(sampleStaffId),
          name: sampleName ? String(sampleName) : null,
          email: sampleEmail ? String(sampleEmail) : null,
          phone: String(samplePhone),
        });
      }
    }
  } catch (e) {
    const msg = String(e?.original?.sqlMessage || e?.message || e);
    const missingTable = /doesn't exist|no such table|ER_NO_SUCH_TABLE/i.test(msg);
    if (missingTable) {
      throw new Error(
        'Database tables not found. Create the MySQL database and run migrations: npm run migrate:all'
      );
    }
    const missingColumn = /Unknown column|ER_BAD_FIELD_ERROR/i.test(msg);
    if (missingColumn) {
      throw new Error(
        `Database schema is out of date (${msg}). Run: npm run migrate:all — or restart after StaffProfile sync.`
      );
    }
    throw e;
  }
}

module.exports = { initDb };
