const express = require('express');
const { Meeting, MeetingAttendee, User, StaffProfile } = require('../models');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');
const { sendMeetingInviteEmail } = require('../services/emailService');

const router = express.Router();

router.use(authRequired);
router.use(tenantEnforce);

// Create meeting
router.post('/', async (req, res) => {
  try {
    const { title, description, meetLink, scheduledAt, attendeeIds } = req.body || {};
    if (!title || !scheduledAt) {
      return res.status(400).json({ success: false, message: 'Title and schedule time are required' });
    }

    const meeting = await Meeting.create({
      createdBy: req.user.id,
      orgAccountId: req.tenantOrgAccountId,
      title,
      description,
      meetLink,
      scheduledAt,
    });

    if (attendeeIds && Array.isArray(attendeeIds)) {
      for (const userId of attendeeIds) {
        await MeetingAttendee.create({
          meetingId: meeting.id,
          userId,
          status: 'PENDING',
        });

        // Send email/notification (Async)
        try {
          const attendee = await User.findByPk(userId, {
            include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'email'] }]
          });
          const organizer = await User.findByPk(req.user.id, {
            include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
          });

          if (attendee && attendee.profile && attendee.profile.email) {
             const email = attendee.profile.email;
             sendMeetingInviteEmail(
               email,
               attendee.profile.name || 'Staff',
               title,
               scheduledAt,
               meetLink,
               (organizer && organizer.profile && organizer.profile.name) || 'Organizer'
             );
          } else if (attendee && attendee.phone) {
             // Fallback to phone-based email if profile email missing
             const email = attendee.phone + "@thinktech.com";
             sendMeetingInviteEmail(
               email,
               (attendee.profile && attendee.profile.name) || 'Staff',
               title,
               scheduledAt,
               meetLink,
               (organizer && organizer.profile && organizer.profile.name) || 'Organizer'
             );
          }
        } catch (err) {

          console.error('Failed to send meeting email:', err);
        }
      }
    }

    return res.json({ success: true, meeting });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to create meeting' });
  }
});

// List my meetings (created or invited)
router.get('/me', async (req, res) => {
  try {
    const meetings = await Meeting.findAll({
      where: { orgAccountId: req.tenantOrgAccountId },
      include: [
        {
          model: MeetingAttendee,
          as: 'attendeeRecords',
          // We fetch all attendees to show them on the card
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id'],
              include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
            }
          ]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id'],
          include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
        }
      ],
      order: [['scheduledAt', 'ASC']],
    });

    // Filter: I created it OR I am in the list of attendees
    const myMeetings = meetings.filter(m => {
      const isCreator = m.createdBy == req.user.id;
      const isAttendee = m.attendeeRecords?.some(a => a.userId == req.user.id);
      return isCreator || isAttendee;
    });

    return res.json({ success: true, meetings: myMeetings });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to load meetings' });
  }
});

module.exports = router;
