const bcrypt = require('bcryptjs');

const { sequelize, User, StaffProfile } = require('./models');

async function initDb() {
  await sequelize.authenticate();

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
