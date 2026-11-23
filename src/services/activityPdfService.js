const puppeteer = require('puppeteer');
const { Op } = require('sequelize');
const { Activity, User, StaffProfile, OrgBusinessInfo, OrgAccount } = require('../models');

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) {
    return String(dateStr);
  }
}

function getDayRuleFullLabel(rule) {
  if (!rule || rule === 'ALL_DAYS') return 'All Working Days (Mon - Sat)';
  if (rule === 'MON_TO_FRI') return 'Weekdays Only (Mon - Fri)';
  if (rule === 'MON_ONLY') return 'Every Monday';
  if (rule === 'TUE_ONLY') return 'Every Tuesday';
  if (rule === 'WED_ONLY') return 'Every Wednesday';
  if (rule === 'THU_ONLY') return 'Every Thursday';
  if (rule === 'FRI_ONLY') return 'Every Friday';
  if (rule === 'SAT_ONLY') return 'Every Saturday';
  if (String(rule).startsWith('DATE_')) {
    const d = parseInt(String(rule).replace('DATE_', ''), 10) || 1;
    const suffix = d === 1 || d === 21 || d === 31 ? 'st' : d === 2 || d === 22 ? 'nd' : d === 3 || d === 23 ? 'rd' : 'th';
    return `Monthly (${d}${suffix})`;
  }
  return rule;
}

/**
 * Generate high-quality corporate PDF for Activities & Tasks
 * @param {Object} options
 * @param {number|null} options.orgAccountId
 * @param {number|null} options.userId - If provided, scopes to specific staff
 * @param {string|null} options.startDate - YYYY-MM-DD
 * @param {string|null} options.endDate - YYYY-MM-DD
 * @param {string|null} options.status - SCHEDULE, IN_PROGRESS, REVIEW, DONE
 * @param {string|null} options.jobType - ROUTINE, SINGLE
 */
async function generateActivityReportPDF({
  orgAccountId,
  userId = null,
  startDate = null,
  endDate = null,
  status = null,
  jobType = null,
}) {
  const where = {};
  if (orgAccountId) where.orgAccountId = orgAccountId;
  if (userId) where.userId = userId;

  if (startDate && endDate) {
    where.date = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    where.date = { [Op.gte]: startDate };
  } else if (endDate) {
    where.date = { [Op.lte]: endDate };
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (jobType && jobType !== 'ALL') {
    where.jobType = jobType;
  }

  // Fetch activities with related models
  const activities = await Activity.findAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'phone'],
        include: [{ model: StaffProfile, as: 'profile' }]
      },
      {
        model: User,
        as: 'allocatedBy',
        attributes: ['id'],
        include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'designation'] }]
      },
      {
        model: User,
        as: 'transferredTo',
        attributes: ['id'],
        include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'designation'] }]
      }
    ],
    order: [['date', 'ASC'], ['id', 'ASC']]
  });

  // Fetch company info
  let companyName = 'ThinkTech Software Solutions';
  let companyAddress = '';
  let companyGst = '';
  let companyPhone = '';
  let companyEmail = '';

  if (orgAccountId) {
    try {
      const orgInfo = await OrgBusinessInfo.findOne({ where: { orgAccountId } });
      const orgAcc = await OrgAccount.findByPk(orgAccountId);
      companyName = orgInfo?.companyName || orgAcc?.companyName || orgAcc?.name || 'ThinkTech Software Solutions';
      companyAddress = [orgInfo?.address, orgInfo?.city, orgInfo?.state, orgInfo?.pincode].filter(Boolean).join(', ');
      companyGst = orgInfo?.gstin || '';
      companyPhone = orgInfo?.phone || orgAcc?.phone || '';
      companyEmail = orgInfo?.email || orgAcc?.email || '';
    } catch (e) {
      console.error('Error fetching org info for activity PDF:', e);
    }
  }

  // If scoped to single staff member, fetch profile details
  let staffProfile = null;
  if (userId) {
    try {
      const u = await User.findByPk(userId, {
        include: [{ model: StaffProfile, as: 'profile' }]
      });
      if (u) {
        staffProfile = {
          name: u.profile?.name || 'Staff Member',
          employeeId: u.profile?.employeeId || u.profile?.employeeCode || `EMP-${u.id}`,
          designation: u.profile?.designation || 'Staff',
          department: u.profile?.department || 'Operations',
          phone: u.profile?.phone || u.phone || '-',
          email: u.profile?.email || '-'
        };
      }
    } catch (_) {}
  }

  // Statistics calculation
  const totalCount = activities.length;
  const doneCount = activities.filter(a => a.status === 'DONE').length;
  const inProgressCount = activities.filter(a => a.status === 'IN_PROGRESS').length;
  const scheduleCount = activities.filter(a => a.status === 'SCHEDULE').length;
  const reviewCount = activities.filter(a => a.status === 'REVIEW').length;
  const routineCount = activities.filter(a => a.jobType === 'ROUTINE' || !!a.dayRule).length;
  const singleCount = totalCount - routineCount;
  const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const generatedOn = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const periodLabel = startDate && endDate
    ? `${formatDate(startDate)} — ${formatDate(endDate)}`
    : startDate
    ? `From ${formatDate(startDate)}`
    : endDate
    ? `Up to ${formatDate(endDate)}`
    : 'All Scheduled Records';

  // Build HTML template
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Activity & Task Performance Report</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      padding: 24px;
      color: #1e293b;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #125ec9;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .header-table td {
      vertical-align: top;
    }
    .company-title {
      font-size: 19px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .company-sub {
      font-size: 10.5px;
      color: #475467;
      margin-top: 3px;
    }
    .report-title {
      text-align: right;
    }
    .report-heading {
      font-size: 17px;
      font-weight: 800;
      color: #125ec9;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .report-meta {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }

    /* Staff Profile Strip */
    .profile-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #125ec9;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: table;
      width: 100%;
    }
    .profile-cell {
      display: table-cell;
      vertical-align: top;
      width: 25%;
    }
    .profile-label {
      font-size: 9.5px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .profile-val {
      font-size: 12px;
      color: #0f172a;
      font-weight: 700;
    }

    /* Metrics Summary Strip */
    .metrics-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 8px 0;
      margin-bottom: 14px;
    }
    .metric-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      text-align: center;
      width: 14.28%;
    }
    .metric-num {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .metric-title {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
      margin-top: 2px;
      text-transform: uppercase;
    }

    /* Activities Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .data-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      font-size: 10px;
      padding: 8px 6px;
      text-align: left;
      border: 1px solid #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .data-table td {
      padding: 7px 6px;
      border: 1px solid #e2e8f0;
      font-size: 10.5px;
      vertical-align: top;
    }
    .data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .task-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 11px;
    }
    .task-desc {
      color: #475467;
      font-size: 9.5px;
      margin-top: 2px;
    }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 9px;
      text-transform: uppercase;
    }
    .badge-done { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-progress { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
    .badge-review { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-schedule { background: #f1f5f9; color: #475467; border: 1px solid #cbd5e1; }
    .badge-routine { background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe; }
    .badge-single { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }

    /* Signatures */
    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .signatures-table td {
      width: 33.33%;
      text-align: center;
      vertical-align: bottom;
      padding: 0 16px;
    }
    .sig-line {
      border-top: 1.5px dashed #94a3b8;
      padding-top: 6px;
      font-weight: 700;
      font-size: 10.5px;
      color: #1e293b;
    }
    .sig-sub {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }

    .footer {
      margin-top: 20px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      font-size: 9px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>

  <!-- Company & Document Header -->
  <table class="header-table">
    <tr>
      <td style="width: 58%;">
        <div class="company-title">${companyName}</div>
        <div class="company-sub">
          ${companyAddress ? companyAddress + '<br>' : ''}
          ${companyGst ? '<strong>GSTIN:</strong> ' + companyGst + ' | ' : ''}
          ${companyPhone ? '<strong>Phone:</strong> ' + companyPhone + ' | ' : ''}
          ${companyEmail ? '<strong>Email:</strong> ' + companyEmail : ''}
        </div>
      </td>
      <td style="width: 42%;" class="report-title">
        <div class="report-heading">Activity & Task Report</div>
        <div class="report-meta">
          <strong>Period:</strong> ${periodLabel}<br>
          <strong>Generated:</strong> ${generatedOn}<br>
          ${status && status !== 'ALL' ? `<strong>Status Filter:</strong> ${status}<br>` : ''}
          ${staffProfile ? `<strong>Staff Member:</strong> ${staffProfile.name}` : '<strong>Scope:</strong> Consolidated Organization'}
        </div>
      </td>
    </tr>
  </table>

  <!-- Staff Profile Strip (if single staff) -->
  ${staffProfile ? `
  <div class="profile-card">
    <div class="profile-cell">
      <div class="profile-label">Staff Member</div>
      <div class="profile-val">${staffProfile.name}</div>
    </div>
    <div class="profile-cell">
      <div class="profile-label">Employee ID & Role</div>
      <div class="profile-val">${staffProfile.employeeId} • ${staffProfile.designation}</div>
    </div>
    <div class="profile-cell">
      <div class="profile-label">Department</div>
      <div class="profile-val">${staffProfile.department}</div>
    </div>
    <div class="profile-cell">
      <div class="profile-label">Contact</div>
      <div class="profile-val">${staffProfile.phone}</div>
    </div>
  </div>
  ` : ''}

  <!-- KPI Metrics Strip -->
  <table class="metrics-table">
    <tr>
      <td class="metric-box" style="border-top: 3px solid #125ec9;">
        <div class="metric-num" style="color: #125ec9;">${totalCount}</div>
        <div class="metric-title">Total Tasks</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #10b981;">
        <div class="metric-num" style="color: #10b981;">${doneCount}</div>
        <div class="metric-title">Completed (${completionRate}%)</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #3b82f6;">
        <div class="metric-num" style="color: #3b82f6;">${inProgressCount}</div>
        <div class="metric-title">In Progress</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #64748b;">
        <div class="metric-num" style="color: #64748b;">${scheduleCount}</div>
        <div class="metric-title">Scheduled</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #f59e0b;">
        <div class="metric-num" style="color: #f59e0b;">${reviewCount}</div>
        <div class="metric-title">In Review</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #8b5cf6;">
        <div class="metric-num" style="color: #8b5cf6;">${routineCount}</div>
        <div class="metric-title">Monthly Routine</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #0284c7;">
        <div class="metric-num" style="color: #0284c7;">${singleCount}</div>
        <div class="metric-title">Single Jobs</div>
      </td>
    </tr>
  </table>

  <!-- Detailed Tasks Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">#</th>
        <th style="width: 80px;">Date</th>
        ${!staffProfile ? '<th style="width: 120px;">Staff Member</th>' : ''}
        <th>Job Title & Description</th>
        <th style="width: 110px;">Type / Frequency</th>
        <th style="width: 65px;">Deadline</th>
        <th style="width: 75px; text-align: center;">Status</th>
        <th style="width: 85px;">Allocated By</th>
        <th style="width: 100px;">Remarks / Notes</th>
      </tr>
    </thead>
    <tbody>
      ${activities.length === 0 ? `
        <tr>
          <td colspan="${!staffProfile ? 9 : 8}" style="text-align: center; padding: 24px; color: #94a3b8;">
            No activities or tasks recorded for the specified criteria.
          </td>
        </tr>
      ` : activities.map((a, idx) => {
        const staffName = a.user?.profile?.name || a.user?.name || 'Staff';
        const allocName = a.allocatedBy?.profile?.name || a.allocatedBy?.name || 'Self';
        const transName = a.transferredTo?.profile?.name || a.transferredTo?.name || null;

        const isRoutine = a.jobType === 'ROUTINE' || !!a.dayRule;
        const statusBadgeClass =
          a.status === 'DONE' ? 'badge-done' :
          a.status === 'IN_PROGRESS' ? 'badge-progress' :
          a.status === 'REVIEW' ? 'badge-review' : 'badge-schedule';

        return `
        <tr>
          <td style="text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
          <td style="font-weight: 600; color: #1e293b;">
            ${formatDate(a.date || a.turnAroundDate || a.createdAt)}
          </td>
          ${!staffProfile ? `
          <td style="font-weight: 600;">
            ${staffName}
            <div style="font-size: 8.5px; color: #64748b;">${a.user?.profile?.designation || 'Staff'}</div>
          </td>
          ` : ''}
          <td>
            <div class="task-title">${a.title}</div>
            ${a.description ? `<div class="task-desc">${a.description}</div>` : ''}
          </td>
          <td>
            <span class="badge ${isRoutine ? 'badge-routine' : 'badge-single'}">
              ${isRoutine ? 'Monthly Routine' : 'Single Job'}
            </span>
            ${a.dayRule && a.dayRule !== 'ALL_DAYS' ? `
            <div style="font-size: 8.5px; color: #475467; margin-top: 2px;">
              ${getDayRuleFullLabel(a.dayRule)}
            </div>
            ` : ''}
          </td>
          <td style="font-weight: 600; color: #334155;">
            ${a.turnAroundTime || '-'}
          </td>
          <td style="text-align: center;">
            <span class="badge ${statusBadgeClass}">
              ${a.status}
            </span>
          </td>
          <td style="font-size: 9px; color: #475467;">
            ${allocName}
            ${transName ? `<div style="color: #0284c7; font-size: 8.5px;">Transferred: ${transName}</div>` : ''}
          </td>
          <td style="font-size: 9px; color: #64748b;">
            ${a.remarks || '-'}
          </td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <!-- Signatures Block -->
  <table class="signatures-table">
    <tr>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">${staffProfile ? staffProfile.name : 'Staff / Employee'}</div>
        <div class="sig-sub">Prepared / Assigned Staff</div>
      </td>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">Reporting Manager / Team Leader</div>
        <div class="sig-sub">Verified & Monitored By</div>
      </td>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">Operations / Authorized Signatory</div>
        <div class="sig-sub">${companyName}</div>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <div class="footer">
    <span>Authentic computer-generated report from ${companyName} VetanSutra ERP</span>
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
    margin: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm'
    }
  });

  await browser.close();

  return {
    pdfBuffer,
    totalCount,
    companyName
  };
}

module.exports = {
  generateActivityReportPDF
};
