const puppeteer = require('puppeteer');
const { Op } = require('sequelize');
const {
  Meeting,
  MeetingAttendee,
  Ticket,
  User,
  StaffProfile,
  OrgBusinessInfo,
  OrgAccount,
  OrgBrand
} = require('../models');

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (_) {
    return String(dateStr);
  }
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (_) {
    return '';
  }
}

async function resolveOrgInfo(orgAccountId, defaultUserId = null) {
  let effectiveOrgId = orgAccountId;
  if (!effectiveOrgId && defaultUserId) {
    try {
      const u = await User.findByPk(defaultUserId);
      if (u && u.orgAccountId) effectiveOrgId = u.orgAccountId;
    } catch (_) {}
  }

  let companyName = 'ThinkTech Software Solutions';
  let companyAddress = '';
  let companyGst = '';
  let companyPhone = '';
  let companyEmail = '';

  if (effectiveOrgId) {
    try {
      const orgAcc = await OrgAccount.findByPk(effectiveOrgId);
      const orgInfo = await OrgBusinessInfo.findOne({ where: { orgAccountId: effectiveOrgId } });
      const orgBrand = OrgBrand ? await OrgBrand.findOne({ where: { orgAccountId: effectiveOrgId } }) : null;

      companyName = orgAcc?.name || orgInfo?.companyName || orgBrand?.displayName || 'ThinkTech Software Solutions';
      companyAddress = [orgInfo?.address, orgInfo?.city, orgInfo?.state, orgInfo?.pincode].filter(Boolean).join(', ');
      companyGst = orgInfo?.gstin || '';
      companyPhone = orgInfo?.phone || orgAcc?.phone || '';
      companyEmail = orgInfo?.email || orgAcc?.email || '';
    } catch (e) {
      console.error('Error fetching org info for meeting/ticket PDF:', e);
    }
  }

  return { companyName, companyAddress, companyGst, companyPhone, companyEmail, effectiveOrgId };
}

/**
 * Generate PDF for Meetings
 */
async function generateMeetingsReportPDF({
  orgAccountId = null,
  userId = null,
  startDate = null,
  endDate = null,
  status = null,
  search = null
}) {
  const { companyName, companyAddress, companyGst, companyPhone, companyEmail, effectiveOrgId } =
    await resolveOrgInfo(orgAccountId, userId);

  const where = {};
  if (effectiveOrgId) where.orgAccountId = effectiveOrgId;

  if (startDate && endDate) {
    where.scheduledAt = {
      [Op.between]: [new Date(`${startDate}T00:00:00`), new Date(`${endDate}T23:59:59.999`)]
    };
  } else if (startDate) {
    where.scheduledAt = {
      [Op.gte]: new Date(`${startDate}T00:00:00`)
    };
  } else if (endDate) {
    where.scheduledAt = {
      [Op.lte]: new Date(`${endDate}T23:59:59.999`)
    };
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  let meetings = await Meeting.findAll({
    where,
    include: [
      {
        model: MeetingAttendee,
        as: 'attendeeRecords'
      }
    ],
    order: [['scheduledAt', 'DESC'], ['id', 'DESC']],
    limit: 1000
  });

  // Filter by userId if staff-scoped (created by staff or staff is attendee)
  if (userId) {
    const uid = Number(userId);
    meetings = meetings.filter(m =>
      m.createdBy === uid ||
      (Array.isArray(m.attendeeRecords) && m.attendeeRecords.some(a => a.userId === uid))
    );
  }

  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    meetings = meetings.filter(m => {
      const t = String(m.title || '').toLowerCase();
      const d = String(m.description || '').toLowerCase();
      const r = String(m.remarks || '').toLowerCase();
      return t.includes(q) || d.includes(q) || r.includes(q);
    });
  }

  // Resolve staff names
  const allUserIds = new Set();
  meetings.forEach(m => {
    if (m.createdBy) allUserIds.add(m.createdBy);
    if (Array.isArray(m.attendeeRecords)) {
      m.attendeeRecords.forEach(a => { if (a.userId) allUserIds.add(a.userId); });
    }
  });

  const staffMap = {};
  if (allUserIds.size > 0) {
    try {
      const profiles = await StaffProfile.findAll({
        where: { userId: Array.from(allUserIds) },
        attributes: ['userId', 'name', 'phone', 'staffId']
      });
      profiles.forEach(p => { staffMap[p.userId] = p.name || p.phone; });

      const users = await User.findAll({
        where: { id: Array.from(allUserIds) },
        attributes: ['id', 'phone']
      });
      users.forEach(u => {
        if (!staffMap[u.id]) staffMap[u.id] = u.phone || `User #${u.id}`;
      });
    } catch (_) {}
  }

  // Profile resolution for single staff report
  let staffName = 'All Staff / Organization';
  let staffPhone = '';
  let staffEmpId = '';
  if (userId) {
    try {
      const u = await User.findByPk(userId);
      const profile = await StaffProfile.findOne({ where: { userId } });
      staffName = profile?.name || u?.name || `Staff #${userId}`;
      staffPhone = profile?.phone || u?.phone || '';
      staffEmpId = profile?.staffId || '';
    } catch (_) {}
  }

  // Metrics computation
  const totalMeetings = meetings.length;
  const scheduledCount = meetings.filter(m => m.status === 'SCHEDULE' || !m.status).length;
  const inProgressCount = meetings.filter(m => m.status === 'IN_PROGRESS').length;
  const doneCount = meetings.filter(m => m.status === 'DONE').length;

  const periodLabel = startDate && endDate
    ? `${formatDate(startDate)} to ${formatDate(endDate)}`
    : startDate
    ? `From ${formatDate(startDate)}`
    : endDate
    ? `Until ${formatDate(endDate)}`
    : 'All Time Records';

  const generatedOn = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const rowsHtml = meetings.map((m, idx) => {
    const creatorName = staffMap[m.createdBy] || `User #${m.createdBy}`;
    const attendeesNames = Array.isArray(m.attendeeRecords) && m.attendeeRecords.length > 0
      ? m.attendeeRecords.map(a => staffMap[a.userId] || `User #${a.userId}`).join(', ')
      : 'Open Meeting';

    let badgeClass = 'badge-schedule';
    if (m.status === 'IN_PROGRESS') badgeClass = 'badge-progress';
    if (m.status === 'DONE') badgeClass = 'badge-done';

    return `
      <tr>
        <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: #0f172a;">${formatDate(m.scheduledAt)}</div>
          <div style="font-size: 9.5px; color: #64748b;">${formatTime(m.scheduledAt)}</div>
        </td>
        <td>
          <div style="font-weight: 700; color: #0f172a; font-size: 11px;">${m.title || 'Untitled Meeting'}</div>
          ${m.description ? `<div style="font-size: 9.5px; color: #475467; margin-top: 2px;">${m.description}</div>` : ''}
        </td>
        <td style="font-weight: 600; color: #334155;">${creatorName}</td>
        <td style="font-size: 9.5px; color: #475569; max-width: 220px;">
          ${attendeesNames}
        </td>
        <td style="font-size: 9.5px; color: #2563eb;">
          ${m.meetLink ? `<a href="${m.meetLink}" style="color: #2563eb; text-decoration: none;">🔗 Google Meet</a>` : '<span style="color: #94a3b8;">-</span>'}
        </td>
        <td style="text-align: center;">
          <span class="badge ${badgeClass}">${m.status || 'SCHEDULE'}</span>
        </td>
        <td style="font-size: 9.5px; color: #475467; max-width: 180px;">
          ${m.remarks || '<span style="color: #94a3b8;">-</span>'}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Meetings Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { padding: 24px; color: #1e293b; background: #ffffff; font-size: 11px; line-height: 1.4; }
    .header-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #125ec9; padding-bottom: 12px; margin-bottom: 14px; }
    .header-table td { vertical-align: top; }
    .company-title { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .company-sub { font-size: 10.5px; color: #475467; margin-top: 3px; }
    .report-title { text-align: right; }
    .report-heading { font-size: 17px; font-weight: 800; color: #125ec9; text-transform: uppercase; letter-spacing: 0.04em; }
    .report-meta { font-size: 10px; color: #64748b; margin-top: 4px; }

    .profile-card { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #125ec9; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: table; width: 100%; }
    .profile-cell { display: table-cell; vertical-align: top; width: 25%; }
    .profile-label { font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
    .profile-val { font-size: 12px; color: #0f172a; font-weight: 700; }

    .metrics-table { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 14px; }
    .metric-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; text-align: center; width: 25%; }
    .metric-num { font-size: 16px; font-weight: 800; color: #0f172a; }
    .metric-title { font-size: 9.5px; color: #64748b; font-weight: 600; margin-top: 2px; text-transform: uppercase; }

    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .data-table th { background: #0f172a; color: #ffffff; font-weight: 700; font-size: 10px; padding: 8px 6px; text-align: left; border: 1px solid #0f172a; text-transform: uppercase; }
    .data-table td { padding: 7px 6px; border: 1px solid #e2e8f0; font-size: 10px; vertical-align: middle; }
    .data-table tr:nth-child(even) td { background: #f8fafc; }

    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 9px; text-transform: uppercase; }
    .badge-done { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-progress { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-schedule { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }

    .signatures-table { width: 100%; border-collapse: collapse; margin-top: 24px; page-break-inside: avoid; }
    .signatures-table td { width: 33.33%; text-align: center; vertical-align: bottom; padding: 0 16px; }
    .sig-line { border-top: 1.5px dashed #94a3b8; padding-top: 6px; font-weight: 700; font-size: 10.5px; color: #1e293b; }
    .sig-sub { font-size: 9.5px; color: #64748b; margin-top: 2px; }

    .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>

  <!-- Header -->
  <table class="header-table">
    <tr>
      <td style="width: 55%;">
        <div class="company-title">${companyName}</div>
        ${companyAddress ? `<div class="company-sub">${companyAddress}</div>` : ''}
        ${companyPhone || companyEmail ? `<div class="company-sub">${[companyPhone, companyEmail].filter(Boolean).join(' | ')}</div>` : ''}
        ${companyGst ? `<div class="company-sub"><strong>GSTIN:</strong> ${companyGst}</div>` : ''}
      </td>
      <td style="width: 45%; text-align: right;" class="report-title">
        <div class="report-heading">Official Meetings Report</div>
        <div class="report-meta"><strong>Period:</strong> ${periodLabel}</div>
        <div class="report-meta"><strong>Status Filter:</strong> ${status || 'All Statuses'}</div>
        <div class="report-meta"><strong>Generated:</strong> ${generatedOn}</div>
      </td>
    </tr>
  </table>

  <!-- Staff Info Card -->
  <div class="profile-card">
    <div class="profile-cell">
      <div class="profile-label">Representative / Executive</div>
      <div class="profile-val">${staffName}</div>
    </div>
    <div class="profile-cell">
      <div class="profile-label">Phone Number</div>
      <div class="profile-val">${staffPhone || 'N/A'}</div>
    </div>
    <div class="profile-cell">
      <div class="profile-label">Employee Code</div>
      <div class="profile-val">${staffEmpId || 'N/A'}</div>
    </div>
    <div class="profile-cell">
      <div class="profile-label">Total Meetings Scheduled</div>
      <div class="profile-val" style="color: #125ec9;">${totalMeetings} Meetings</div>
    </div>
  </div>

  <!-- Metrics Summary Strip -->
  <table class="metrics-table">
    <tr>
      <td class="metric-box">
        <div class="metric-num">${totalMeetings}</div>
        <div class="metric-title">Total Meetings</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #0284c7;">
        <div class="metric-num" style="color: #0284c7;">${scheduledCount}</div>
        <div class="metric-title">Scheduled</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #d97706;">
        <div class="metric-num" style="color: #d97706;">${inProgressCount}</div>
        <div class="metric-title">In Progress</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #16a34a;">
        <div class="metric-num" style="color: #16a34a;">${doneCount}</div>
        <div class="metric-title">Completed</div>
      </td>
    </tr>
  </table>

  <!-- Meetings Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%; text-align: center;">#</th>
        <th style="width: 13%;">Date & Time</th>
        <th style="width: 22%;">Meeting Title & Agenda</th>
        <th style="width: 14%;">Organizer</th>
        <th style="width: 20%;">Attendees</th>
        <th style="width: 10%;">Link</th>
        <th style="width: 8%; text-align: center;">Status</th>
        <th style="width: 9%;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${meetings.length === 0 ? `
        <tr>
          <td colspan="8" style="text-align: center; padding: 24px; color: #64748b;">
            No meetings recorded for the selected filter and period.
          </td>
        </tr>
      ` : rowsHtml}
    </tbody>
  </table>

  <!-- Signatures Block -->
  <table class="signatures-table">
    <tr>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">${userId ? staffName : 'Staff Representative'}</div>
        <div class="sig-sub">Prepared / Organizer</div>
      </td>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">Reporting Manager / Team Leader</div>
        <div class="sig-sub">Verified & Approved By</div>
      </td>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">Authorized Signatory</div>
        <div class="sig-sub">${companyName}</div>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <div class="footer">
    <span>Authentic computer-generated report from ${companyName} ERP</span>
    <span>Generated on: ${generatedOn}</span>
  </div>

</body>
</html>
  `;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
  });

  await browser.close();

  return { pdfBuffer, totalCount: totalMeetings, companyName };
}

/**
 * Generate PDF for Support / Work Tickets
 */
async function generateTicketsReportPDF({
  orgAccountId = null,
  userId = null,
  startDate = null,
  endDate = null,
  status = null,
  priority = null,
  search = null
}) {
  const { companyName, companyAddress, companyGst, companyPhone, companyEmail, effectiveOrgId } =
    await resolveOrgInfo(orgAccountId, userId);

  const where = {};
  if (effectiveOrgId) where.orgAccountId = effectiveOrgId;

  if (startDate && endDate) {
    where.createdAt = {
      [Op.between]: [new Date(`${startDate}T00:00:00`), new Date(`${endDate}T23:59:59.999`)]
    };
  } else if (startDate) {
    where.createdAt = {
      [Op.gte]: new Date(`${startDate}T00:00:00`)
    };
  } else if (endDate) {
    where.createdAt = {
      [Op.lte]: new Date(`${endDate}T23:59:59.999`)
    };
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (priority && priority !== 'ALL') {
    where.priority = priority;
  }

  let tickets = await Ticket.findAll({
    where,
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: 1000
  });

  // Filter by userId if staff-scoped (allocated to or allocated by)
  if (userId) {
    const uid = Number(userId);
    tickets = tickets.filter(t => t.allocatedTo === uid || t.allocatedBy === uid);
  }

  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    tickets = tickets.filter(t => {
      const tid = String(t.ticketId || '').toLowerCase();
      const title = String(t.title || '').toLowerCase();
      const desc = String(t.description || '').toLowerCase();
      const rem = String(t.remarks || '').toLowerCase();
      return tid.includes(q) || title.includes(q) || desc.includes(q) || rem.includes(q);
    });
  }

  // Resolve staff names
  const allUserIds = new Set();
  tickets.forEach(t => {
    if (t.allocatedTo) allUserIds.add(t.allocatedTo);
    if (t.allocatedBy) allUserIds.add(t.allocatedBy);
    if (t.updatedBy) allUserIds.add(t.updatedBy);
  });

  const staffMap = {};
  if (allUserIds.size > 0) {
    try {
      const profiles = await StaffProfile.findAll({
        where: { userId: Array.from(allUserIds) },
        attributes: ['userId', 'name', 'phone', 'staffId']
      });
      profiles.forEach(p => { staffMap[p.userId] = p.name || p.phone; });

      const users = await User.findAll({
        where: { id: Array.from(allUserIds) },
        attributes: ['id', 'phone']
      });
      users.forEach(u => {
        if (!staffMap[u.id]) staffMap[u.id] = u.phone || `User #${u.id}`;
      });
    } catch (_) {}
  }

  // Profile resolution for single staff report
  let staffName = 'All Staff / Support Team';
  let staffPhone = '';
  let staffEmpId = '';
  if (userId) {
    try {
      const u = await User.findByPk(userId);
      const profile = await StaffProfile.findOne({ where: { userId } });
      staffName = profile?.name || u?.name || `Staff #${userId}`;
      staffPhone = profile?.phone || u?.phone || '';
      staffEmpId = profile?.staffId || '';
    } catch (_) {}
  }

  // Metrics computation
  const totalTickets = tickets.length;
  const scheduleCount = tickets.filter(t => t.status === 'SCHEDULE').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const reviewCount = tickets.filter(t => t.status === 'REVIEW').length;
  const doneCount = tickets.filter(t => t.status === 'DONE').length;

  const periodLabel = startDate && endDate
    ? `${formatDate(startDate)} to ${formatDate(endDate)}`
    : startDate
    ? `From ${formatDate(startDate)}`
    : endDate
    ? `Until ${formatDate(endDate)}`
    : 'All Time Records';

  const generatedOn = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const rowsHtml = tickets.map((t, idx) => {
    const assigneeName = staffMap[t.allocatedTo] || `User #${t.allocatedTo}`;
    const creatorName = staffMap[t.allocatedBy] || `User #${t.allocatedBy}`;
    const updaterName = t.updatedBy ? (staffMap[t.updatedBy] || `User #${t.updatedBy}`) : null;

    let badgeClass = 'badge-schedule';
    if (t.status === 'IN_PROGRESS') badgeClass = 'badge-progress';
    if (t.status === 'REVIEW') badgeClass = 'badge-review';
    if (t.status === 'DONE') badgeClass = 'badge-done';

    let priBadge = 'badge-low';
    if (t.priority === 'HIGH') priBadge = 'badge-high';
    if (t.priority === 'MEDIUM') priBadge = 'badge-medium';

    return `
      <tr>
        <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
        <td>
          <div style="font-weight: 800; color: #125ec9;">#${t.ticketId || t.id}</div>
          <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">${formatDate(t.createdAt)}</div>
        </td>
        <td>
          <div style="font-weight: 700; color: #0f172a; font-size: 11px;">${t.title}</div>
          ${t.description ? `<div style="font-size: 9.5px; color: #475467; margin-top: 2px;">${t.description}</div>` : ''}
        </td>
        <td style="font-weight: 600; color: #0f172a;">${assigneeName}</td>
        <td style="color: #475569;">${creatorName}</td>
        <td style="text-align: center;">
          <span class="badge ${priBadge}">${t.priority || 'MEDIUM'}</span>
        </td>
        <td>
          ${t.dueDate ? `<div style="font-weight: 600; color: #0f172a;">${formatDate(t.dueDate)}</div>` : '<span style="color: #94a3b8;">-</span>'}
        </td>
        <td style="text-align: center;">
          <span class="badge ${badgeClass}">${t.status}</span>
        </td>
        <td style="font-size: 9.5px; color: #475467; max-width: 180px;">
          ${t.remarks ? `<div>${t.remarks}</div>${updaterName ? `<div style="color: #94a3b8; font-size: 8.5px; margin-top: 1px;">by ${updaterName}</div>` : ''}` : '<span style="color: #94a3b8;">-</span>'}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tickets Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { padding: 24px; color: #1e293b; background: #ffffff; font-size: 11px; line-height: 1.4; }
    .header-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #125ec9; padding-bottom: 12px; margin-bottom: 14px; }
    .header-table td { vertical-align: top; }
    .company-title { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .company-sub { font-size: 10.5px; color: #475467; margin-top: 3px; }
    .report-title { text-align: right; }
    .report-heading { font-size: 17px; font-weight: 800; color: #125ec9; text-transform: uppercase; letter-spacing: 0.04em; }
    .report-meta { font-size: 10px; color: #64748b; margin-top: 4px; }

    .profile-card { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #125ec9; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: table; width: 100%; }
    .profile-cell { display: table-cell; vertical-align: top; width: 25%; }
    .profile-label { font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
    .profile-val { font-size: 12px; color: #0f172a; font-weight: 700; }

    .metrics-table { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 14px; }
    .metric-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; text-align: center; width: 20%; }
    .metric-num { font-size: 16px; font-weight: 800; color: #0f172a; }
    .metric-title { font-size: 9.5px; color: #64748b; font-weight: 600; margin-top: 2px; text-transform: uppercase; }

    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .data-table th { background: #0f172a; color: #ffffff; font-weight: 700; font-size: 10px; padding: 8px 6px; text-align: left; border: 1px solid #0f172a; text-transform: uppercase; }
    .data-table td { padding: 7px 6px; border: 1px solid #e2e8f0; font-size: 10px; vertical-align: middle; }
    .data-table tr:nth-child(even) td { background: #f8fafc; }

    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 9px; text-transform: uppercase; }
    .badge-done { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-progress { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-review { background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe; }
    .badge-schedule { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }

    .badge-high { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-medium { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-low { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

    .signatures-table { width: 100%; border-collapse: collapse; margin-top: 24px; page-break-inside: avoid; }
    .signatures-table td { width: 33.33%; text-align: center; vertical-align: bottom; padding: 0 16px; }
    .sig-line { border-top: 1.5px dashed #94a3b8; padding-top: 6px; font-weight: 700; font-size: 10.5px; color: #1e293b; }
    .sig-sub { font-size: 9.5px; color: #64748b; margin-top: 2px; }

    .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>

  <!-- Header -->
  <table class="header-table">
    <tr>
      <td style="width: 55%;">
        <div class="company-title">${companyName}</div>
        ${companyAddress ? `<div class="company-sub">${companyAddress}</div>` : ''}
        ${companyPhone || companyEmail ? `<div class="company-sub">${[companyPhone, companyEmail].filter(Boolean).join(' | ')}</div>` : ''}
        ${companyGst ? `<div class="company-sub"><strong>GSTIN:</strong> ${companyGst}</div>` : ''}
      </td>
      <td style="width: 45%; text-align: right;" class="report-title">
        <div class="report-heading">Tasks & Tickets Report</div>
        <div class="report-meta"><strong>Period:</strong> ${periodLabel}</div>
        <div class="report-meta"><strong>Status Filter:</strong> ${status || 'All Statuses'}</div>
        <div class="report-meta"><strong>Generated:</strong> ${generatedOn}</div>
      </td>
    </tr>
  </table>

  <!-- Staff Info Card -->
  <div class="profile-card">
    <div class="profile-cell">
      <div class="profile-label">Representative / Executive</div>
      <div class="profile-val">${staffName}</div>
    </div>
    <div class="profile-cell">
      <div class="profile-label">Phone Number</div>
      <div class="profile-val">${staffPhone || 'N/A'}</div>
    </div>
    <div class="profile-cell">
      <div class="profile-label">Employee Code</div>
      <div class="profile-val">${staffEmpId || 'N/A'}</div>
    </div>
    <div class="profile-cell">
      <div class="profile-label">Total Assigned / Handled</div>
      <div class="profile-val" style="color: #125ec9;">${totalTickets} Tickets</div>
    </div>
  </div>

  <!-- Metrics Summary Strip -->
  <table class="metrics-table">
    <tr>
      <td class="metric-box">
        <div class="metric-num">${totalTickets}</div>
        <div class="metric-title">Total Tickets</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #0284c7;">
        <div class="metric-num" style="color: #0284c7;">${scheduleCount}</div>
        <div class="metric-title">Scheduled</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #d97706;">
        <div class="metric-num" style="color: #d97706;">${inProgressCount}</div>
        <div class="metric-title">In Progress</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #7c3aed;">
        <div class="metric-num" style="color: #7c3aed;">${reviewCount}</div>
        <div class="metric-title">In Review</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #16a34a;">
        <div class="metric-num" style="color: #16a34a;">${doneCount}</div>
        <div class="metric-title">Resolved</div>
      </td>
    </tr>
  </table>

  <!-- Tickets Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%; text-align: center;">#</th>
        <th style="width: 12%;">Ticket ID & Date</th>
        <th style="width: 21%;">Title & Details</th>
        <th style="width: 13%;">Assigned To</th>
        <th style="width: 12%;">Allocated By</th>
        <th style="width: 8%; text-align: center;">Priority</th>
        <th style="width: 10%;">Due Date</th>
        <th style="width: 9%; text-align: center;">Status</th>
        <th style="width: 11%;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${tickets.length === 0 ? `
        <tr>
          <td colspan="9" style="text-align: center; padding: 24px; color: #64748b;">
            No tickets recorded for the selected filter and period.
          </td>
        </tr>
      ` : rowsHtml}
    </tbody>
  </table>

  <!-- Signatures Block -->
  <table class="signatures-table">
    <tr>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">${userId ? staffName : 'Assigned Executive'}</div>
        <div class="sig-sub">Prepared / Assignee</div>
      </td>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">Operations Head / Manager</div>
        <div class="sig-sub">Verified & Approved By</div>
      </td>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">Authorized Signatory</div>
        <div class="sig-sub">${companyName}</div>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <div class="footer">
    <span>Authentic computer-generated report from ${companyName} ERP</span>
    <span>Generated on: ${generatedOn}</span>
  </div>

</body>
</html>
  `;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
  });

  await browser.close();

  return { pdfBuffer, totalCount: totalTickets, companyName };
}

module.exports = {
  generateMeetingsReportPDF,
  generateTicketsReportPDF
};
