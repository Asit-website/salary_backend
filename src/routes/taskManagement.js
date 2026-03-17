const express = require('express');
const { Activity, Meeting, MeetingAttendee, Ticket, TicketHistory, ActivityHistory, MeetingHistory, User, StaffProfile, sequelize, TaskObserverMapping } = require('../models');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');
const { Op } = require('sequelize');

const router = express.Router();

// Allow admin or staff with task_management_tab permission (implicitly handled via route mounting, but we enforce org/auth here)
router.use(authRequired);
router.use(tenantEnforce);

// Helper to get allowed staff IDs for a user
async function getAllowedStaffIds(req) {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') return null; // Admin sees everyone

    const user = await User.findByPk(req.user.id);
    if (!user || !user.isTaskObserver) return []; // Not an observer, see nobody

    const mappings = await TaskObserverMapping.findAll({
        where: { observerId: req.user.id, orgAccountId: req.tenantOrgAccountId },
        attributes: ['staffId']
    });
    return mappings.map(m => m.staffId);
}

// Middlewares already enforced tenantOrgAccountId globally or locally

// List all Activities
router.get('/activities', async (req, res) => {
    try {
        const allowedIds = await getAllowedStaffIds(req);
        const where = { orgAccountId: req.tenantOrgAccountId };
        if (allowedIds) where.userId = allowedIds;
        else if (Array.isArray(allowedIds)) return res.json({ success: true, activities: [] });

        const activities = await Activity.findAll({
            where,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id'],
                include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'department'] }]
            }, {
                model: User,
                as: 'closedBy',
                attributes: ['id'],
                include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
            }, {
                model: User,
                as: 'transferredTo',
                attributes: ['id'],
                include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, activities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// List all Meetings
router.get('/meetings', async (req, res) => {
    try {
        const allowedIds = await getAllowedStaffIds(req);
        const where = { orgAccountId: req.tenantOrgAccountId };
        if (allowedIds) where.createdBy = allowedIds;
        else if (Array.isArray(allowedIds)) return res.json({ success: true, meetings: [] });

        const meetings = await Meeting.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                },
                {
                    model: User,
                    as: 'attendees',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                },
                {
                    model: User,
                    as: 'closedBy',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                }
            ],
            order: [['scheduledAt', 'DESC']]
        });
        res.json({ success: true, meetings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// List all Meeting Attendance Records
router.get('/meeting-attendance', async (req, res) => {
    try {
        const allowedIds = await getAllowedStaffIds(req);
        const meetingWhere = { orgAccountId: req.tenantOrgAccountId };
        if (allowedIds) meetingWhere.createdBy = allowedIds; // Or should we filter by attendee? Typically observer sees tasks of staff.
        else if (Array.isArray(allowedIds)) return res.json({ success: true, attendance: [] });

        const attendance = await MeetingAttendee.findAll({
            include: [
                {
                    model: Meeting,
                    as: 'meeting',
                    where: meetingWhere,
                    attributes: ['title', 'scheduledAt']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                }
            ],
            order: [[{ model: Meeting, as: 'meeting' }, 'scheduledAt', 'DESC']]
        });
        res.json({ success: true, attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Close Meeting (Irreversible)
router.patch('/meetings/:id/close', async (req, res) => {
    try {
        const meeting = await Meeting.findOne({
            where: { id: req.params.id, orgAccountId: req.tenantOrgAccountId }
        });
        if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
        const oldStatus = meeting.status;
        const updateData = { isClosed: true, closedById: req.user.id };

        // If closing, ensure status is DONE
        let newStatus = meeting.status;
        if (meeting.status !== 'DONE') {
            updateData.status = 'DONE';
            newStatus = 'DONE';
        }

        await meeting.update(updateData);

        await MeetingHistory.create({
            meetingId: meeting.id,
            updatedById: req.user.id,
            oldStatus,
            newStatus,
            remarks: 'Closed by admin/observer'
        });

        res.json({ success: true, meeting });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: Get Meeting History
router.get('/meetings/:id/history', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && (!user || !user.isTaskObserver)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const meetingId = req.params.id;
        const history = await MeetingHistory.findAll({
            where: { meetingId },
            include: [
                {
                    model: User,
                    as: 'updater',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// List all Tickets
router.get('/tickets', async (req, res) => {
    try {
        const allowedIds = await getAllowedStaffIds(req);
        const where = { orgAccountId: req.tenantOrgAccountId };
        // Tickets can be raised BY or TO the staff. Observers usually manage assigned staff's work.
        if (allowedIds) {
            where[Op.or] = [
                { allocatedTo: allowedIds },
                { allocatedBy: allowedIds }
            ];
        } else if (Array.isArray(allowedIds)) return res.json({ success: true, tickets: [] });

        const tickets = await Ticket.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                },
                {
                    model: User,
                    as: 'assignee',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                },
                {
                    model: User,
                    as: 'updater',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                },
                {
                    model: User,
                    as: 'closedBy',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Close Activity (Irreversible)
router.patch('/activities/:id/close', async (req, res) => {
    try {
        const activity = await Activity.findOne({
            where: { id: req.params.id, orgAccountId: req.tenantOrgAccountId }
        });
        if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
        if (activity.isClosed) return res.status(400).json({ success: false, message: 'Activity already closed' });

        const oldStatus = activity.status;
        const updateData = { isClosed: true, closedById: req.user.id };

        // If closing, ensure status is DONE
        let newStatus = activity.status;
        if (activity.status !== 'DONE') {
            updateData.status = 'DONE';
            newStatus = 'DONE';
        }

        await activity.update(updateData);

        await ActivityHistory.create({
            activityId: activity.id,
            updatedById: req.user.id,
            oldStatus,
            newStatus,
            remarks: 'Closed by admin/observer'
        });

        res.json({ success: true, activity });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Close Ticket (Irreversible)
router.patch('/tickets/:id/close', async (req, res) => {
    try {
        const ticket = await Ticket.findOne({
            where: { id: req.params.id, orgAccountId: req.tenantOrgAccountId }
        });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        if (ticket.isClosed) return res.status(400).json({ success: false, message: 'Ticket already closed' });

        const oldStatus = ticket.status;

        const updateData = { isClosed: true, updatedBy: req.user.id, closedById: req.user.id };

        // If closing, ensure status is DONE
        let newStatus = ticket.status;
        if (ticket.status !== 'DONE') {
            updateData.status = 'DONE';
            newStatus = 'DONE';
        }

        await ticket.update(updateData);

        await TicketHistory.create({
            ticketId: ticket.id,
            updatedById: req.user.id,
            oldStatus,
            newStatus,
            remarks: 'Closed by admin/observer'
        });

        res.json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: Get Ticket History
router.get('/tickets/:id/history', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && (!user || !user.isTaskObserver)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const ticketId = req.params.id;
        const history = await TicketHistory.findAll({
            where: { ticketId },
            include: [
                {
                    model: User,
                    as: 'updater',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: Get Activity History
router.get('/activities/:id/history', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && (!user || !user.isTaskObserver)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const activityId = req.params.id;
        const history = await ActivityHistory.findAll({
            where: { activityId },
            include: [
                {
                    model: User,
                    as: 'updater',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: List Observers
router.get('/observers', async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Admin only' });
        const observers = await User.findAll({
            where: { orgAccountId: req.tenantOrgAccountId, active: true },
            include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'phone'] }],
            order: [['isTaskObserver', 'DESC'], [{ model: StaffProfile, as: 'profile' }, 'name', 'ASC']]
        });
        res.json({ success: true, observers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: Toggle Observer Status
router.patch('/observers/:id/toggle', async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Admin only' });
        const user = await User.findOne({ where: { id: req.params.id, orgAccountId: req.tenantOrgAccountId } });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        await user.update({ isTaskObserver: !user.isTaskObserver });
        res.json({ success: true, isTaskObserver: user.isTaskObserver });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: Get Observer Mappings
router.get('/observers/:id/mappings', async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Admin only' });
        const mappings = await TaskObserverMapping.findAll({
            where: { observerId: req.params.id, orgAccountId: req.tenantOrgAccountId }
        });
        res.json({ success: true, assignedStaffIds: mappings.map(m => m.staffId) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: Save Observer Mappings
router.post('/observers/:id/mappings', async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Admin only' });
        const observerId = req.params.id;
        const { staffIds } = req.body; // Array of staff IDs

        await TaskObserverMapping.destroy({ where: { observerId, orgAccountId: req.tenantOrgAccountId } });
        if (staffIds && staffIds.length > 0) {
            await TaskObserverMapping.bulkCreate(staffIds.map(sid => ({
                observerId,
                staffId: sid,
                orgAccountId: req.tenantOrgAccountId
            })));
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
