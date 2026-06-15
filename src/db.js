const bcrypt = require('bcryptjs');

const { sequelize, User, StaffProfile, MailCampaign, MailQueue, JobPosting, Candidate, Interview, RefreshToken } = require('./models');

async function initDb() {
  await sequelize.authenticate();

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
        const passwordHash = await bcrypt.hash(String(process.env.SAMPLE_STAFF_PASSWORD || '123456'), 10);
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
        'Database tables not found. Create the MySQL database and run migrations: npm run migrate'
      );
    }
    throw e;
  }
}

module.exports = { initDb };
