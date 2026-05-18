const { runZktecoSyncAllOrgs } = require('../src/jobs/zktecoSync');

(async () => {
    console.log('🚀 Triggering manual ZKTeco sync to apply night shift fix & clean up false records...');
    try {
        await runZktecoSyncAllOrgs();
        console.log('✅ Sync completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Sync failed:', err);
        process.exit(1);
    }
})();
