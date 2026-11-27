const puppeteer = require('puppeteer');
const { Op } = require('sequelize');
const {
  SalesVisit,
  AssignedJob,
  Order,
  OrderItem,
  Client,
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

function formatINR(val) {
  const n = Number(val || 0);
  return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
      console.error('Error fetching org info for sales PDF:', e);
    }
  }

  return { companyName, companyAddress, companyGst, companyPhone, companyEmail, effectiveOrgId };
}

/**
 * Generate PDF for Sales / Field Visits
 */
async function generateVisitsReportPDF({
  orgAccountId = null,
  userId = null,
  startDate = null,
  endDate = null,
  verified = null,
  visitType = null,
  search = null
}) {
  const { companyName, companyAddress, companyGst, companyPhone, companyEmail, effectiveOrgId } =
    await resolveOrgInfo(orgAccountId, userId);

  const where = {};

  if (userId) {
    where.userId = Number(userId);
  } else if (effectiveOrgId) {
    const orgStaffIds = (
      await User.findAll({
        where: { orgAccountId: effectiveOrgId },
        attributes: ['id']
      })
    ).map((u) => u.id);
    where.userId = orgStaffIds;
  }

  if (startDate && endDate) {
    where.visitDate = {
      [Op.between]: [new Date(`${startDate}T00:00:00`), new Date(`${endDate}T23:59:59.999`)]
    };
  } else if (startDate) {
    where.visitDate = {
      [Op.gte]: new Date(`${startDate}T00:00:00`)
    };
  } else if (endDate) {
    where.visitDate = {
      [Op.lte]: new Date(`${endDate}T23:59:59.999`)
    };
  }

  if (verified !== null && verified !== undefined && verified !== 'ALL' && verified !== '') {
    const isV = verified === true || verified === 'true' || verified === '1' || verified === 'VERIFIED';
    where.verified = isV;
  }

  if (visitType && visitType !== 'ALL') {
    where.visitType = visitType;
  }

  let visits = await SalesVisit.findAll({
    where,
    order: [['visitDate', 'DESC'], ['id', 'DESC']],
    limit: 1000
  });

  const visitUserIds = Array.from(new Set(visits.map(v => v.userId).filter(Boolean)));
  const visitStaffMap = {};
  if (visitUserIds.length > 0) {
    try {
      const profiles = await StaffProfile.findAll({ where: { userId: visitUserIds }, attributes: ['userId', 'name', 'phone', 'staffId'] });
      profiles.forEach(p => { visitStaffMap[p.userId] = p.name || p.phone; });
      const users = await User.findAll({ where: { id: visitUserIds }, attributes: ['id', 'phone'] });
      users.forEach(u => { if (!visitStaffMap[u.id]) visitStaffMap[u.id] = u.phone || `Staff #${u.id}`; });
    } catch (_) {}
  }

  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    visits = visits.filter((v) => {
      const cName = String(v.clientName || '').toLowerCase();
      const phone = String(v.phone || '').toLowerCase();
      const loc = String(v.location || v.checkInAddress || '').toLowerCase();
      const sp = String(v.salesPerson || visitStaffMap[v.userId] || '').toLowerCase();
      return cName.includes(q) || phone.includes(q) || loc.includes(q) || sp.includes(q);
    });
  }

  // Profile resolution for single staff report
  let staffName = 'All Staff / Executives';
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
  const totalVisits = visits.length;
  const verifiedVisits = visits.filter((v) => v.verified === true || v.verified === 1 || String(v.verified) === 'true').length;
  const pendingVisits = totalVisits - verifiedVisits;
  const ordersConverted = visits.filter((v) => v.madeOrder === true || v.madeOrder === 1 || String(v.madeOrder) === 'true').length;
  const totalOrderAmount = visits.reduce((sum, v) => sum + Number(v.amount || 0), 0);

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

  const rowsHtml = visits.map((v, idx) => {
    const isV = v.verified === true || v.verified === 1 || String(v.verified) === 'true';
    const hasOrder = v.madeOrder === true || v.madeOrder === 1 || String(v.madeOrder) === 'true';
    const amountVal = Number(v.amount || 0);
    const sp = v.salesPerson || visitStaffMap[v.userId] || '-';
    const loc = v.checkInAddress || v.location || '-';

    return `
      <tr>
        <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: #0f172a;">${formatDate(v.visitDate)}</div>
          <div style="font-size: 9.5px; color: #64748b;">${formatTime(v.visitDate || v.createdAt)}</div>
        </td>
        <td>
          <div style="font-weight: 700; color: #0f172a;">${v.clientName || 'Unnamed Client'}</div>
          ${v.phone ? `<div style="font-size: 9.5px; color: #2563eb;">📞 ${v.phone}</div>` : ''}
        </td>
        <td>
          <span style="display: inline-block; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; color: #475569;">
            ${v.clientType || 'Retailer / Client'}
          </span>
        </td>
        <td style="font-weight: 600; color: #334155;">${sp}</td>
        <td>
          <span style="display: inline-block; background: #eef2f6; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 600; color: #0284c7;">
            ${v.visitType || 'General Visit'}
          </span>
        </td>
        <td style="max-width: 220px; font-size: 9.5px; color: #475569;">
          ${loc}
          ${v.checkInLat ? `<div style="font-size: 8.5px; color: #94a3b8; margin-top: 2px;">📍 ${Number(v.checkInLat).toFixed(5)}, ${Number(v.checkInLng).toFixed(5)}</div>` : ''}
        </td>
        <td style="text-align: center;">
          ${isV
            ? '<span class="badge badge-verified">Verified</span>'
            : '<span class="badge badge-pending">Pending</span>'}
        </td>
        <td style="text-align: right; font-weight: 700; color: #0f172a;">
          ${hasOrder && amountVal > 0 ? formatINR(amountVal) : '<span style="color: #94a3b8; font-weight: 400;">-</span>'}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sales Visits Report</title>
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
    .badge-verified { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-pending { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }

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
        <div class="report-heading">Sales & Field Visits Report</div>
        <div class="report-meta"><strong>Period:</strong> ${periodLabel}</div>
        <div class="report-meta"><strong>Status Filter:</strong> ${verified ? (verified === true || verified === 'VERIFIED' ? 'Verified Visits' : 'Pending Verification') : 'All Statuses'}</div>
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
      <div class="profile-label">Total Visits Logged</div>
      <div class="profile-val" style="color: #125ec9;">${totalVisits} Visits</div>
    </div>
  </div>

  <!-- Metrics Summary Strip -->
  <table class="metrics-table">
    <tr>
      <td class="metric-box">
        <div class="metric-num">${totalVisits}</div>
        <div class="metric-title">Total Visits</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #16a34a;">
        <div class="metric-num" style="color: #16a34a;">${verifiedVisits}</div>
        <div class="metric-title">Verified</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #ea580c;">
        <div class="metric-num" style="color: #ea580c;">${pendingVisits}</div>
        <div class="metric-title">Pending</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #9333ea;">
        <div class="metric-num" style="color: #9333ea;">${ordersConverted}</div>
        <div class="metric-title">Orders Made</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #125ec9;">
        <div class="metric-num" style="color: #125ec9;">${formatINR(totalOrderAmount)}</div>
        <div class="metric-title">Order Amount</div>
      </td>
    </tr>
  </table>

  <!-- Visits Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%; text-align: center;">#</th>
        <th style="width: 12%;">Date & Time</th>
        <th style="width: 18%;">Client / Party</th>
        <th style="width: 11%;">Client Type</th>
        <th style="width: 13%;">Salesperson</th>
        <th style="width: 11%;">Visit Type</th>
        <th style="width: 17%;">Location / Coordinates</th>
        <th style="width: 8%; text-align: center;">Status</th>
        <th style="width: 9%; text-align: right;">Order Value</th>
      </tr>
    </thead>
    <tbody>
      ${visits.length === 0 ? `
        <tr>
          <td colspan="9" style="text-align: center; padding: 24px; color: #64748b;">
            No visits recorded for the selected filter and period.
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
        <div class="sig-line">${userId ? staffName : 'Field Sales Executive'}</div>
        <div class="sig-sub">Prepared / Field Executive</div>
      </td>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">Sales Manager / Area Head</div>
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

  return { pdfBuffer, totalCount: totalVisits, companyName };
}

/**
 * Generate PDF for Commercial Orders
 */
async function generateOrdersReportPDF({
  orgAccountId = null,
  userId = null,
  startDate = null,
  endDate = null,
  paymentMethod = null,
  search = null
}) {
  const { companyName, companyAddress, companyGst, companyPhone, companyEmail, effectiveOrgId } =
    await resolveOrgInfo(orgAccountId, userId);

  const where = {};

  if (userId) {
    where.userId = Number(userId);
  } else if (effectiveOrgId) {
    const orgStaffIds = (
      await User.findAll({
        where: { orgAccountId: effectiveOrgId },
        attributes: ['id']
      })
    ).map((u) => u.id);
    where.userId = orgStaffIds;
  }

  if (startDate && endDate) {
    where.orderDate = {
      [Op.between]: [new Date(`${startDate}T00:00:00`), new Date(`${endDate}T23:59:59.999`)]
    };
  } else if (startDate) {
    where.orderDate = {
      [Op.gte]: new Date(`${startDate}T00:00:00`)
    };
  } else if (endDate) {
    where.orderDate = {
      [Op.lte]: new Date(`${endDate}T23:59:59.999`)
    };
  }

  if (paymentMethod && paymentMethod !== 'ALL' && paymentMethod !== '') {
    const pm = String(paymentMethod).toUpperCase();
    if (pm === 'ONLINE') {
      where.paymentMethod = { [Op.or]: ['ONLINE', 'UPI'] };
    } else if (pm === 'CREDIT') {
      where.paymentMethod = { [Op.or]: ['CREDIT', 'CHEQUE'] };
    } else {
      where.paymentMethod = pm;
    }
  }

  let orders = await Order.findAll({
    where,
    include: [
      {
        model: Client,
        as: 'client',
        attributes: ['id', 'name', 'phone', 'location']
      },
      {
        model: OrderItem,
        as: 'items'
      }
    ],
    order: [['orderDate', 'DESC'], ['id', 'DESC']],
    limit: 1000
  });

  const orderUserIds = Array.from(new Set(orders.map(o => o.userId).filter(Boolean)));
  const orderStaffMap = {};
  if (orderUserIds.length > 0) {
    try {
      const profiles = await StaffProfile.findAll({ where: { userId: orderUserIds }, attributes: ['userId', 'name', 'phone', 'staffId'] });
      profiles.forEach(p => { orderStaffMap[p.userId] = p.name || p.phone; });
      const users = await User.findAll({ where: { id: orderUserIds }, attributes: ['id', 'phone'] });
      users.forEach(u => { if (!orderStaffMap[u.id]) orderStaffMap[u.id] = u.phone || `Staff #${u.id}`; });
    } catch (_) {}
  }

  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    orders = orders.filter((o) => {
      const cName = String(o.client?.name || '').toLowerCase();
      const dName = String(o.dealerName || '').toLowerCase();
      const phone = String(o.phone || o.client?.phone || '').toLowerCase();
      const sp = String(orderStaffMap[o.userId] || '').toLowerCase();
      const idStr = String(o.id);
      return cName.includes(q) || dName.includes(q) || phone.includes(q) || sp.includes(q) || idStr.includes(q);
    });
  }

  // Profile resolution
  let staffName = 'All Staff / Executives';
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
  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const cashAmount = orders
    .filter((o) => String(o.paymentMethod || '').toUpperCase().includes('CASH'))
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const onlineAmount = orders
    .filter((o) => {
      const m = String(o.paymentMethod || '').toUpperCase();
      return m.includes('ONLINE') || m.includes('UPI');
    })
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const creditAmount = orders
    .filter((o) => {
      const m = String(o.paymentMethod || '').toUpperCase();
      return m.includes('CREDIT') || m.includes('CHEQUE');
    })
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

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

  const rowsHtml = orders.map((o, idx) => {
    const clientName = o.client?.name || 'Walk-in / Direct Party';
    const clientPhone = o.phone || o.client?.phone || '';
    const dealerName = o.dealerName || '-';
    const sp = orderStaffMap[o.userId] || '-';
    const pm = String(o.paymentMethod || 'CASH').toUpperCase();
    let badgeClass = 'badge-cash';
    if (pm.includes('ONLINE') || pm.includes('UPI')) badgeClass = 'badge-online';
    if (pm.includes('CREDIT') || pm.includes('CHEQUE')) badgeClass = 'badge-credit';

    const hasItems = Array.isArray(o.items) && o.items.length > 0;
    const itemsHtml = hasItems
      ? `
        <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 8.5px; margin-bottom: 2px;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155; font-size: 8px; text-transform: uppercase;">
              <th style="padding: 3px 5px; text-align: left; border-bottom: 1px solid #cbd5e1;">Item Name</th>
              <th style="padding: 3px 5px; text-align: center; border-bottom: 1px solid #cbd5e1;">Size</th>
              <th style="padding: 3px 5px; text-align: center; border-bottom: 1px solid #cbd5e1;">Qty</th>
              <th style="padding: 3px 5px; text-align: right; border-bottom: 1px solid #cbd5e1;">Rate</th>
              <th style="padding: 3px 5px; text-align: right; border-bottom: 1px solid #cbd5e1;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${o.items.map(it => {
              const itName = it.name || it.productName || 'Product / Item';
              const itSize = it.size || '-';
              const itQty = it.qty ?? it.quantity ?? 1;
              const itPrice = Number(it.price || it.rate || 0);
              const itAmount = Number(it.amount || (itQty * itPrice));
              return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 3px 5px; font-weight: 700; color: #0f172a;">${itName}</td>
                  <td style="padding: 3px 5px; text-align: center; color: #64748b;">${itSize}</td>
                  <td style="padding: 3px 5px; text-align: center; font-weight: 700; color: #1e293b;">${itQty}</td>
                  <td style="padding: 3px 5px; text-align: right; color: #475569;">${formatINR(itPrice)}</td>
                  <td style="padding: 3px 5px; text-align: right; font-weight: 700; color: #0f172a;">${formatINR(itAmount)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ${(o.netAmount || o.gstAmount) ? `
          <div style="font-size: 8px; color: #64748b; margin-top: 2px; text-align: right; line-height: 1.3;">
            ${o.netAmount ? `<span>Net: <strong>${formatINR(o.netAmount)}</strong></span>` : ''}
            ${o.gstAmount ? `<span style="margin-left: 8px;">GST: <strong>${formatINR(o.gstAmount)}</strong></span>` : ''}
          </div>
        ` : ''}
        ${o.remarks ? `
          <div style="font-size: 8px; color: #475569; margin-top: 2px; background: #f8fafc; padding: 2px 4px; border-radius: 3px; border-left: 2px solid #94a3b8;">
            <strong>Note:</strong> ${o.remarks}
          </div>
        ` : ''}
      `
      : `
        <div style="color: #64748b; font-size: 9.5px;">Standard Order</div>
        ${o.remarks ? `<div style="font-size: 8px; color: #94a3b8; margin-top: 2px;"><em>Remarks: ${o.remarks}</em></div>` : ''}
      `;

    return `
      <tr>
        <td style="text-align: center; font-weight: 600; color: #64748b; vertical-align: top; padding-top: 8px;">${idx + 1}</td>
        <td style="vertical-align: top; padding-top: 8px;">
          <div style="font-weight: 800; color: #125ec9;">#ORD-${o.id}</div>
          <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">${formatDate(o.orderDate)}</div>
        </td>
        <td style="vertical-align: top; padding-top: 8px;">
          <div style="font-weight: 700; color: #0f172a;">${clientName}</div>
          ${clientPhone ? `<div style="font-size: 9.5px; color: #2563eb;">📞 ${clientPhone}</div>` : ''}
        </td>
        <td style="font-weight: 600; color: #4338ca; vertical-align: top; padding-top: 8px;">
          ${dealerName}
        </td>
        <td style="font-weight: 600; color: #334155; vertical-align: top; padding-top: 8px;">${sp}</td>
        <td style="text-align: center; vertical-align: top; padding-top: 8px;">
          <span class="badge ${badgeClass}">${pm}</span>
        </td>
        <td style="vertical-align: top; padding: 6px 8px;">
          ${itemsHtml}
        </td>
        <td style="text-align: right; font-weight: 800; font-size: 12px; color: #0f172a; vertical-align: top; padding-top: 8px;">
          ${formatINR(o.totalAmount)}
          ${o.gstAmount && Number(o.gstAmount) > 0 ? `<div style="font-size: 8px; color: #64748b; font-weight: 400; margin-top: 2px;">Incl. GST: ${formatINR(o.gstAmount)}</div>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sales Orders Report</title>
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
    .badge-cash { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-online { background: #e0f2fe; color: #0284c7; border: 1px solid #7dd3fc; }
    .badge-credit { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }

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
        <div class="report-heading">Sales Orders Report</div>
        <div class="report-meta"><strong>Period:</strong> ${periodLabel}</div>
        <div class="report-meta"><strong>Payment Mode:</strong> ${paymentMethod || 'All Payment Modes'}</div>
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
      <div class="profile-label">Total Booking Value</div>
      <div class="profile-val" style="color: #125ec9;">${formatINR(totalAmount)}</div>
    </div>
  </div>

  <!-- Metrics Summary Strip -->
  <table class="metrics-table">
    <tr>
      <td class="metric-box">
        <div class="metric-num">${totalOrders}</div>
        <div class="metric-title">Total Orders</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #125ec9;">
        <div class="metric-num" style="color: #125ec9;">${formatINR(totalAmount)}</div>
        <div class="metric-title">Total Revenue</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #16a34a;">
        <div class="metric-num" style="color: #16a34a;">${formatINR(cashAmount)}</div>
        <div class="metric-title">Cash Orders</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #0284c7;">
        <div class="metric-num" style="color: #0284c7;">${formatINR(onlineAmount)}</div>
        <div class="metric-title">Online / UPI</div>
      </td>
      <td class="metric-box" style="border-top: 3px solid #d97706;">
        <div class="metric-num" style="color: #d97706;">${formatINR(creditAmount)}</div>
        <div class="metric-title">Credit / Cheque</div>
      </td>
    </tr>
  </table>

  <!-- Orders Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 3%; text-align: center;">#</th>
        <th style="width: 11%;">Order ID & Date</th>
        <th style="width: 15%;">Client / Party</th>
        <th style="width: 11%;">Dealer Name</th>
        <th style="width: 11%;">Salesperson</th>
        <th style="width: 8%; text-align: center;">Payment</th>
        <th style="width: 30%;">Items & Product Details</th>
        <th style="width: 11%; text-align: right;">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      ${orders.length === 0 ? `
        <tr>
          <td colspan="8" style="text-align: center; padding: 24px; color: #64748b;">
            No orders recorded for the selected filter and period.
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
        <div class="sig-line">${userId ? staffName : 'Field Sales Executive'}</div>
        <div class="sig-sub">Prepared / Sales Executive</div>
      </td>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">Sales Manager / Commercial Head</div>
        <div class="sig-sub">Verified & Approved By</div>
      </td>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">Authorized Signatory / Accounts</div>
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

  return { pdfBuffer, totalCount: totalOrders, companyName };
}


/**
 * Generate PDF for Assigned Jobs / Tasks
 */
async function generateAssignedJobsReportPDF({
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

  if (userId) {
    where.staffUserId = Number(userId);
  } else if (effectiveOrgId) {
    where.orgAccountId = effectiveOrgId;
  }

  if (status && status !== 'ALL') {
    where.status = String(status).toLowerCase();
  }

  if (startDate && endDate) {
    where[Op.or] = [
      { assignedOn: { [Op.between]: [new Date(`${startDate}T00:00:00`), new Date(`${endDate}T23:59:59.999`)] } },
      { dueDate: { [Op.between]: [new Date(`${startDate}T00:00:00`), new Date(`${endDate}T23:59:59.999`)] } },
      { createdAt: { [Op.between]: [new Date(`${startDate}T00:00:00`), new Date(`${endDate}T23:59:59.999`)] } }
    ];
  } else if (startDate) {
    where[Op.or] = [
      { assignedOn: { [Op.gte]: new Date(`${startDate}T00:00:00`) } },
      { dueDate: { [Op.gte]: new Date(`${startDate}T00:00:00`) } },
      { createdAt: { [Op.gte]: new Date(`${startDate}T00:00:00`) } }
    ];
  } else if (endDate) {
    where[Op.or] = [
      { assignedOn: { [Op.lte]: new Date(`${endDate}T23:59:59.999`) } },
      { dueDate: { [Op.lte]: new Date(`${endDate}T23:59:59.999`) } },
      { createdAt: { [Op.lte]: new Date(`${endDate}T23:59:59.999`) } }
    ];
  }

  let jobs = await AssignedJob.findAll({
    where,
    include: [
      { model: Client, as: 'client', required: false },
      { model: User, as: 'staff', required: false }
    ],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: 1000
  });

  // Filter out deactivated clients if any
  jobs = jobs.filter(j => {
    if (!j.client) return true;
    return j.client.active !== false;
  });

  // Load staff profile names for staffUserIds
  const staffUserIds = Array.from(new Set(jobs.map(j => j.staffUserId).filter(Boolean)));
  const staffMap = {};
  if (staffUserIds.length > 0) {
    try {
      const profiles = await StaffProfile.findAll({
        where: { userId: staffUserIds },
        attributes: ['userId', 'name', 'phone', 'staffId']
      });
      profiles.forEach(p => {
        staffMap[p.userId] = {
          name: p.name || p.phone,
          phone: p.phone,
          staffId: p.staffId
        };
      });
      const users = await User.findAll({
        where: { id: staffUserIds },
        attributes: ['id', 'phone']
      });
      users.forEach(u => {
        if (!staffMap[u.id]) {
          staffMap[u.id] = { name: u.phone || `Staff #${u.id}`, phone: u.phone, staffId: '' };
        }
      });
    } catch (_) {}
  }

  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    jobs = jobs.filter(j => {
      const cName = String(j.client?.name || '').toLowerCase();
      const title = String(j.title || '').toLowerCase();
      const desc = String(j.description || '').toLowerCase();
      const addr = String(j.clientAddress || j.client?.location || '').toLowerCase();
      const stName = String(staffMap[j.staffUserId]?.name || '').toLowerCase();
      return cName.includes(q) || title.includes(q) || desc.includes(q) || addr.includes(q) || stName.includes(q);
    });
  }

  // Profile resolution for single staff report
  let staffName = 'All Field Staff / Executives';
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
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => String(j.status || '').toLowerCase() === 'complete' || String(j.status || '').toLowerCase() === 'completed').length;
  const inProgressJobs = jobs.filter(j => String(j.status || '').toLowerCase() === 'inprogress').length;
  const pendingJobs = totalJobs - completedJobs - inProgressJobs;
  const selfAssignedCount = jobs.filter(j => !!j.isSelfAssigned).length;
  const adminAssignedCount = totalJobs - selfAssignedCount;

  const generatedOn = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const periodLabel = (startDate && endDate)
    ? `${formatDate(startDate)} to ${formatDate(endDate)}`
    : (startDate ? `From ${formatDate(startDate)}` : (endDate ? `Up to ${formatDate(endDate)}` : 'All Time'));

  const rowsHtml = jobs.map((j, idx) => {
    const st = String(j.status || 'pending').toLowerCase();
    let badgeClass = 'badge-pending';
    let badgeText = 'PENDING';
    if (st === 'complete' || st === 'completed') {
      badgeClass = 'badge-verified';
      badgeText = 'COMPLETED';
    } else if (st === 'inprogress') {
      badgeClass = 'badge-inprogress';
      badgeText = 'IN PROGRESS';
    }

    const stInfo = staffMap[j.staffUserId] || { name: `Staff #${j.staffUserId || '-'}` };
    const clientName = j.client?.name || 'Client';
    const loc = j.clientAddress || j.client?.location || '-';

    return `
      <tr>
        <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: #0f172a;">${clientName}</div>
          ${j.client?.phone ? `<div style="font-size: 9.5px; color: #2563eb;">📞 ${j.client.phone}</div>` : ''}
          <div style="font-size: 9px; color: #64748b; max-width: 200px;">${loc}</div>
        </td>
        <td>
          <div style="font-weight: 700; color: #0f172a;">${j.title || ('Job #' + j.id)}</div>
          ${j.description ? `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">${j.description}</div>` : ''}
        </td>
        <td>
          <div style="font-weight: 600; color: #334155;">${stInfo.name}</div>
          ${stInfo.staffId ? `<div style="font-size: 9px; color: #64748b;">ID: ${stInfo.staffId}</div>` : ''}
        </td>
        <td style="text-align: center;">
          <span style="display: inline-block; background: ${j.isSelfAssigned ? '#faf5ff' : '#eff6ff'}; border: 1px solid ${j.isSelfAssigned ? '#d8b4fe' : '#bfdbfe'}; color: ${j.isSelfAssigned ? '#7e22ce' : '#1d4ed8'}; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700;">
            ${j.isSelfAssigned ? 'Self Assigned' : 'Admin Assigned'}
          </span>
        </td>
        <td style="text-align: center; color: #334155;">
          ${j.assignedOn ? formatDate(j.assignedOn) : '-'}
        </td>
        <td style="text-align: center; font-weight: 600; color: #0f172a;">
          ${j.dueDate ? formatDate(j.dueDate) : '-'}
        </td>
        <td style="text-align: center;">
          <span class="badge ${badgeClass}">${badgeText}</span>
        </td>
        <td style="font-size: 9px; color: #64748b;">
          ${j.startedAt ? `Start: ${formatTime(j.startedAt)}` : ''}
          ${j.endedAt ? `<br/>End: ${formatTime(j.endedAt)}` : ''}
          ${!j.startedAt && !j.endedAt ? '-' : ''}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Assigned Jobs Report</title>
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
    .badge-verified { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-inprogress { background: #e0ecff; color: #1d4ed8; border: 1px solid #93c5fd; }
    .badge-pending { background: #fff0c7; color: #987500; border: 1px solid #fde047; }

    .signatures-table { width: 100%; border-collapse: collapse; margin-top: 24px; page-break-inside: avoid; }
    .signatures-table td { width: 33.33%; text-align: center; padding: 0 16px; vertical-align: top; }
    .sig-line { border-top: 1px solid #94a3b8; padding-top: 6px; font-weight: 700; font-size: 10.5px; color: #0f172a; }
    .sig-sub { font-size: 9.5px; color: #64748b; margin-top: 2px; }

    .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>

  <!-- Header -->
  <table class="header-table">
    <tr>
      <td>
        <div class="company-title">${companyName}</div>
        <div class="company-sub">
          ${companyAddress ? companyAddress : 'Field Operations & Sales Task Management'}
          ${companyGst ? ` | GSTIN: ${companyGst}` : ''}
          ${companyPhone ? ` | Tel: ${companyPhone}` : ''}
        </div>
      </td>
      <td class="report-title">
        <div class="report-heading">Assigned Jobs Report</div>
        <div class="report-meta">Period: <strong>${periodLabel}</strong></div>
        <div class="report-meta">Status: <strong>${status && status !== 'ALL' ? String(status).toUpperCase() : 'ALL STATUSES'}</strong></div>
      </td>
    </tr>
  </table>

  <!-- Profile Card -->
  <div class="profile-card">
    <div class="profile-cell">
      <div class="profile-label">Report For</div>
      <div class="profile-val">${staffName}</div>
    </div>
    <div class="profile-cell">
      <div class="profile-label">Employee ID</div>
      <div class="profile-val">${staffEmpId || '-'}</div>
    </div>
    <div class="profile-cell">
      <div class="profile-label">Phone Contact</div>
      <div class="profile-val">${staffPhone || '-'}</div>
    </div>
    <div class="profile-cell">
      <div class="profile-label">Generated On</div>
      <div class="profile-val">${generatedOn}</div>
    </div>
  </div>

  <!-- Metric Summary -->
  <table class="metrics-table">
    <tr>
      <td class="metric-box">
        <div class="metric-num">${totalJobs}</div>
        <div class="metric-title">Total Assigned Jobs</div>
      </td>
      <td class="metric-box">
        <div class="metric-num" style="color: #15803d;">${completedJobs}</div>
        <div class="metric-title">Completed</div>
      </td>
      <td class="metric-box">
        <div class="metric-num" style="color: #1d4ed8;">${inProgressJobs}</div>
        <div class="metric-title">In Progress</div>
      </td>
      <td class="metric-box">
        <div class="metric-num" style="color: #b45309;">${pendingJobs}</div>
        <div class="metric-title">Pending</div>
      </td>
      <td class="metric-box">
        <div class="metric-num" style="color: #7e22ce;">${selfAssignedCount} / ${adminAssignedCount}</div>
        <div class="metric-title">Self / Admin Assigned</div>
      </td>
    </tr>
  </table>

  <!-- Data Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25px; text-align: center;">#</th>
        <th style="width: 140px;">Client & Location</th>
        <th style="width: 150px;">Job Title & Description</th>
        <th style="width: 100px;">Assigned Staff</th>
        <th style="width: 80px; text-align: center;">Allocation</th>
        <th style="width: 75px; text-align: center;">Assigned Date</th>
        <th style="width: 75px; text-align: center;">Due Date</th>
        <th style="width: 80px; text-align: center;">Status</th>
        <th style="width: 90px;">Execution Time</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">No assigned jobs found for this period</td></tr>'}
    </tbody>
  </table>

  <!-- Signatures Block -->
  <table class="signatures-table">
    <tr>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">${userId ? staffName : 'Field Operations Executive'}</div>
        <div class="sig-sub">Field Executive / Assignee</div>
      </td>
      <td>
        <div style="height: 30px;"></div>
        <div class="sig-line">Operations Manager / Area Head</div>
        <div class="sig-sub">Supervised & Verified By</div>
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

  return { pdfBuffer, totalCount: totalJobs, companyName };
}

module.exports = {
  generateAssignedJobsReportPDF,
  generateVisitsReportPDF,
  generateOrdersReportPDF
};
