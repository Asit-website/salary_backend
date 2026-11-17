const express = require('express');
const { Op } = require('sequelize');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { tenantEnforce } = require('../middleware/tenant');
const {
  User,
  StaffProfile,
  Attendance,
  AttendancePunch,
  TeamAssignment,
  ShiftTemplate,
  StaffShiftAssignment,
  OrgAccount,
  AttendanceRegularization,
  LatePunchApproval,
  SalaryTemplate
} = require('../models');

const router = express.Router();

router.use(authRequired);
router.use(tenantEnforce);

function requireOrg(req, res) {
  const orgId = req.orgAccountId || (req.user && req.user.orgAccountId);
  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organization account required' });
    return null;
  }
  return Number(orgId);
}

function toIsoDateOnly(d) {
  if (!d) return null;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
    return d.trim();
  }
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

// =========================================================================
// ADMIN ENDPOINTS: Manage Team Leaders & Staff Assignments
// =========================================================================

// 1. GET /admin/team-leaders - List all team leaders with assigned staff
router.get('/admin/team-leaders', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const assignments = await TeamAssignment.findAll({
      where: { orgAccountId: orgId, isActive: true },
      include: [
        {
          model: User,
          as: 'leader',
          attributes: ['id', 'phone', 'role', 'active'],
          include: [
            {
              model: StaffProfile,
              as: 'profile',
              attributes: ['name', 'email', 'phone', 'staffId', 'designation', 'department', 'photoUrl']
            }
          ]
        },
        {
          model: User,
          as: 'member',
          attributes: ['id', 'phone', 'role', 'active'],
          include: [
            {
              model: StaffProfile,
              as: 'profile',
              attributes: ['name', 'email', 'phone', 'staffId', 'designation', 'department', 'photoUrl']
            }
          ]
        }
      ]
    });

    const leaderMap = new Map();
    for (const a of assignments) {
      if (!a.leader) continue;
      const lId = a.leaderUserId;
      if (!leaderMap.has(lId)) {
        leaderMap.set(lId, {
          leaderUserId: lId,
          leaderName: a.leader.profile?.name || `Staff #${lId}`,
          leaderStaffId: a.leader.profile?.staffId || '',
          leaderEmail: a.leader.profile?.email || '',
          leaderPhone: a.leader.profile?.phone || a.leader.phone || '',
          designation: a.leader.profile?.designation || '',
          department: a.leader.profile?.department || '',
          teamName: a.teamName || '',
          members: []
        });
      }
      const entry = leaderMap.get(lId);
      if (a.teamName && !entry.teamName) entry.teamName = a.teamName;
      if (a.member) {
        entry.members.push({
          id: a.member.id,
          name: a.member.profile?.name || `Staff #${a.member.id}`,
          staffId: a.member.profile?.staffId || '',
          email: a.member.profile?.email || '',
          phone: a.member.profile?.phone || a.member.phone || '',
          designation: a.member.profile?.designation || '',
          department: a.member.profile?.department || ''
        });
      }
    }

    const teamLeaders = Array.from(leaderMap.values()).map(tl => ({
      ...tl,
      memberCount: tl.members.length
    }));

    return res.json({ success: true, teamLeaders });
  } catch (error) {
    console.error('[TeamLeaderAdmin] GET error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. POST /admin/team-leaders - Create / Assign Team Leader and members
router.post('/admin/team-leaders', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { leaderUserId, memberUserIds, teamName } = req.body || {};
    const lId = Number(leaderUserId);
    if (!lId) {
      return res.status(400).json({ success: false, message: 'leaderUserId is required' });
    }

    const leader = await User.findOne({ where: { id: lId, orgAccountId: orgId } });
    if (!leader) {
      return res.status(404).json({ success: false, message: 'Leader staff not found in this organization' });
    }

    const members = Array.isArray(memberUserIds) ? memberUserIds.map(Number).filter(id => id && id !== lId) : [];

    await TeamAssignment.destroy({
      where: { orgAccountId: orgId, leaderUserId: lId }
    });

    if (members.length > 0) {
      const records = members.map(mId => ({
        orgAccountId: orgId,
        leaderUserId: lId,
        memberUserId: mId,
        teamName: teamName ? String(teamName).trim() : null,
        isActive: true
      }));
      await TeamAssignment.bulkCreate(records);
    } else if (teamName) {
      await TeamAssignment.create({
        orgAccountId: orgId,
        leaderUserId: lId,
        memberUserId: lId,
        teamName: String(teamName).trim(),
        isActive: false
      });
    }

    return res.json({
      success: true,
      message: 'Team Leader and staff assignments saved successfully',
      assignedCount: members.length
    });
  } catch (error) {
    console.error('[TeamLeaderAdmin] POST error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. PUT /admin/team-leaders/:leaderUserId - Update members
router.put('/admin/team-leaders/:leaderUserId', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const lId = Number(req.params.leaderUserId);
    if (!lId) return res.status(400).json({ success: false, message: 'Invalid leaderUserId' });

    const { memberUserIds, teamName } = req.body || {};
    const members = Array.isArray(memberUserIds) ? memberUserIds.map(Number).filter(id => id && id !== lId) : [];

    await TeamAssignment.destroy({
      where: { orgAccountId: orgId, leaderUserId: lId }
    });

    if (members.length > 0) {
      const records = members.map(mId => ({
        orgAccountId: orgId,
        leaderUserId: lId,
        memberUserId: mId,
        teamName: teamName ? String(teamName).trim() : null,
        isActive: true
      }));
      await TeamAssignment.bulkCreate(records);
    }

    return res.json({
      success: true,
      message: 'Team assignments updated successfully',
      assignedCount: members.length
    });
  } catch (error) {
    console.error('[TeamLeaderAdmin] PUT error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. DELETE /admin/team-leaders/:leaderUserId - Remove Team Leader
router.delete('/admin/team-leaders/:leaderUserId', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const lId = Number(req.params.leaderUserId);
    await TeamAssignment.destroy({
      where: { orgAccountId: orgId, leaderUserId: lId }
    });

    return res.json({ success: true, message: 'Team Leader removed successfully' });
  } catch (error) {
    console.error('[TeamLeaderAdmin] DELETE error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// TEAM LEADER / STAFF ENDPOINTS: Scoped to logged-in Team Leader
// =========================================================================

async function getAssignedMemberIds(userId, orgId) {
  const assignments = await TeamAssignment.findAll({
    where: {
      leaderUserId: userId,
      orgAccountId: orgId,
      isActive: true,
      memberUserId: { [Op.ne]: userId }
    },
    attributes: ['memberUserId', 'teamName']
  });

  const memberIds = assignments.map(a => Number(a.memberUserId));
  const teamName = assignments.length > 0 ? (assignments[0].teamName || 'My Team') : '';
  return { memberIds, teamName };
}

// 5. GET /staff/team/status - Check if logged-in user is a Team Leader
router.get('/staff/team/status', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { memberIds, teamName } = await getAssignedMemberIds(req.user.id, orgId);
    const isTeamLeader = memberIds.length > 0;

    return res.json({
      success: true,
      isTeamLeader,
      memberCount: memberIds.length,
      teamName: isTeamLeader ? teamName : null
    });
  } catch (error) {
    console.error('[TeamLeaderStaff] Status error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5B. GET /staff/team/dashboard - Dashboard KPI stats for Team Leader
router.get('/staff/team/dashboard', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { memberIds, teamName } = await getAssignedMemberIds(req.user.id, orgId);
    if (memberIds.length === 0) {
      return res.json({
        success: true,
        teamName: '',
        stats: {
          totalAssigned: 0,
          presentToday: 0,
          absentToday: 0,
          onLeaveToday: 0
        }
      });
    }

    const todayStr = toIsoDateOnly(new Date());
    const totalAssigned = memberIds.length;

    const todayAttendance = await Attendance.findAll({
      where: {
        orgAccountId: orgId,
        userId: { [Op.in]: memberIds },
        date: todayStr
      }
    });

    const { LeaveRequest } = require('../models');
    let todayLeaves = [];
    try {
      todayLeaves = await LeaveRequest.findAll({
        where: {
          userId: { [Op.in]: memberIds },
          status: { [Op.in]: ['APPROVED', 'approved'] },
          startDate: { [Op.lte]: todayStr },
          endDate: { [Op.gte]: todayStr }
        }
      });
    } catch (_) {}

    const onLeaveUserIds = new Set(todayLeaves.map(l => Number(l.userId)));

    let presentToday = 0;
    let absentToday = 0;
    const markedUserIds = new Set();

    todayAttendance.forEach(att => {
      markedUserIds.add(Number(att.userId));
      const s = String(att.status || '').toLowerCase();
      if (['present', 'overtime', 'half_day'].includes(s)) {
        presentToday += 1;
      } else if (['leave', 'on_leave'].includes(s)) {
        onLeaveUserIds.add(Number(att.userId));
      } else if (['absent'].includes(s)) {
        absentToday += 1;
      }
    });

    const onLeaveToday = onLeaveUserIds.size;

    memberIds.forEach(mId => {
      if (!markedUserIds.has(mId) && !onLeaveUserIds.has(mId)) {
        absentToday += 1;
      }
    });

    return res.json({
      success: true,
      teamName,
      stats: {
        totalAssigned,
        presentToday,
        absentToday,
        onLeaveToday
      }
    });
  } catch (error) {
    console.error('[TeamLeaderStaff] Dashboard stats error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 6. GET /staff/team/members - List assigned staff members with search
router.get('/staff/team/members', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { memberIds, teamName } = await getAssignedMemberIds(req.user.id, orgId);
    if (memberIds.length === 0) {
      return res.json({ success: true, members: [], teamName: '' });
    }

    const { search } = req.query || {};
    const whereUser = {
      id: { [Op.in]: memberIds },
      orgAccountId: orgId
    };

    const profileInclude = {
      model: StaffProfile,
      as: 'profile',
      attributes: [
        'name',
        'email',
        'phone',
        'staffId',
        'designation',
        'department',
        'workLocation',
        'dateOfJoining',
        'photoUrl',
        'staffType',
        'shiftSelection'
      ]
    };

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      profileInclude.where = {
        [Op.or]: [
          { name: { [Op.like]: q } },
          { email: { [Op.like]: q } },
          { phone: { [Op.like]: q } },
          { staffId: { [Op.like]: q } }
        ]
      };
      profileInclude.required = true;
    }

    const members = await User.findAll({
      where: whereUser,
      attributes: ['id', 'phone', 'role', 'active', 'createdAt'],
      include: [profileInclude]
    });

    const todayStr = toIsoDateOnly(new Date());
    const todayAttendance = await Attendance.findAll({
      where: {
        orgAccountId: orgId,
        userId: { [Op.in]: memberIds },
        date: todayStr
      }
    });
    const attMap = new Map();
    todayAttendance.forEach(att => attMap.set(Number(att.userId), att));

    const formattedMembers = members.map(m => {
      const att = attMap.get(m.id);
      return {
        id: m.id,
        name: m.profile?.name || `Staff #${m.id}`,
        email: m.profile?.email || '',
        phone: m.profile?.phone || m.phone || '',
        staffId: m.profile?.staffId || '',
        active: m.active !== false,
        designation: m.profile?.designation || '',
        department: m.profile?.department || '',
        branch: m.profile?.workLocation || '',
        joiningDate: m.profile?.dateOfJoining || null,
        avatar: m.profile?.photoUrl || null,
        photoUrl: m.profile?.photoUrl || null,
        workType: m.profile?.staffType || '',
        todayAttendance: att ? {
          status: att.status,
          punchedInAt: att.punchedInAt,
          punchedOutAt: att.punchedOutAt,
          totalWorkHours: att.totalWorkHours || 0
        } : null
      };
    });

    return res.json({
      success: true,
      members: formattedMembers,
      teamName,
      totalCount: formattedMembers.length
    });
  } catch (error) {
    console.error('[TeamLeaderStaff] Members error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 7. GET /staff/team/members/:userId/profile - Full profile (exact same view as Admin)
router.get('/staff/team/members/:userId/profile', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const targetUserId = Number(req.params.userId);
    const { memberIds } = await getAssignedMemberIds(req.user.id, orgId);

    if (!memberIds.includes(targetUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This staff member is not in your assigned team.'
      });
    }

    const user = await User.findOne({
      where: { id: targetUserId, orgAccountId: orgId },
      include: [
        { model: StaffProfile, as: 'profile' },
        { model: SalaryTemplate, as: 'salaryTemplate', attributes: ['id', 'name'] }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    let shiftName = null;
    const todayStr = toIsoDateOnly(new Date());
    const shiftAsg = await StaffShiftAssignment.findOne({
      where: {
        userId: targetUserId,
        effectiveFrom: { [Op.lte]: todayStr },
        [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: todayStr } }]
      },
      include: [{ model: ShiftTemplate, as: 'template', attributes: ['id', 'name'] }],
      order: [['effectiveFrom', 'DESC']]
    });

    if (shiftAsg && shiftAsg.template) {
      shiftName = shiftAsg.template.name;
    } else if (user.profile?.shiftTiming || user.profile?.shiftSelection) {
      shiftName = user.profile.shiftTiming || user.profile.shiftSelection;
    }

    const p = user.profile || {};
    return res.json({
      success: true,
      staff: {
        id: user.id,
        name: p.name || `Staff #${user.id}`,
        staffId: p.staffId || '',
        avatar: p.photoUrl || null,
        photoUrl: p.photoUrl || null,
        designation: p.designation || '-',
        staffType: p.staffType || p.employmentType || '-',
        contactNumber: p.phone || user.phone || '-',
        dateOfJoining: p.dateOfJoining || '-',
        department: p.department || '-',
        salaryCycleDate: p.salaryCycleDate || '-',
        shift: shiftName || '-',
        salaryTemplate: user.salaryTemplate?.name || '-',
        email: p.email || '-',
        gender: p.gender || '-',
        dob: p.dob || '-',
        maritalStatus: p.maritalStatus || '-',
        bloodGroup: p.bloodGroup || '-',
        emergencyContact: p.emergencyContact || p.emergencyContactName || '-',
        currentAddress: [p.addressLine1, p.addressLine2, p.city, p.state, p.postalCode].filter(Boolean).join(', ') || p.currentAddress || '-',
        bankName: p.bankName || '-',
        bankBranch: p.bankBranch || '-',
        bankIfsc: p.bankIfsc || '-',
        bankAccountNumber: p.bankAccountNumber || '-',
        bankAccountHolderName: p.bankAccountHolderName || '-',
        upiId: p.upiId || '-',
        active: user.active !== false
      }
    });
  } catch (error) {
    console.error('[TeamLeaderStaff] Profile error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 8. GET /staff/team/attendance - Attendance list of assigned team members (VIEW ONLY)
router.get('/staff/team/attendance', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { memberIds } = await getAssignedMemberIds(req.user.id, orgId);
    if (memberIds.length === 0) {
      return res.json({ success: true, attendance: [] });
    }

    const { date, month, staffId } = req.query || {};
    let startDate, endDate;

    if (month && /^\d{4}-\d{2}$/.test(String(month).trim())) {
      const monthStr = String(month).trim();
      const parts = monthStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      startDate = `${monthStr}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
    } else {
      const dateStr = toIsoDateOnly(date || new Date());
      startDate = dateStr;
      endDate = dateStr;
    }

    let targetIds = memberIds;
    if (staffId && Number(staffId)) {
      const sId = Number(staffId);
      if (memberIds.includes(sId)) {
        targetIds = [sId];
      } else {
        return res.status(403).json({ success: false, message: 'Target staff is not in your team' });
      }
    }

    const records = await Attendance.findAll({
      where: {
        orgAccountId: orgId,
        userId: { [Op.in]: targetIds },
        date: { [Op.between]: [startDate, endDate] }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'phone'],
          include: [
            {
              model: StaffProfile,
              as: 'profile',
              attributes: ['name', 'staffId', 'phone', 'designation', 'department', 'photoUrl']
            }
          ]
        }
      ],
      order: [['date', 'DESC'], ['userId', 'ASC']]
    });

    const toTime = (iso) => {
      if (!iso) return null;
      try {
        let str = String(iso).trim();
        if (str.includes("24:")) {
          str = str.replace(/24:(\d{2})/, "00:$1");
        }
        const dt = new Date(str);
        if (!isNaN(dt.getTime())) {
          const hh = String(dt.getHours()).padStart(2, '0');
          const mm = String(dt.getMinutes()).padStart(2, '0');
          return `${hh}:${mm}`;
        }
        const match = str.match(/(\d{1,2}):(\d{2})/);
        if (match) {
          return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
        }
        return null;
      } catch (_) {
        return null;
      }
    };

    const formatted = records.map(r => {
      const lateMins = (r.latePunchInMinutes !== null && r.latePunchInMinutes !== undefined)
        ? Number(r.latePunchInMinutes)
        : Number(r.lateMinutes || 0);

      return {
        id: r.id,
        userId: r.userId,
        name: r.user?.profile?.name || `Staff #${r.userId}`,
        staffId: r.user?.profile?.staffId || '',
        designation: r.user?.profile?.designation || '',
        department: r.user?.profile?.department || '',
        avatar: r.user?.profile?.photoUrl || null,
        photoUrl: r.user?.profile?.photoUrl || null,
        date: r.date,
        status: r.status,
        checkIn: toTime(r.punchedInAt) || (r.checkIn ? String(r.checkIn).slice(0, 5) : null),
        checkOut: toTime(r.punchedOutAt) || (r.checkOut ? String(r.checkOut).slice(0, 5) : null),
        punchedInAt: r.punchedInAt,
        punchedOutAt: r.punchedOutAt,
        totalWorkHours: r.totalWorkHours || 0,
        overtimeMinutes: r.overtimeMinutes || 0,
        breakTotalSeconds: r.breakTotalSeconds || 0,
        lateMinutes: lateMins,
        latePunchInMinutes: lateMins,
        isLate: Boolean(r.isLate || lateMins > 0),
        earlyExitMinutes: Number(r.earlyExitMinutes || 0),
        latitude: r.latitude || null,
        longitude: r.longitude || null,
        punchOutLatitude: r.punchOutLatitude || null,
        punchOutLongitude: r.punchOutLongitude || null,
        source: r.source,
        remarks: r.remarks || ''
      };
    });

    return res.json({ success: true, attendance: formatted });
  } catch (error) {
    console.error('[TeamLeaderStaff] Attendance error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// ATTENDANCE REGULARIZATION: Scoped to Team Leader's Assigned Members
// =========================================================================

// 9. GET /staff/team/regularizations - List team members' regularization requests
router.get('/staff/team/regularizations', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { memberIds } = await getAssignedMemberIds(req.user.id, orgId);
    if (memberIds.length === 0) {
      return res.json({ success: true, regularizations: [] });
    }

    const { status, month } = req.query || {};
    const where = {
      orgAccountId: orgId,
      userId: { [Op.in]: memberIds }
    };
    if (status && status !== 'ALL') where.status = status;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      where.date = { [Op.between]: [`${month}-01`, `${month}-31`] };
    }

    const list = await AttendanceRegularization.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'phone', 'role'],
          include: [
            {
              model: StaffProfile,
              as: 'profile',
              attributes: ['name', 'staffId', 'department', 'designation']
            }
          ]
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    return res.json({ success: true, regularizations: list });
  } catch (err) {
    console.error('[TeamLeaderStaff] Regularization list error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list regularization requests' });
  }
});

// 10. PATCH /staff/team/regularization/:id - Approve / Reject regularization
router.patch('/staff/team/regularization/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { id } = req.params;
    const { status, adminRemarks } = req.body || {};
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be APPROVED or REJECTED' });
    }

    const { memberIds } = await getAssignedMemberIds(req.user.id, orgId);
    const reg = await AttendanceRegularization.findOne({
      where: { id, orgAccountId: orgId }
    });

    if (!reg) {
      return res.status(404).json({ success: false, message: 'Regularization request not found' });
    }

    if (!memberIds.includes(Number(reg.userId))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only review requests for your assigned team members.'
      });
    }

    await reg.update({
      status,
      adminRemarks: adminRemarks || `Reviewed by Team Leader (${req.user.name || req.user.id})`,
      reviewedBy: req.user.id,
      reviewedAt: new Date()
    });

    if (status === 'APPROVED') {
      let att = await Attendance.findOne({
        where: { userId: reg.userId, date: reg.date, orgAccountId: orgId }
      });

      const inDateTime = reg.requestedInTime ? new Date(`${reg.date}T${reg.requestedInTime}`) : null;
      const outDateTime = reg.requestedOutTime ? new Date(`${reg.date}T${reg.requestedOutTime}`) : null;
      let totalWorkHours = null;
      if (inDateTime && outDateTime) {
        totalWorkHours = Number((Math.max(0, (outDateTime - inDateTime) / (1000 * 3600))).toFixed(2));
      }

      if (att) {
        await att.update({
          status: 'PRESENT',
          punchedInAt: inDateTime || att.punchedInAt,
          punchedOutAt: outDateTime || att.punchedOutAt,
          totalWorkHours: totalWorkHours !== null ? totalWorkHours : att.totalWorkHours,
          source: 'manual',
          remarks: `Regularization approved by Team Leader (${req.user.name || req.user.id})`
        });
      } else {
        await Attendance.create({
          userId: reg.userId,
          date: reg.date,
          orgAccountId: orgId,
          status: 'PRESENT',
          punchedInAt: inDateTime,
          punchedOutAt: outDateTime,
          totalWorkHours: totalWorkHours || 0,
          source: 'manual',
          remarks: `Regularization approved by Team Leader (${req.user.name || req.user.id})`
        });
      }
    }

    return res.json({
      success: true,
      message: `Regularization request ${status.toLowerCase()} successfully`,
      regularization: reg
    });
  } catch (err) {
    console.error('[TeamLeaderStaff] Regularization review error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update regularization' });
  }
});

// =========================================================================
// LATE PUNCH APPROVAL: Scoped to Team Leader's Assigned Members
// =========================================================================

// 11. GET /staff/team/late-approvals - List team members' late punch approval requests
router.get('/staff/team/late-approvals', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { memberIds } = await getAssignedMemberIds(req.user.id, orgId);
    if (memberIds.length === 0) {
      return res.json({ success: true, list: [] });
    }

    const { status, month } = req.query || {};
    const where = {
      orgAccountId: orgId,
      userId: { [Op.in]: memberIds }
    };
    if (status && status !== 'ALL') where.status = status;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      where.date = { [Op.between]: [`${month}-01`, `${month}-31`] };
    }

    const list = await LatePunchApproval.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'phone', 'role'],
          include: [
            {
              model: StaffProfile,
              as: 'profile',
              attributes: ['name', 'staffId', 'department', 'designation']
            }
          ]
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    return res.json({ success: true, list });
  } catch (err) {
    console.error('[TeamLeaderStaff] Late approvals list error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch late punch approval list' });
  }
});

// 12. PATCH /staff/team/late-approval/:id/review - Approve / Reject late punch
router.patch('/staff/team/late-approval/:id/review', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { id } = req.params;
    const { status, adminRemarks } = req.body || {};
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be APPROVED or REJECTED' });
    }

    const { memberIds } = await getAssignedMemberIds(req.user.id, orgId);
    const record = await LatePunchApproval.findOne({
      where: { id, orgAccountId: orgId }
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Late punch approval record not found' });
    }

    if (!memberIds.includes(Number(record.userId))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only review requests for your assigned team members.'
      });
    }

    await record.update({
      status,
      adminRemarks: adminRemarks || `Reviewed by Team Leader (${req.user.name || req.user.id})`,
      reviewedBy: req.user.id,
      reviewedAt: new Date()
    });

    if (status === 'APPROVED') {
      let att = await Attendance.findOne({
        where: { userId: record.userId, date: record.date, orgAccountId: orgId }
      });
      if (att) {
        await att.update({
          status: 'PRESENT',
          punchedInAt: record.punchedInAt || att.punchedInAt
        });
      } else {
        await Attendance.create({
          userId: record.userId,
          date: record.date,
          punchedInAt: record.punchedInAt,
          orgAccountId: orgId,
          status: 'PRESENT'
        });
      }
    } else if (status === 'REJECTED') {
      let att = await Attendance.findOne({
        where: { userId: record.userId, date: record.date, orgAccountId: orgId }
      });
      if (att && att.status === 'PENDING_APPROVAL') {
        await att.update({ status: 'REJECTED' });
      }
    }

    return res.json({
      success: true,
      message: `Late check-in ${status.toLowerCase()} successfully`,
      record
    });
  } catch (err) {
    console.error('[TeamLeaderStaff] Late punch review error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update late approval' });
  }
});

module.exports = router;
