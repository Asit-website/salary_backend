const express = require('express');
const { Activity } = require('../models');
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
        userId: req.user.id,
        orgAccountId: req.tenantOrgAccountId,
      },
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
    const { status } = req.body || {};
    if (!status || !['SCHEDULE', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const activity = await Activity.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        orgAccountId: req.tenantOrgAccountId,
      }
    });

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    if (activity.isClosed) {
      return res.status(403).json({ success: false, message: 'Activity is closed by admin and cannot be modified' });
    }

    await activity.update({ status });
    return res.json({ success: true, activity });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to update activity' });
  }
});

module.exports = router;
