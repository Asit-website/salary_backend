require('dotenv').config();
const { sequelize } = require('./src/models');
const { encrypt } = require('./src/utils/encryption');

async function run() {
  try {
    console.log("=== STARTING KYB & BANK ACCOUNT ENCRYPTION MIGRATION ===");

    // Helper to check if a value is plain text (not encrypted with AES-256-GCM format 'iv:authTag:ciphertext')
    const isPlain = (val) => {
      if (!val || typeof val !== 'string') return false;
      return val.split(':').length !== 3;
    };

    // 1. ALTER TABLE: org_bank_accounts
    console.log("Modifying org_bank_accounts table columns...");
    await sequelize.query("ALTER TABLE org_bank_accounts MODIFY account_holder_name VARCHAR(255) NOT NULL");
    await sequelize.query("ALTER TABLE org_bank_accounts MODIFY account_number VARCHAR(255) NOT NULL");
    await sequelize.query("ALTER TABLE org_bank_accounts MODIFY ifsc VARCHAR(255) NOT NULL");

    // 2. ALTER TABLE: org_kyb
    console.log("Modifying org_kyb table columns...");
    await sequelize.query("ALTER TABLE org_kyb MODIFY company_pan VARCHAR(255) NULL");
    await sequelize.query("ALTER TABLE org_kyb MODIFY bank_account_number VARCHAR(255) NULL");
    await sequelize.query("ALTER TABLE org_kyb MODIFY ifsc VARCHAR(255) NULL");

    console.log("Database columns converted to VARCHAR(255) successfully!");

    // 3. ENCRYPT: org_bank_accounts
    const [bankAccounts] = await sequelize.query("SELECT id, account_holder_name, account_number, ifsc FROM org_bank_accounts");
    let bankEncryptedCount = 0;
    for (const b of bankAccounts) {
      const updates = {};
      if (isPlain(b.account_holder_name)) updates.account_holder_name = encrypt(b.account_holder_name);
      if (isPlain(b.account_number)) updates.account_number = encrypt(b.account_number);
      if (isPlain(b.ifsc)) updates.ifsc = encrypt(b.ifsc);

      if (Object.keys(updates).length > 0) {
        const setClauses = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
        await sequelize.query(
          `UPDATE org_bank_accounts SET ${setClauses} WHERE id = ?`,
          { replacements: [...Object.values(updates), b.id] }
        );
        bankEncryptedCount++;
      }
    }
    console.log(`Encrypted ${bankEncryptedCount} record(s) in org_bank_accounts.`);

    // 4. ENCRYPT: org_kyb
    const [kybRecords] = await sequelize.query("SELECT id, company_pan, bank_account_number, ifsc FROM org_kyb");
    let kybEncryptedCount = 0;
    for (const k of kybRecords) {
      const updates = {};
      if (isPlain(k.company_pan)) updates.company_pan = encrypt(k.company_pan);
      if (isPlain(k.bank_account_number)) updates.bank_account_number = encrypt(k.bank_account_number);
      if (isPlain(k.ifsc)) updates.ifsc = encrypt(k.ifsc);

      if (Object.keys(updates).length > 0) {
        const setClauses = Object.keys(updates).map(col => `\`${col}\` = ?`).join(', ');
        await sequelize.query(
          `UPDATE org_kyb SET ${setClauses} WHERE id = ?`,
          { replacements: [...Object.values(updates), k.id] }
        );
        kybEncryptedCount++;
      }
    }
    console.log(`Encrypted ${kybEncryptedCount} record(s) in org_kyb.`);

    console.log("=== MIGRATION COMPLETED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sequelize.close();
  }
}

run();
