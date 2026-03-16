const express = require('express');
const { Ticket, TicketHistory, User, StaffProfile } = require('../models');
const { Op } = require('sequelize');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');

const router = express.Router();

router.use(authRequired);
router.use(tenantEnforce);

// List tickets (both assigned to me and created by me)
router.get('/my', async (req, res) => {
    try {
        const tickets = await Ticket.findAll({
            where: {
                orgAccountId: req.tenantOrgAccountId,
                [Op.or]: [
                    { allocatedBy: req.user.id },
                    { allocatedTo: req.user.id }
                ]
            },
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
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                },
                {
                    model: User,
                    as: 'closedBy',
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
                }
            ],
            order: [['created_at', 'DESC']]
        });
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create ticket
router.post('/', async (req, res) => {
    try {
        const { allocatedTo, title, description, priority, dueDate } = req.body;
        const ticket = await Ticket.create({
            orgAccountId: req.tenantOrgAccountId,
            allocatedBy: req.user.id,
            allocatedTo,
            title,
            description,
            priority,
            dueDate,
            status: 'SCHEDULE',
            updatedBy: req.user.id // Initial creator is the first updater
        });
        res.status(201).json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update ticket status/remarks
router.patch('/:id/status', async (req, res) => {
    try {
        const { status, remarks } = req.body;
        const ticket = await Ticket.findOne({
            where: { id: req.params.id, orgAccountId: req.tenantOrgAccountId }
        });

        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        if (ticket.isClosed) {
            return res.status(403).json({ message: 'Ticket is closed by admin and cannot be modified' });
        }

        const oldStatus = ticket.status;
        await ticket.update({ status, remarks, updatedBy: req.user.id });

        await TicketHistory.create({
            ticketId: ticket.id,
            updatedById: req.user.id,
            oldStatus,
            newStatus: status || oldStatus,
            remarks
        });

        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get staff list for allocation
router.get('/staff', async (req, res) => {
    try {
        const staff = await User.findAll({
            where: {
                orgAccountId: req.tenantOrgAccountId,
                id: { [Op.ne]: req.user.id } // Exclude self
            },
            attributes: ['id'],
            include: [{
                model: StaffProfile,
                as: 'profile',
                attributes: ['name', 'department', 'designation']
            }]
        });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
