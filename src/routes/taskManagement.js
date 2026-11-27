const express = require('express');
const { Activity, Meeting, MeetingAttendee, Ticket, TicketHistory, ActivityHistory, MeetingHistory, User, StaffProfile, sequelize, TaskObserverMapping, ActivityTitle } = require('../models');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');
const { upload } = require('../upload');
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
            }, {
                model: User,
                as: 'allocatedBy',
                attributes: ['id'],
                include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
            }, {
                model: ActivityHistory,
                as: 'history',
                required: false,
                include: [{
                    model: User,
                    as: 'updater',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                }]
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, activities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Bulk Assign Activities across Months
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

router.post('/activities/bulk', async (req, res) => {
    try {
        const {
            userId,
            userIds,
            months, // e.g. ["2026-01", "2026-02"]
            excludeSundays = true,
            activities // array of { title, description, turnAroundTime, dayRule, jobType }
        } = req.body;

        const targetUserIds = Array.isArray(userIds) && userIds.length > 0 
            ? userIds 
            : (userId ? [Number(userId)] : []);

        if (targetUserIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one staff member.' });
        }

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

        // Generate all dates for the chosen months
        const allDates = [];
        months.forEach(m => {
            const start = dayjs(m + '-01');
            const daysInMonth = start.daysInMonth();
            for (let d = 1; d <= daysInMonth; d++) {
                const curDate = start.date(d);
                const dayOfWeek = curDate.day(); // 0 is Sunday, 6 is Saturday
                if (excludeSundays && dayOfWeek === 0) continue;
                allDates.push(curDate);
            }
        });

        const recordsToInsert = [];

        for (const targetUserId of targetUserIds) {
            for (const d of allDates) {
                const dateStr = d.format('YYYY-MM-DD');
                const dayOfWeek = d.day(); // 1 = Mon, ..., 6 = Sat

                for (const act of activities) {
                    const dayRule = act.dayRule || 'ALL_DAYS';
                    const jobType = act.jobType || 'ROUTINE';

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
                        jobType,
                        dayRule,
                        batchId,
                        allocatedById: req.user.id
                    });
                }
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
        console.error('[activities/bulk] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Details of a Monthly Routine Batch
router.get('/activities/batch/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const activities = await Activity.findAll({
            where: { batchId, orgAccountId: req.tenantOrgAccountId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id'],
                include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'department'] }]
            }],
            order: [['date', 'ASC']]
        });

        if (activities.length === 0) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        const userId = activities[0].userId;
        const user = activities[0].user;

        const monthsSet = new Set();
        activities.forEach(a => {
            if (a.date) {
                monthsSet.add(a.date.substring(0, 7));
            }
        });

        const templateMap = new Map();
        activities.forEach(a => {
            const key = `${a.title}||${a.dayRule}||${a.turnAroundTime || ''}`;
            if (!templateMap.has(key)) {
                let dayRuleType = a.dayRule || 'ALL_DAYS';
                let dayOfMonth = 1;
                if (String(a.dayRule).startsWith('DATE_')) {
                    dayRuleType = 'DATE_OF_MONTH';
                    dayOfMonth = parseInt(String(a.dayRule).replace('DATE_', ''), 10) || 1;
                }

                templateMap.set(key, {
                    id: String(a.id),
                    title: a.title,
                    description: a.description || '',
                    turnAroundTime: a.turnAroundTime || '',
                    dayRule: a.dayRule || 'ALL_DAYS',
                    dayRuleType,
                    dayOfMonth,
                    jobType: a.jobType || 'ROUTINE'
                });
            }
        });

        const templateActivities = Array.from(templateMap.values());
        const totalCount = activities.length;
        const doneCount = activities.filter(a => a.status === 'DONE').length;
        const scheduleCount = activities.filter(a => a.status === 'SCHEDULE').length;

        res.json({
            success: true,
            batch: {
                batchId,
                userId,
                user,
                months: Array.from(monthsSet),
                activities: templateActivities,
                totalCount,
                doneCount,
                scheduleCount
            }
        });
    } catch (error) {
        console.error('[activities/batch/:batchId GET] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update an Entire Monthly Routine Batch
router.put('/activities/batch/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const {
            userId,
            months,
            excludeSundays = true,
            activities
        } = req.body;

        if (!Array.isArray(months) || months.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one month.' });
        }
        if (!Array.isArray(activities) || activities.length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide at least one activity.' });
        }

        const existingBatch = await Activity.findAll({
            where: { batchId, orgAccountId: req.tenantOrgAccountId }
        });

        if (existingBatch.length === 0) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        const targetUserId = userId || existingBatch[0].userId;

        // Delete pending SCHEDULE activities of this batch
        const scheduledToDel = existingBatch.filter(a => a.status === 'SCHEDULE').map(a => a.id);
        if (scheduledToDel.length > 0) {
            await ActivityHistory.destroy({ where: { activityId: scheduledToDel } });
            await Activity.destroy({ where: { id: scheduledToDel } });
        }

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

        const preserved = await Activity.findAll({
            where: { batchId, orgAccountId: req.tenantOrgAccountId },
            attributes: ['date', 'title']
        });
        const preservedKeys = new Set(preserved.map(p => `${p.date}_${p.title}`));

        const recordsToInsert = [];
        for (const d of allDates) {
            const dateStr = d.format('YYYY-MM-DD');

            for (const act of activities) {
                const dayRule = act.dayRule || 'ALL_DAYS';
                const jobType = act.jobType || 'ROUTINE';

                if (!isDateMatchingDayRule(d, dayRule, excludeSundays)) continue;

                if (preservedKeys.has(`${dateStr}_${String(act.title).trim()}`)) {
                    continue;
                }

                recordsToInsert.push({
                    orgAccountId: req.tenantOrgAccountId,
                    userId: targetUserId,
                    title: String(act.title).trim(),
                    description: act.description ? String(act.description).trim() : null,
                    date: dateStr,
                    turnAroundTime: act.turnAroundTime || null,
                    turnAroundDate: dateStr,
                    status: 'SCHEDULE',
                    jobType,
                    dayRule,
                    batchId,
                    allocatedById: req.user.id
                });
            }
        }

        let newRecords = [];
        if (recordsToInsert.length > 0) {
            newRecords = await Activity.bulkCreate(recordsToInsert);
        }

        return res.json({
            success: true,
            message: `Monthly schedule updated successfully (${newRecords.length} activities scheduled).`,
            count: newRecords.length,
            batchId
        });
    } catch (error) {
        console.error('[activities/batch/:batchId PUT] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete an Entire Monthly Routine Batch
router.delete('/activities/batch/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const activities = await Activity.findAll({
            where: { batchId, orgAccountId: req.tenantOrgAccountId }
        });
        if (activities.length === 0) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }
        const ids = activities.map(a => a.id);
        await ActivityHistory.destroy({ where: { activityId: ids } });
        await Activity.destroy({ where: { id: ids } });

        return res.json({ success: true, message: 'Monthly schedule deleted successfully.' });
    } catch (error) {
        console.error('[activities/batch/:batchId DELETE] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


router.post('/activities', async (req, res) => {
    try {
        const { userId, title, description, date, turnAroundTime, turnAroundDate, jobType, dayRule } = req.body;
        
        if (!userId || !title || !date) {
            return res.status(400).json({ success: false, message: 'Staff, Title and Date are required' });
        }

        const activity = await Activity.create({
            orgAccountId: req.tenantOrgAccountId,
            userId,
            title,
            description,
            date,
            turnAroundTime,
            turnAroundDate,
            status: 'SCHEDULE',
            jobType: jobType || 'ROUTINE',
            dayRule: dayRule || 'ALL_DAYS',
            allocatedById: req.user.id
        });

        await ActivityHistory.create({
            activityId: activity.id,
            updatedById: req.user.id,
            oldStatus: 'NONE',
            newStatus: 'SCHEDULE',
            remarks: 'Activity assigned by admin/observer'
        });

        res.status(201).json({ success: true, activity });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: Update Activity
router.patch('/activities/:id', async (req, res) => {
    try {
        const { userId, title, description, date, turnAroundTime, turnAroundDate, jobType, dayRule } = req.body;
        const activity = await Activity.findOne({ where: { id: req.params.id, orgAccountId: req.tenantOrgAccountId } });
        if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });

        const oldStatus = activity.status;
        const updates = { userId, title, description, date, turnAroundTime, turnAroundDate };
        if (jobType) updates.jobType = jobType;
        if (dayRule) updates.dayRule = dayRule;
        await activity.update(updates);

        await ActivityHistory.create({
            activityId: activity.id,
            updatedById: req.user.id,
            oldStatus,
            newStatus: oldStatus,
            remarks: 'Activity details updated by admin/observer'
        });

        res.json({ success: true, activity });
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
                },
                {
                    model: MeetingHistory,
                    as: 'history',
                    required: false,
                    include: [{
                        model: User,
                        as: 'updater',
                        attributes: ['id'],
                        include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                    }]
                }
            ],
            order: [['scheduledAt', 'DESC']]
        });
        res.json({ success: true, meetings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: Create Meeting
router.post('/meetings', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { title, description, scheduledAt, attendees, meetLink } = req.body;
        
        if (!title || !scheduledAt || !meetLink) {
            return res.status(400).json({ success: false, message: 'Title, Scheduled Time and Meet Link are required' });
        }

        const meeting = await Meeting.create({
            orgAccountId: req.tenantOrgAccountId,
            createdBy: req.user.id,
            title,
            description,
            meetLink,
            scheduledAt,
            status: 'SCHEDULE'
        }, { transaction: t });

        if (attendees && Array.isArray(attendees)) {
            await MeetingAttendee.bulkCreate(attendees.map(userId => ({
                meetingId: meeting.id,
                userId,
                status: 'PENDING'
            })), { transaction: t });
        }

        await MeetingHistory.create({
            meetingId: meeting.id,
            updatedById: req.user.id,
            oldStatus: 'NONE',
            newStatus: 'SCHEDULE',
            remarks: 'Meeting scheduled by admin/observer'
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, meeting });
    } catch (error) {
        if (t) await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: Update Meeting
router.patch('/meetings/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { title, description, scheduledAt, attendees, meetLink } = req.body;
        const meeting = await Meeting.findOne({ where: { id: req.params.id, orgAccountId: req.tenantOrgAccountId } });
        if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

        const oldStatus = meeting.status;
        await meeting.update({ title, description, scheduledAt, meetLink }, { transaction: t });

        if (attendees && Array.isArray(attendees)) {
            // Simple sync: delete existing and recreat (or we could be more surgical)
            await MeetingAttendee.destroy({ where: { meetingId: meeting.id }, transaction: t });
            await MeetingAttendee.bulkCreate(attendees.map(userId => ({
                meetingId: meeting.id,
                userId,
                status: 'PENDING'
            })), { transaction: t });
        }

        await MeetingHistory.create({
            meetingId: meeting.id,
            updatedById: req.user.id,
            oldStatus,
            newStatus: oldStatus,
            remarks: 'Meeting details updated by admin/observer'
        }, { transaction: t });

        await t.commit();
        res.json({ success: true, meeting });
    } catch (error) {
        if (t) await t.rollback();
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
                },
                {
                    model: TicketHistory,
                    as: 'history',
                    required: false,
                    include: [{
                        model: User,
                        as: 'updater',
                        attributes: ['id'],
                        include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                    }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: Create Ticket
router.post('/tickets', upload.single('attachment'), async (req, res) => {
    try {
        const { allocatedTo, title, description, priority, dueDate, ticketId } = req.body;
        
        if (!allocatedTo || !title || !ticketId) {
            return res.status(400).json({ success: false, message: 'Assignee, Title and Ticket ID are required' });
        }

        const existing = await Ticket.findOne({ where: { ticketId, orgAccountId: req.tenantOrgAccountId } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Ticket ID must be unique' });
        }

        const ticketData = {
            orgAccountId: req.tenantOrgAccountId,
            allocatedBy: req.user.id,
            allocatedTo,
            title,
            ticketId,
            description,
            priority: priority || 'MEDIUM',
            dueDate,
            status: 'SCHEDULE',
            updatedBy: req.user.id
        };

        if (req.file) {
            ticketData.attachment = `/uploads/${req.file.filename}`;
        }

        const ticket = await Ticket.create(ticketData);

        await TicketHistory.create({
            ticketId: ticket.id,
            updatedById: req.user.id,
            oldStatus: 'NONE',
            newStatus: 'SCHEDULE',
            remarks: 'Ticket created by admin/observer'
        });

        res.status(201).json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: Search Ticket by Ticket ID string
router.get('/tickets/search/:ticketId', async (req, res) => {
    try {
        const ticket = await Ticket.findOne({
            where: {
                ticketId: req.params.ticketId,
                orgAccountId: req.tenantOrgAccountId
            }
        });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        res.json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin: Update Ticket
router.patch('/tickets/:id', upload.single('attachment'), async (req, res) => {
    try {
        const { allocatedTo, title, description, priority, dueDate, ticketId } = req.body;
        const ticket = await Ticket.findOne({ where: { id: req.params.id, orgAccountId: req.tenantOrgAccountId } });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        if (ticketId && ticketId !== ticket.ticketId) {
            const existing = await Ticket.findOne({ where: { ticketId, orgAccountId: req.tenantOrgAccountId } });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Ticket ID must be unique' });
            }
        }

        const updateData = { allocatedTo, title, description, priority, dueDate, ticketId, updatedBy: req.user.id };
        if (req.file) {
            updateData.attachment = `/uploads/${req.file.filename}`;
        }

        const oldStatus = ticket.status;
        await ticket.update(updateData);

        await TicketHistory.create({
            ticketId: ticket.id,
            updatedById: req.user.id,
            oldStatus,
            newStatus: oldStatus,
            remarks: 'Ticket details updated by admin/observer'
        });

        res.json({ success: true, ticket });
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


// Activity Titles Master Endpoints
router.get('/activity-titles', async (req, res) => {
    try {
        const titles = await ActivityTitle.findAll({
            where: { orgAccountId: req.tenantOrgAccountId },
            order: [['title', 'ASC']]
        });
        res.json({ success: true, titles });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/activity-titles', async (req, res) => {
    try {
        const { title, description, defaultTAT } = req.body;
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
            return res.json({ success: true, title: existing, message: 'Title already exists' });
        }
        const newTitle = await ActivityTitle.create({
            orgAccountId: req.tenantOrgAccountId,
            title: trimmedTitle,
            description: description || null,
            defaultTAT: defaultTAT || null,
            createdBy: req.user.id
        });
        res.json({ success: true, title: newTitle });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/activity-titles/:id', async (req, res) => {
    try {
        await ActivityTitle.destroy({
            where: {
                id: req.params.id,
                orgAccountId: req.tenantOrgAccountId
            }
        });
        res.json({ success: true, message: 'Title deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// Admin endpoint to download or view Activity & Task Performance Report PDF
router.get('/activities/report/pdf', async (req, res) => {
  try {
    const { startDate, endDate, status, jobType, userId } = req.query || {};
    const { generateActivityReportPDF } = require('../services/activityPdfService');

    let effectiveOrgId = req.tenantOrgAccountId;
    if (!effectiveOrgId && req.query.orgId) effectiveOrgId = Number(req.query.orgId);
    if (!effectiveOrgId && req.headers['x-org-id']) effectiveOrgId = Number(req.headers['x-org-id']);

    const result = await generateActivityReportPDF({
      orgAccountId: effectiveOrgId,
      userId: userId ? Number(userId) : null,
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
    console.error('Error generating admin activity PDF report:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate activity report PDF' });
  }
});

router.get('/meetings/report/pdf', async (req, res) => {
  try {
    const { startDate, endDate, status, search, userId } = req.query || {};
    const { generateMeetingsReportPDF } = require('../services/meetingTicketPdfService');

    let effectiveOrgId = req.tenantOrgAccountId;
    if (!effectiveOrgId && req.query.orgId) effectiveOrgId = Number(req.query.orgId);
    if (!effectiveOrgId && req.headers['x-org-id']) effectiveOrgId = Number(req.headers['x-org-id']);

    const result = await generateMeetingsReportPDF({
      orgAccountId: effectiveOrgId,
      userId: userId ? Number(userId) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || null,
      search: search || null
    });

    if (!result || !result.pdfBuffer) {
      return res.status(404).json({ success: false, message: 'Failed to generate meetings PDF' });
    }

    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const disposition = isDownload ? 'attachment' : 'inline';
    const filename = `Meetings_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Content-Length', result.pdfBuffer.length);
    return res.end(result.pdfBuffer);
  } catch (err) {
    console.error('Error generating admin meetings PDF report:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate meetings report PDF' });
  }
});

router.get('/tickets/report/pdf', async (req, res) => {
  try {
    const { startDate, endDate, status, priority, search, userId } = req.query || {};
    const { generateTicketsReportPDF } = require('../services/meetingTicketPdfService');

    let effectiveOrgId = req.tenantOrgAccountId;
    if (!effectiveOrgId && req.query.orgId) effectiveOrgId = Number(req.query.orgId);
    if (!effectiveOrgId && req.headers['x-org-id']) effectiveOrgId = Number(req.headers['x-org-id']);

    const result = await generateTicketsReportPDF({
      orgAccountId: effectiveOrgId,
      userId: userId ? Number(userId) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || null,
      priority: priority || null,
      search: search || null
    });

    if (!result || !result.pdfBuffer) {
      return res.status(404).json({ success: false, message: 'Failed to generate tickets PDF' });
    }

    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const disposition = isDownload ? 'attachment' : 'inline';
    const filename = `Tickets_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Content-Length', result.pdfBuffer.length);
    return res.end(result.pdfBuffer);
  } catch (err) {
    console.error('Error generating admin tickets PDF report:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate tickets report PDF' });
  }
});

module.exports = router;

