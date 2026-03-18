const express = require('express');
const { Meeting, MeetingAttendee, User, StaffProfile, MeetingHistory } = require('../models');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');
const { sendMeetingInviteEmail } = require('../services/emailService');

const router = express.Router();

router.use(authRequired);
router.use(tenantEnforce);

function normalizeMeetLink(value) {
  const link = String(value || '').trim();
  if (!link) return '';
  return link.includes('://') ? link : `https://${link}`;
}

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
        },
        {
          model: User,
          as: 'closedBy',
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

// Update meeting details (creator only)
router.put('/:id', async (req, res) => {
  try {
    const meetingId = req.params.id;
    const { title, description, meetLink, scheduledAt, attendeeIds } = req.body || {};

    const meeting = await Meeting.findByPk(meetingId, {
      include: [{ model: MeetingAttendee, as: 'attendeeRecords' }]
    });

    if (!meeting || Number(meeting.orgAccountId) !== Number(req.tenantOrgAccountId)) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (Number(meeting.createdBy) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Only organizer can edit this meeting' });
    }

    if (meeting.isClosed) {
      return res.status(403).json({ success: false, message: 'Meeting is closed and cannot be edited' });
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (!scheduledAt) {
      return res.status(400).json({ success: false, message: 'Schedule time is required' });
    }

    meeting.title = String(title).trim();
    meeting.description = description == null ? null : String(description);
    meeting.meetLink = normalizeMeetLink(meetLink) || null;
    meeting.scheduledAt = scheduledAt;
    await meeting.save();

    if (Array.isArray(attendeeIds)) {
      const uniqueIds = [...new Set(attendeeIds.map(Number).filter(Boolean))]
        .filter(uid => uid !== req.user.id);

      await MeetingAttendee.destroy({ where: { meetingId: meeting.id } });

      for (const userId of uniqueIds) {
        await MeetingAttendee.create({
          meetingId: meeting.id,
          userId,
          status: 'PENDING',
        });
      }
    }

    await MeetingHistory.create({
      meetingId: meeting.id,
      updatedById: req.user.id,
      oldStatus: meeting.status,
      newStatus: meeting.status,
      remarks: 'Meeting details updated via app'
    });

    return res.json({ success: true, message: 'Meeting updated successfully' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to update meeting' });
  }
});

// Update meeting status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, remarks } = req.body || {};
    const meetingId = req.params.id;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const meeting = await Meeting.findByPk(meetingId, {
      include: [{ model: MeetingAttendee, as: 'attendeeRecords' }]
    });

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const isCreator = meeting.createdBy == req.user.id;
    const isAttendee = meeting.attendeeRecords?.some(a => a.userId == req.user.id);

    if (!isCreator && !isAttendee) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this meeting' });
    }

    if (meeting.isClosed) {
      return res.status(403).json({ success: false, message: 'Meeting is closed and cannot be updated' });
    }

    const oldStatus = meeting.status;
    meeting.status = status;
    if (remarks !== undefined) {
      meeting.remarks = remarks;
    }
    await meeting.save();

    await MeetingHistory.create({
      meetingId: meeting.id,
      updatedById: req.user.id,
      oldStatus,
      newStatus: status,
      remarks: remarks || 'Status updated via app'
    });

    return res.json({ success: true, message: 'Meeting status updated' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to update meeting status' });
  }
});

module.exports = router;
