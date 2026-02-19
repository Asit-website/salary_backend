const { sequelize } = require('./src/models');
async function run() {
    try {
        await sequelize.authenticate();
        await sequelize.query("ALTER TABLE payroll_lines ADD COLUMN payslip_path VARCHAR(255) NULL;");
        console.log("Column added");
    } catch (e) {
        console.log("Error (column might exist):", e.original ? e.original.sqlMessage : e.message);
    } finally {
        process.exit(0);
    }
}
run();
