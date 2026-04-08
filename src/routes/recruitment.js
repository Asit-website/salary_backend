const express = require('express');
const router = express.Router();
const { JobPosting, Candidate, Interview, User, StaffProfile } = require('../models');
const { authRequired, requireRole } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure resumes directory exists
const resumeDir = path.join(__dirname, '../../uploads/resumes');
if (!fs.existsSync(resumeDir)) {
    fs.mkdirSync(resumeDir, { recursive: true });
}

// Multer config for resumes
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, resumeDir),
    filename: (req, file, cb) => cb(null, `resume-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.use(authRequired);
router.use(tenantEnforce);

// --- Job Posting Routes ---

// Get all jobs for current org
router.get('/jobs', async (req, res) => {
    try {
        const jobs = await JobPosting.findAll({
            where: { orgAccountId: req.tenantOrgAccountId },
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create a new job
router.post('/jobs', async (req, res) => {
    try {
        const job = await JobPosting.create({
            ...req.body,
            orgAccountId: req.tenantOrgAccountId,
            createdBy: req.user.id
        });
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update a job
router.put('/jobs/:id', async (req, res) => {
    try {
        const job = await JobPosting.findOne({
            where: { id: req.params.id, orgAccountId: req.tenantOrgAccountId }
        });
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
        
        await job.update(req.body);
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- Candidate Routes ---

// Get all candidates for current org with stats
router.get('/candidates', async (req, res) => {
    try {
        const candidates = await Candidate.findAll({
            where: { orgAccountId: req.tenantOrgAccountId },
            include: [{ model: JobPosting, as: 'Job' }],
            order: [['createdAt', 'DESC']]
        });

        // Calculate stats
        const stats = {
            total: candidates.length,
            applied: 0, screening: 0, interview: 0, offered: 0, selected: 0, rejected: 0, hired: 0
        };
        candidates.forEach(c => {
            const s = c.status.toLowerCase();
            if (stats[s] !== undefined) stats[s]++;
        });

        // Funnel data for charts
        const funnel = [
            { stage: 'Applied', count: stats.applied },
            { stage: 'Screening', count: stats.screening },
            { stage: 'Interview', count: stats.interview },
            { stage: 'Offered', count: stats.offered },
            { stage: 'Hired', count: stats.hired }
        ];

        // NEW: Get actual scheduled interviews count for the dashboard
        const scheduledInterviews = await Interview.count({
            where: { 
                orgAccountId: req.tenantOrgAccountId,
                status: 'SCHEDULED'
            }
        });
        stats.interview = scheduledInterviews; // Overwrite the candidate-status based count with actual scheduled count

        res.json({ success: true, candidates, stats, funnel });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add a candidate (with resume)
router.post('/candidates', upload.single('resume'), async (req, res) => {
    try {
        console.log('--- Candidate Upload Debug ---');
        console.log('File:', req.file);
        console.log('Body:', req.body);
        
        const candidateData = {
            ...req.body,
            orgAccountId: req.tenantOrgAccountId,
            rating: req.body.rating || 0,
            source: req.body.source || 'Direct',
            resumeUrl: req.file ? `/uploads/resumes/${req.file.filename}` : null
        };
        const candidate = await Candidate.create(candidateData);
        res.json({ success: true, candidate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update candidate (including optional resume update)
router.put('/candidates/:id', upload.single('resume'), async (req, res) => {
    try {
        const candidate = await Candidate.findOne({
            where: { id: req.params.id, orgAccountId: req.tenantOrgAccountId }
        });
        if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
        
        const updateData = {
            ...req.body,
            resumeUrl: req.file ? `/uploads/resumes/${req.file.filename}` : candidate.resumeUrl
        };
        
        await candidate.update(updateData);
        res.json({ success: true, candidate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- Interview Routes ---

// Get all interviews for current org
router.get('/interviews', async (req, res) => {
    try {
        const interviews = await Interview.findAll({
            where: { orgAccountId: req.tenantOrgAccountId },
            include: [
                { model: Candidate, as: 'Candidate' },
                { 
                    model: User, 
                    as: 'Interviewer', 
                    attributes: ['id'],
                    include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'email'] }]
                }
            ],
            order: [['scheduledAt', 'ASC']]
        });
        res.json({ success: true, interviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Schedule an interview
router.post('/interviews', async (req, res) => {
    try {
        const interview = await Interview.create({
            ...req.body,
            orgAccountId: req.tenantOrgAccountId,
            roundName: req.body.roundName || 'Initial Round'
        });
        res.json({ success: true, interview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update an interview (status, score, feedback, etc.)
router.put('/interviews/:id', async (req, res) => {
    try {
        const interview = await Interview.findOne({
            where: { id: req.params.id, orgAccountId: req.tenantOrgAccountId }
        });
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
        
        await interview.update(req.body);
        res.json({ success: true, interview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
