const dayjs = require('dayjs');
const { PmsAppraisalCycle } = require('../models');

/**
 * Automatically evaluates and transitions all PMS Appraisal Cycles across all orgs:
 * - Future start date -> Scheduled (active = false)
 * - In performance period -> Active (active = true)
 * - Past completion date -> Completed (active = false)
 */
async function syncAllAppraisalCycles() {
  try {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const cycles = await PmsAppraisalCycle.findAll();

    for (const c of cycles) {
      const start = c.startDate || c.appraisalStartDate;
      const end = c.managementApprovalDeadline || c.finalApprovalDeadline || c.endDate;

      if (!start) continue;

      let targetStatus = c.status;
      let targetActive = c.active;

      if (todayStr < start) {
        targetStatus = 'Scheduled';
        targetActive = false;
      } else if (end && todayStr > end) {
        targetStatus = 'Completed';
        targetActive = false;
      } else {
        // Today is within range (todayStr >= start && (!end || todayStr <= end))
        if (['Draft', 'Scheduled'].includes(c.status) || !c.status) {
          targetStatus = 'Active';
          targetActive = true;
        } else if (['Active', 'Open', 'Self Assessment', 'Manager Review', 'HR Review', 'Approval Pending'].includes(c.status)) {
          targetActive = true;
        }
      }

      if (targetStatus !== c.status || targetActive !== c.active) {
        await c.update({ status: targetStatus, active: targetActive });
        console.log(`[PMS Cycle Cron] Auto-transitioned cycle #${c.id} (${c.cycleName}) from ${c.status} to ${targetStatus}`);
      }
    }
  } catch (err) {
    console.error('[PMS Cycle Cron] Error syncing appraisal cycles:', err);
  }
}

module.exports = {
  syncAllAppraisalCycles,
};
