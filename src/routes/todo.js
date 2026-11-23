const express = require('express');
const { Activity, User, StaffProfile, ActivityHistory, ActivityTitle } = require('../models');
const { Op } = require('sequelize');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');

const router = express.Router();

router.use(authRequired);
router.use(tenantEnforce);

// Create activity
router.post('/', async (req, res) => {
  try {
    const { title, description, remarks, status, date, turnAroundTime, turnAroundDate, userId } = req.body || {};
    if (!title || !date) {
      return res.status(400).json({ success: false, message: 'Title and date are required' });
    }

    const activity = await Activity.create({
      userId: userId || req.user.id,
      orgAccountId: req.tenantOrgAccountId,
      title,
      description,
      remarks,
      status: status || 'SCHEDULE',
      date,
      turnAroundTime,
      turnAroundDate,
      allocatedById: req.user.id,
    });

    return res.json({ success: true, activity });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to create activity' });
  }
});

// List my activities
router.get('/me', async (req, res) => {
  try {
    const activities = await Activity.findAll({
      where: {
        orgAccountId: req.tenantOrgAccountId,
        [Op.or]: [
          { userId: req.user.id },
          { transferredToId: req.user.id }
        ]
      },
      include: [
        {
          model: User,
          as: 'transferredTo',
          attributes: ['id'],
          include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
        },
        {
          model: User,
          as: 'allocatedBy',
          attributes: ['id'],
          include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });
    return res.json({ success: true, activities });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to load activities' });
  }
});

// Update activity status
router.patch('/:id/status', async (req, res) => {
  try {
    const activity = await Activity.findOne({
      where: {
        id: req.params.id,
        orgAccountId: req.tenantOrgAccountId,
        [Op.or]: [
          { userId: req.user.id },
          { transferredToId: req.user.id }
        ]
      }
    });

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    if (activity.isClosed) {
      return res.status(403).json({ success: false, message: 'Activity is closed by admin and cannot be modified' });
    }

    const { status, remarks } = req.body || {};
    const oldStatus = activity.status;
    const updateData = { status };
    if (remarks !== undefined) {
      updateData.remarks = remarks;
    }

    await activity.update(updateData);

    await ActivityHistory.create({
      activityId: activity.id,
      updatedById: req.user.id,
      oldStatus,
      newStatus: status,
      remarks: remarks || 'Status updated via app'
    });
    return res.json({ success: true, activity });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to update activity' });
  }
});

// Transfer/Share activity
router.patch('/:id/transfer', async (req, res) => {
  try {
    const { targetUserId } = req.body || {};
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID is required' });
    }

    const activity = await Activity.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id, // Only creator can transfer/share
        orgAccountId: req.tenantOrgAccountId,
      }
    });

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found or unauthorized' });
    }

    await activity.update({ transferredToId: targetUserId });
    return res.json({ success: true, message: 'Activity shared successfully' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to share activity' });
  }
});

// Update activity details (creator only)
router.patch('/:id', async (req, res) => {
  try {
    const activity = await Activity.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id, // Only creator can edit details
        orgAccountId: req.tenantOrgAccountId,
      }
    });

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found or unauthorized' });
    }

    if (activity.isClosed) {
      return res.status(403).json({ success: false, message: 'Activity is closed and cannot be edited' });
    }

    const { title, description, remarks, date, turnAroundTime, turnAroundDate } = req.body || {};
    const oldStatus = activity.status;

    await activity.update({ title, description, remarks, date, turnAroundTime, turnAroundDate });

    await ActivityHistory.create({
      activityId: activity.id,
      updatedById: req.user.id,
      oldStatus,
      newStatus: oldStatus,
      remarks: 'Activity details updated via app'
    });

    return res.json({ success: true, activity });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to update activity details' });
  }
});


// Activity Titles for Mobile APK
router.get('/titles', async (req, res) => {
  try {
    const titles = await ActivityTitle.findAll({
      where: { orgAccountId: req.tenantOrgAccountId },
      order: [['title', 'ASC']]
    });
    return res.json({ success: true, titles });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to load titles' });
  }
});

router.post('/titles', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    const trimmedTitle = title.trim();
    let existing = await ActivityTitle.findOne({
      where: {
        orgAccountId: req.tenantOrgAccountId,
        title: trimmedTitle
      }
    });
    if (existing) {
      return res.json({ success: true, title: existing });
    }
    const newTitle = await ActivityTitle.create({
      orgAccountId: req.tenantOrgAccountId,
      title: trimmedTitle,
      createdBy: req.user.id
    });
    return res.json({ success: true, title: newTitle });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to save title' });
  }
});


// Bulk create/schedule recurring routine jobs from mobile app
function isDateMatchingDayRule(curDate, dayRule, excludeSundays = true) {
    const dayOfWeek = curDate.day(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    if (excludeSundays && dayOfWeek === 0) return false;

    if (!dayRule || dayRule === 'ALL_DAYS') return true;
    if (dayRule === 'MON_TO_FRI') return dayOfWeek >= 1 && dayOfWeek <= 5;
    if (dayRule === 'MON_ONLY') return dayOfWeek === 1;
    if (dayRule === 'TUE_ONLY') return dayOfWeek === 2;
    if (dayRule === 'WED_ONLY') return dayOfWeek === 3;
    if (dayRule === 'THU_ONLY') return dayOfWeek === 4;
    if (dayRule === 'FRI_ONLY') return dayOfWeek === 5;
    if (dayRule === 'SAT_ONLY') return dayOfWeek === 6;
    if (String(dayRule).startsWith('DATE_')) {
        const dom = parseInt(String(dayRule).replace('DATE_', ''), 10);
        return curDate.date() === dom;
    }
    return true;
}

router.post('/bulk', async (req, res) => {
    try {
        const {
            userId,
            months, // e.g. ["2026-11", "2026-12"]
            excludeSundays = true,
            activities // array of { title, description, turnAroundTime, dayRule }
        } = req.body;

        const targetUserId = Number(userId || req.user.id);

        if (!Array.isArray(months) || months.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one month.' });
        }

        if (!Array.isArray(activities) || activities.length === 0) {
            return res.status(400).json({ success: false, message: 'Please add at least one activity.' });
        }

        for (const act of activities) {
            if (!act.title || !String(act.title).trim()) {
                return res.status(400).json({ success: false, message: 'All activities must have a title.' });
            }
        }

        const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const dayjs = require('dayjs');

        const allDates = [];
        months.forEach(m => {
            const start = dayjs(m + '-01');
            const daysInMonth = start.daysInMonth();
            for (let d = 1; d <= daysInMonth; d++) {
                const curDate = start.date(d);
                const dayOfWeek = curDate.day();
                if (excludeSundays && dayOfWeek === 0) continue;
                allDates.push(curDate);
            }
        });

        const recordsToInsert = [];
        for (const d of allDates) {
            const dateStr = d.format('YYYY-MM-DD');

            for (const act of activities) {
                const dayRule = act.dayRule || 'ALL_DAYS';

                if (!isDateMatchingDayRule(d, dayRule, excludeSundays)) continue;

                recordsToInsert.push({
                    orgAccountId: req.tenantOrgAccountId,
                    userId: targetUserId,
                    title: String(act.title).trim(),
                    description: act.description ? String(act.description).trim() : null,
                    date: dateStr,
                    turnAroundTime: act.turnAroundTime || null,
                    turnAroundDate: dateStr,
                    status: 'SCHEDULE',
                    jobType: 'ROUTINE',
                    dayRule,
                    batchId,
                    allocatedById: req.user.id
                });
            }
        }

        if (recordsToInsert.length === 0) {
            return res.status(400).json({ success: false, message: 'No dates matched the day rules for the selected months.' });
        }

        const result = await Activity.bulkCreate(recordsToInsert);

        return res.status(201).json({
            success: true,
            message: `Successfully scheduled ${result.length} activities across ${months.length} month(s).`,
            count: result.length,
            batchId
        });
    } catch (error) {
        console.error('[todo/bulk] Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to schedule activities' });
    }
});


// Download or view Activity & Task Performance Report PDF
router.get('/report/pdf', async (req, res) => {
  try {
    const { startDate, endDate, status, jobType, userId } = req.query || {};
    const { generateActivityReportPDF } = require('../services/activityPdfService');

    const targetUserId = (req.user.role === 'admin' || req.user.role === 'superadmin') && userId
      ? Number(userId)
      : req.user.id;

    const result = await generateActivityReportPDF({
      orgAccountId: req.tenantOrgAccountId,
      userId: targetUserId,
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || null,
      jobType: jobType || null
    });

    if (!result || !result.pdfBuffer) {
      return res.status(404).json({ success: false, message: 'Failed to generate PDF' });
    }

    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const disposition = isDownload ? 'attachment' : 'inline';
    const filename = `Activity_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Content-Length', result.pdfBuffer.length);
    return res.end(result.pdfBuffer);
  } catch (err) {
    console.error('Error generating activity PDF report:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate activity report PDF' });
  }
});

module.exports = router;

