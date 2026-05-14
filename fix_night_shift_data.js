require('dotenv').config();
const { initDb } = require('./src/db');
const { Attendance } = require('./src/models');
const automationRecalculationService = require('./src/services/automationRecalculationService');
const dayjs = require('dayjs');

async function fixNightShifts() {
    try {
        console.log('Connecting to database...');
        await initDb();
        console.log('Database connected!');

        // Hum pichle 2 mahine ka data fix karenge
        const fromDate = dayjs().subtract(2, 'month').format('YYYY-MM-DD');
        const toDate = dayjs().format('YYYY-MM-DD');

        console.log(`\n📅 Recalculating attendance from ${fromDate} to ${toDate}...`);

        // Find all unique user + org combinations that have attendance
        const usersToFix = await Attendance.findAll({
            attributes: ['userId', 'orgAccountId'],
            group: ['userId', 'orgAccountId'],
            raw: true
        });

        console.log(`Found ${usersToFix.length} users with attendance records. Processing now...\n`);

        let totalRecordsFixed = 0;

        for (let i = 0; i < usersToFix.length; i++) {
            const { userId, orgAccountId } = usersToFix[i];
            
            try {
                process.stdout.write(`[${i + 1}/${usersToFix.length}] Fixing User ID ${userId}... `);
                
                const result = await automationRecalculationService.recalculateAttendance(
                    userId,
                    orgAccountId,
                    fromDate,
                    toDate
                );
                
                console.log(`✅ Fixed ${result.processed} records.`);
                totalRecordsFixed += result.processed;
            } catch (userErr) {
                console.log(`❌ Error: ${userErr.message}`);
            }
        }

        console.log(`\n🎉 COMPLETELY DONE! Total ${totalRecordsFixed} old attendance records have been successfully updated with the new night shift logic!`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Script failed:', err);
        process.exit(1);
    }
}

fixNightShifts();
