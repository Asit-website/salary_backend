const express = require('express');
const { LetterTemplate, StaffLetter, StaffProfile, User, sequelize } = require('../models');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');
const router = express.Router();

// One-liner org guard
function requireOrg(req, res) {
    const orgId = req.tenantOrgAccountId || null;
    if (!orgId) {
        res.status(403).json({ success: false, message: 'No organization in context' });
        return null;
    }
    return orgId;
}

// Helper to replace placeholders
function replacePlaceholders(template, data) {
    let content = template;
    const placeholders = {
        name: data.name || '',
        staffId: data.staffId || '',
        email: data.email || '',
        phone: data.phone || '',
        designation: data.designation || '',
        department: data.department || '',
        dateOfJoining: data.dateOfJoining || '',
        city: data.city || '',
        state: data.state || '',
        currentDate: new Date().toLocaleDateString(),
    };

    for (const key in placeholders) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, placeholders[key]);
    }
    return content;
}

// Routes
router.use(authRequired);
router.use(tenantEnforce);

// Templates CRUD
router.get('/templates', async (req, res) => {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    try {
        const templates = await LetterTemplate.findAll({
            where: { orgAccountId: orgId, active: true },
            order: [['id', 'DESC']]
        });
        res.json({ success: true, templates });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.post('/templates', async (req, res) => {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: 'Title and content are required' });

    try {
        const template = await LetterTemplate.create({
            title,
            content,
            orgAccountId: orgId
        });
        res.json({ success: true, template });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.put('/templates/:id', async (req, res) => {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { title, content } = req.body;
    try {
        const template = await LetterTemplate.findOne({ where: { id: req.params.id, orgAccountId: orgId } });
        if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

        if (title) template.title = title;
        if (content) template.content = content;

        await template.save();
        res.json({ success: true, template });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.delete('/templates/:id', async (req, res) => {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    try {
        const template = await LetterTemplate.findOne({ where: { id: req.params.id, orgAccountId: orgId } });
        if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

        template.active = false;
        await template.save();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Issuance
router.post('/issue', async (req, res) => {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { staffUserId, templateId, customContent, title } = req.body;
    if (!staffUserId) return res.status(400).json({ success: false, message: 'Staff user ID is required' });

    try {
        // Search by userId and verify via User association since some profiles might have null orgAccountId
        const staff = await StaffProfile.findOne({
            where: { userId: staffUserId },
            include: [{
                model: User,
                as: 'user',
                where: { orgAccountId: orgId }
            }]
        });

        if (!staff) return res.status(404).json({ success: false, message: 'Staff profile not found' });

        let finalContent = customContent;
        let finalTitle = title;

        if (templateId) {
            const template = await LetterTemplate.findOne({ where: { id: templateId, orgAccountId: orgId } });
            if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

            finalContent = replacePlaceholders(template.content, staff);
            finalTitle = finalTitle || template.title;
        }

        if (!finalContent) return res.status(400).json({ success: false, message: 'Content is required' });

        const issuedLetter = await StaffLetter.create({
            staffId: staffUserId,
            letterTemplateId: templateId || null,
            title: finalTitle || 'Untitled Letter',
            content: finalContent,
            issuedBy: req.user.id,
            orgAccountId: orgId
        });

        res.json({ success: true, issuedLetter });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/issued', async (req, res) => {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    try {
        const letters = await StaffLetter.findAll({
            where: { orgAccountId: orgId },
            include: [
                {
                    model: User,
                    as: 'staffMember',
                    attributes: ['id', 'phone'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['staffId', 'name'] }]
                },
                { model: User, as: 'issuer', attributes: ['id'], include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }] },
                { model: LetterTemplate, as: 'template', attributes: ['title'] }
            ],
            order: [['id', 'DESC']]
        });
        res.json({ success: true, letters });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/issued/:id', async (req, res) => {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    try {
        const letter = await StaffLetter.findOne({
            where: { id: req.params.id, orgAccountId: orgId },
            include: [
                { model: User, as: 'staffMember', attributes: ['id', 'phone'], include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'staffId'] }] },
                { model: User, as: 'issuer', attributes: ['id'], include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }] }
            ]
        });
        if (!letter) return res.status(404).json({ success: false, message: 'Letter not found' });
        res.json({ success: true, letter });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
