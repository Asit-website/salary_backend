const { AppSetting, LatePunchApproval } = require('../models');
const shiftService = require('./shiftService');

class LateApprovalService {
  async getSettings(orgAccountId) {
    try {
      if (!orgAccountId) return { enabled: false, thresholdMinutes: 15 };
      const setting = await AppSetting.findOne({
        where: {
          orgAccountId,
          key: 'late_arrival_approval_settings'
        }
      });
      if (!setting || !setting.value) {
        return { enabled: false, thresholdMinutes: 15 };
      }
      const val = typeof setting.value === 'string'
        ? JSON.parse(setting.value)
        : setting.value;

      return {
        enabled: Boolean(val?.enabled),
        thresholdMinutes: Math.max(1, Number(val?.thresholdMinutes) || 15)
      };
    } catch (err) {
      console.error('[lateApprovalService] getSettings error:', err.message);
      return { enabled: false, thresholdMinutes: 15 };
    }
  }

  async saveSettings(orgAccountId, { enabled, thresholdMinutes }) {
    try {
      const payload = {
        enabled: Boolean(enabled),
        thresholdMinutes: Math.max(1, Number(thresholdMinutes) || 15)
      };

      const [setting, created] = await AppSetting.findOrCreate({
        where: {
          orgAccountId,
          key: 'late_arrival_approval_settings'
        },
        defaults: {
          orgAccountId,
          key: 'late_arrival_approval_settings',
          value: JSON.stringify(payload)
        }
      });

      if (!created) {
        await setting.update({
          value: JSON.stringify(payload)
        });
      }

      return { success: true, settings: payload };
    } catch (err) {
      console.error('[lateApprovalService] saveSettings error:', err.message);
      throw err;
    }
  }

  /**
   * Safe hook called on punch-in
   * If rule is disabled or employee is not late beyond threshold, returns { isRequired: false }.
   * If late beyond threshold, creates/updates LatePunchApproval record and returns { isRequired: true }.
   */
  async checkAndCreateLateApproval({ userId, orgAccountId, date, punchedInAt }) {
    try {
      if (!userId || !date || !punchedInAt) {
        return { isRequired: false };
      }

      if (!orgAccountId) {
        const { User } = require('../models');
        const user = await User.findByPk(userId);
        orgAccountId = user?.orgAccountId;
      }

      if (!orgAccountId) {
        return { isRequired: false };
      }

      const settings = await this.getSettings(orgAccountId);
      if (!settings || !settings.enabled) {
        // Feature disabled - strictly 0 action
        return { isRequired: false };
      }

      const shiftTpl = await shiftService.getEffectiveShiftTemplate(userId, date);
      if (!shiftTpl || !shiftTpl.startTime) {
        return { isRequired: false };
      }

      const punchDate = new Date(punchedInAt);
      const punchInSec = punchDate.getHours() * 3600 + punchDate.getMinutes() * 60 + punchDate.getSeconds();
      const [sh, sm, ss] = shiftTpl.startTime.split(':').map(Number);
      const shiftStartSec = (sh || 0) * 3600 + (sm || 0) * 60 + (ss || 0);

      if (punchInSec <= shiftStartSec) {
        // Staff arrived on time or early
        return { isRequired: false };
      }

      const lateMinutes = Math.floor((punchInSec - shiftStartSec) / 60);
      if (lateMinutes < Number(settings.thresholdMinutes)) {
        // Late, but within permissible grace threshold - no approval needed
        return { isRequired: false };
      }

      // Late beyond threshold - requires HR/Admin approval
      let approval = await LatePunchApproval.findOne({
        where: { userId, date, orgAccountId }
      });

      if (approval) {
        await approval.update({
          shiftStartTime: shiftTpl.startTime,
          punchedInAt: punchDate,
          lateMinutes,
          status: 'PENDING'
        });
      } else {
        approval = await LatePunchApproval.create({
          orgAccountId,
          userId,
          date,
          shiftStartTime: shiftTpl.startTime,
          punchedInAt: punchDate,
          lateMinutes,
          status: 'PENDING'
        });
      }

      return {
        isRequired: true,
        lateMinutes,
        shiftStartTime: shiftTpl.startTime,
        approval
      };
    } catch (err) {
      console.error('[lateApprovalService] checkAndCreateLateApproval safe error catch:', err);
      // Fail-safe: Always return isRequired: false on error so punch-in never crashes
      return { isRequired: false };
    }
  }
}

module.exports = new LateApprovalService();
