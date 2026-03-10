const cron = require('node-cron');
const { OrgAccount } = require('../models');
const zktecoService = require('../services/zktecoService');

/**
 * Schedule the ZKTeco Sync job
 * Runs every 30 minutes
 */
const scheduleZktecoSync = () => {
    cron.schedule('*/1 * * * *', async () => {
        console.log('⏰ Running scheduled ZKTeco biometric sync (Every 1 min)...');
        await runZktecoSyncAllOrgs();
    });
    console.log('📅 ZKTeco Biometric Sync job scheduled to run every minute');
};

/**
 * Manual trigger / Helper to sync all active orgs
 */
const runZktecoSyncAllOrgs = async () => {
    try {
        const orgs = await OrgAccount.findAll({ where: { status: 'ACTIVE' } });
        for (const org of orgs) {
            await zktecoService.syncTransactionsForOrg(org.id);
        }
    } catch (error) {
        console.error('[ZktecoSyncJob] Failed to iterate orgs:', error.message);
    }
};

module.exports = {
    scheduleZktecoSync,
    runZktecoSyncAllOrgs
};
