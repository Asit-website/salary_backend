const express = require('express');
const router = express.Router();
const { StaffProfile, User } = require('../models');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');

router.use(authRequired);
router.use(tenantEnforce);

router.get('/', async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    if (!orgAccountId) {
      return res.status(403).json({ success: false, message: 'No organization in context' });
    }

    // Fetch all staff profiles under this org
    const staffProfiles = await StaffProfile.findAll({
      where: { orgAccountId },
      include: [
        {
          model: User,
          as: 'user',
          where: { active: true },
          required: true // only active users
        }
      ]
    });

    const birthdays = [];
    const anniversaries = [];

    staffProfiles.forEach(staff => {
      // Birthday (dob)
      if (staff.dob) {
        const parts = staff.dob.split('-');
        if (parts.length === 3) {
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);
          const year = parseInt(parts[0], 10);
          birthdays.push({
            id: staff.id,
            userId: staff.userId,
            staffId: staff.staffId,
            name: staff.name,
            designation: staff.designation,
            department: staff.department,
            photoUrl: staff.photoUrl,
            dob: staff.dob,
            phone: staff.phone || staff.personalMobile || '',
            year,
            month,
            day
          });
        }
      }

      // Anniversary (dateOfJoining)
      if (staff.dateOfJoining) {
        const parts = staff.dateOfJoining.split('-');
        if (parts.length === 3) {
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);
          const year = parseInt(parts[0], 10);
          anniversaries.push({
            id: staff.id,
            userId: staff.userId,
            staffId: staff.staffId,
            name: staff.name,
            designation: staff.designation,
            department: staff.department,
            photoUrl: staff.photoUrl,
            dateOfJoining: staff.dateOfJoining,
            phone: staff.phone || staff.personalMobile || '',
            year,
            month,
            day
          });
        }
      }
    });

    // Sort function: chronological by month then day
    const chronologicalSort = (a, b) => {
      if (a.month !== b.month) {
        return a.month - b.month;
      }
      return a.day - b.day;
    };

    birthdays.sort(chronologicalSort);
    anniversaries.sort(chronologicalSort);

    res.json({
      success: true,
      birthdays,
      anniversaries
    });
  } catch (err) {
    console.error('Error fetching wishes:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
