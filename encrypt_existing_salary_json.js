require('dotenv').config();
const { sequelize } = require('./src/models');
const { encrypt } = require('./src/utils/encryption');

async function run() {
  try {
    console.log("=== ENCRYPTING EXISTING SALARY VALUES JSON ===");

    const [users] = await sequelize.query("SELECT id, salary_values FROM users WHERE role = 'staff'");
    let encryptedCount = 0;

    for (const u of users) {
      if (!u.salary_values) continue;

      const isPlain = (val) => {
        if (!val || typeof val !== 'string') return false;
        // If it starts with '{' and doesn't contain ciphertext, it is plain JSON
        try {
          const parsed = JSON.parse(val);
          return typeof parsed === 'object' && !parsed.ciphertext;
        } catch {
          return false;
        }
      };

      if (isPlain(u.salary_values)) {
        let parsed = JSON.parse(u.salary_values);
        const wrapped = { ciphertext: encrypt(parsed) };

        await sequelize.query(
          "UPDATE users SET salary_values = ? WHERE id = ?",
          { replacements: [JSON.stringify(wrapped), u.id] }
        );
        encryptedCount++;
      }
    }

    console.log(`Successfully encrypted existing salary JSONs for ${encryptedCount} staff user(s)!`);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sequelize.close();
  }
}

run();
