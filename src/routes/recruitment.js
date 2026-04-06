const express = require('express');
const router = express.Router();
const { JobPosting, Candidate, Interview, User, StaffProfile } = require('../models');
const { authRequired, requireRole } = require('../middleware/auth');
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

// --- Job Posting Routes ---

// Get all jobs for current org
router.get('/jobs', authRequired, async (req, res) => {
    try {
        const jobs = await JobPosting.findAll({
            where: { orgAccountId: req.user.orgAccountId },
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create a new job
router.post('/jobs', authRequired, async (req, res) => {
    try {
        const job = await JobPosting.create({
            ...req.body,
            orgAccountId: req.user.orgAccountId,
            createdBy: req.user.id
        });
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update a job
router.put('/jobs/:id', authRequired, async (req, res) => {
    try {
        const job = await JobPosting.findOne({
            where: { id: req.params.id, orgAccountId: req.user.orgAccountId }
        });
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
        
        await job.update(req.body);
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- Candidate Routes ---

// Get all candidates for current org
router.get('/candidates', authRequired, async (req, res) => {
    try {
        const candidates = await Candidate.findAll({
            where: { orgAccountId: req.user.orgAccountId },
            include: [{ model: JobPosting, as: 'Job' }],
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, candidates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add a candidate (with resume)
router.post('/candidates', authRequired, upload.single('resume'), async (req, res) => {
    try {
        const candidateData = {
            ...req.body,
            orgAccountId: req.user.orgAccountId,
            resumeUrl: req.file ? `/uploads/resumes/${req.file.filename}` : null
        };
        const candidate = await Candidate.create(candidateData);
        res.json({ success: true, candidate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update candidate status
router.put('/candidates/:id/status', authRequired, async (req, res) => {
    try {
        const candidate = await Candidate.findOne({
            where: { id: req.params.id, orgAccountId: req.user.orgAccountId }
        });
        if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
        
        await candidate.update({ status: req.body.status });
        res.json({ success: true, candidate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- Interview Routes ---

// Get all interviews for current org
router.get('/interviews', authRequired, async (req, res) => {
    try {
        const interviews = await Interview.findAll({
            where: { orgAccountId: req.user.orgAccountId },
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
router.post('/interviews', authRequired, async (req, res) => {
    try {
        const interview = await Interview.create({
            ...req.body,
            orgAccountId: req.user.orgAccountId
        });
        res.json({ success: true, interview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
