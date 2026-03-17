const express = require('express');
const { Activity, User, StaffProfile, ActivityHistory } = require('../models');
const { Op } = require('sequelize');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');

const router = express.Router();

router.use(authRequired);
router.use(tenantEnforce);

// Create activity
router.post('/', async (req, res) => {
  try {
    const { title, description, remarks, status, date, turnAroundTime } = req.body || {};
    if (!title || !date) {
      return res.status(400).json({ success: false, message: 'Title and date are required' });
    }

    const activity = await Activity.create({
      userId: req.user.id,
      orgAccountId: req.tenantOrgAccountId,
      title,
      description,
      remarks,
      status: status || 'SCHEDULE',
      date,
      turnAroundTime,
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

module.exports = router;
