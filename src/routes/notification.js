const express = require('express');
const { Notification } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { tenantEnforce } = require('../middleware/tenant');

const router = express.Router();

router.use(authRequired);
router.use(tenantEnforce);
router.use(requireRole(['admin', 'superadmin']));

// GET /api/admin/notifications - Get all notifications for the organization
router.get('/', async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const list = await Notification.findAll({
      where: { orgAccountId },
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    return res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// POST /api/admin/notifications/read-all - Mark all notifications as read
router.post('/read-all', async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    await Notification.update({ isRead: true }, { where: { orgAccountId, isRead: false } });
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error reading all notifications:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

// POST /api/admin/notifications/:id/read - Mark notification as read
router.post('/:id/read', async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const { id } = req.params;
    const notif = await Notification.findOne({ where: { id, orgAccountId } });
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    await notif.update({ isRead: true });
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error reading notification:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

module.exports = router;
