const puppeteer = require('puppeteer');
const { ExpenseClaim, User, StaffProfile, OrgBusinessInfo, OrgAccount, StaffAdvance } = require('../models');

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) {
    return String(dateStr);
  }
}

function formatCurrency(num) {
  const n = Number(num || 0);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return 'Zero Rupees Only';

  const inWords = (n) => {
    let str = '';
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) str += a[n];
      else str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    }
    return str;
  };

  return inWords(n).trim() + ' Rupees Only';
}

async function generateExpenseClaimPDF(claimId, requestedUserId = null, orgAccountId = null) {
  const where = { id: claimId };
  if (requestedUserId) {
    where.userId = requestedUserId;
  }
  if (orgAccountId) {
    where.orgAccountId = orgAccountId;
  }

  const claim = await ExpenseClaim.findOne({ where });
  if (!claim) return null;

  const user = await User.findOne({
    where: { id: claim.userId },
    include: [{ model: StaffProfile, as: 'profile' }]
  });

  const { Op } = require('sequelize');
  let expenseAdvances = [];
  try {
    expenseAdvances = await StaffAdvance.findAll({
      where: {
        staffId: claim.userId,
        advanceCategory: 'expense',
        status: { [Op.ne]: 'cancelled' }
      },
      order: [['advanceDate', 'DESC']]
    });
  } catch (err) {
    console.error('Error fetching staff advance for claim PDF:', err);
  }
  const totalExpenseAdvance = expenseAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);

  const orgId = claim.orgAccountId || orgAccountId || user?.orgAccountId;
  let companyName = 'ThinkTech Solutions';
  let companyAddress = '';
  let companyGst = '';
  let companyPhone = '';
  let companyEmail = '';

  if (orgId) {
    try {
      const orgAcc = await OrgAccount.findByPk(orgId);
      const orgInfo = await OrgBusinessInfo.findOne({ where: { orgAccountId: orgId } });
      const { OrgBrand } = require('../models');
      const orgBrand = await OrgBrand.findOne({ where: { orgAccountId: orgId } });
      companyName = orgAcc?.name || orgInfo?.companyName || orgBrand?.displayName || 'ThinkTech Solutions';
      companyAddress = [orgInfo?.address, orgInfo?.city, orgInfo?.state, orgInfo?.pincode].filter(Boolean).join(', ');
      companyGst = orgInfo?.gstin || '';
      companyPhone = orgInfo?.phone || orgAcc?.phone || '';
      companyEmail = orgInfo?.email || orgAcc?.email || '';
    } catch (_) {}
  }

  const profile = user?.profile;
  const staffName = profile?.name || user?.name || user?.fullName || 'Staff Member';
  const staffId = profile?.staffId || `USR-${claim.userId}`;
  const department = profile?.department || '-';
  const designation = profile?.designation || '-';
  const staffPhone = profile?.phone || user?.phone || '-';
  const staffEmail = profile?.email || user?.email || '-';

  // Format Items
  let items = [];
  if (claim.items) {
    try {
      items = typeof claim.items === 'string' ? JSON.parse(claim.items) : claim.items;
    } catch (_) {
      items = [];
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    items = [{
      expenseType: claim.expenseType || 'General',
      amount: claim.amount,
      billNumber: claim.billNumber || '-',
      description: claim.description || '-',
      travelFrom: claim.travelFrom || null,
      travelTo: claim.travelTo || null,
      mode: claim.mode || null,
      attachmentUrl: claim.attachmentUrl || null
    }];
  }

  const status = String(claim.status || 'pending').toLowerCase();
  let statusBadgeColor = '#F59E0B'; // Pending (amber)
  let statusBadgeBg = '#FEF3C7';
  if (status === 'approved') {
    statusBadgeColor = '#10B981';
    statusBadgeBg = '#D1FAE5';
  } else if (status === 'rejected') {
    statusBadgeColor = '#EF4444';
    statusBadgeBg = '#FEE2E2';
  } else if (status === 'settled') {
    statusBadgeColor = '#3B82F6';
    statusBadgeBg = '#DBEAFE';
  }

  const rowsHtml = items.map((it, idx) => {
    let details = it.description || '-';
    if (it.expenseType === 'Travel' || it.travelFrom || it.travelTo) {
      const route = [it.travelFrom, it.travelTo].filter(Boolean).join(' → ');
      const modeStr = it.mode ? ` (${it.mode})` : '';
      const routeLine = route ? `<strong>Route:</strong> ${route}${modeStr}` : '';
      if (routeLine) {
        details = details && details !== '-' ? `${routeLine}<br/><span style="color:#6B7280; font-size:11px;">${details}</span>` : routeLine;
      }
    }

    return `
      <tr>
        <td style="text-align: center; width: 40px; padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 12px; color: #4B5563;">${idx + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 12px; font-weight: 600; color: #111827;">${it.expenseType || claim.expenseType || 'General'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 12px; color: #374151;">${details}</td>
        <td style="text-align: center; width: 120px; padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 12px; color: #4B5563;">${it.billNumber || '-'}</td>
        <td style="text-align: right; width: 110px; padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; font-weight: 700; color: #111827;">₹${formatCurrency(it.amount)}</td>
      </tr>
    `;
  }).join('');

  const totalAmount = Number(claim.amount || 0);
  const words = numberToWords(totalAmount);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Expense Claim - ${claim.claimId || `EC-${claim.id}`}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.5;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .company-title {
      font-size: 22px;
      font-weight: 800;
      color: #0F3B8C;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .company-sub {
      font-size: 11px;
      color: #6B7280;
      margin-top: 4px;
      line-height: 1.4;
    }
    .voucher-badge {
      text-align: right;
    }
    .voucher-title {
      font-size: 18px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .voucher-id {
      font-size: 13px;
      font-weight: 700;
      color: #0F3B8C;
      margin-top: 3px;
    }
    .status-pill {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 6px;
      background-color: ${statusBadgeBg};
      color: ${statusBadgeColor};
      border: 1px solid ${statusBadgeColor};
    }
    .divider {
      height: 3px;
      background: linear-gradient(90deg, #0F3B8C 0%, #0284C7 100%);
      margin-bottom: 20px;
      border-radius: 2px;
    }
    .info-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 22px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
    }
    .info-grid td {
      padding: 10px 14px;
      vertical-align: top;
      width: 50%;
    }
    .info-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .info-val {
      font-size: 13px;
      font-weight: 600;
      color: #0F172A;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      overflow: hidden;
    }
    .items-table th {
      background: #0F3B8C;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      border: none;
    }
    .total-box {
      width: 100%;
      margin-bottom: 24px;
    }
    .total-table {
      width: 320px;
      margin-left: auto;
      border-collapse: collapse;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
    }
    .total-table td {
      padding: 8px 14px;
      font-size: 13px;
    }
    .grand-total-row {
      background: #0F3B8C;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 15px;
    }
    .grand-total-row td {
      color: #FFFFFF !important;
      padding: 10px 14px;
    }
    .amount-words-box {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 12px;
      color: #1E40AF;
      margin-bottom: 24px;
    }
    .approval-box {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 12px;
      color: #166534;
      margin-bottom: 24px;
    }
    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 40px;
    }
    .signature-block {
      width: 33.33%;
      padding: 0 15px;
      text-align: center;
    }
    .signature-line {
      border-top: 1.5px dashed #94A3B8;
      padding-top: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #334155;
    }
    .signature-sub {
      font-size: 10px;
      color: #64748B;
      margin-top: 2px;
    }
    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 10px;
      color: #94A3B8;
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <!-- Header Table -->
  <table class="header-table">
    <tr>
      <td style="vertical-align: top;">
        <h1 class="company-title">${companyName}</h1>
        <div class="company-sub">
          ${companyAddress ? `${companyAddress}<br/>` : ''}
          ${companyPhone ? `Phone: ${companyPhone} ` : ''}
          ${companyEmail ? `• Email: ${companyEmail}` : ''}
          ${companyGst ? `<br/>GSTIN: ${companyGst}` : ''}
        </div>
      </td>
      <td class="voucher-badge" style="vertical-align: top;">
        <h2 class="voucher-title">Expense Voucher</h2>
        <div class="voucher-id">Voucher #: ${claim.claimId || `EC-${claim.id}`}</div>
        <div>
          <span class="status-pill">${status}</span>
        </div>
      </td>
    </tr>
  </table>

  <div class="divider"></div>

  <!-- Employee and Claim Details -->
  <table class="info-grid">
    <tr>
      <td style="border-right: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0;">
        <div class="info-label">Employee Name & ID</div>
        <div class="info-val">${staffName} (${staffId})</div>
      </td>
      <td style="border-bottom: 1px solid #E2E8F0;">
        <div class="info-label">Claim Date / Period</div>
        <div class="info-val">${formatDate(claim.expenseDate)}</div>
      </td>
    </tr>
    <tr>
      <td style="border-right: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0;">
        <div class="info-label">Department / Designation</div>
        <div class="info-val">${department} &bull; ${designation}</div>
      </td>
      <td style="border-bottom: 1px solid #E2E8F0;">
        <div class="info-label">Submission Date</div>
        <div class="info-val">${formatDate(claim.createdAt)}</div>
      </td>
    </tr>
    <tr>
      <td style="border-right: 1px solid #E2E8F0;">
        <div class="info-label">Contact Details</div>
        <div class="info-val">${staffPhone} &bull; ${staffEmail}</div>
      </td>
      <td>
        <div class="info-label">Category / Purpose</div>
        <div class="info-val">${claim.expenseType || 'General Expense'}${claim.description ? ` (${claim.description})` : ''}</div>
      </td>
    </tr>
  </table>

  <!-- Itemized Expenses Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="text-align: center; width: 40px;">#</th>
        <th style="width: 140px;">Category</th>
        <th>Particulars / Description</th>
        <th style="text-align: center; width: 120px;">Bill / Inv #</th>
        <th style="text-align: right; width: 110px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  ${(() => {
    const claimAppAmt = claim.approvedAmount !== null && claim.approvedAmount !== undefined ? Number(claim.approvedAmount) : Number(totalAmount);
    const claimDirectPaid = Number(claim.paidAmount || 0);
    const claimNetToSettle = Math.max(0, claimAppAmt - claimDirectPaid);
    const claimDiff = claimNetToSettle - totalExpenseAdvance;

    return `
  <!-- Total Summary -->
  <div class="total-box">
    <table class="total-table">
      <tr>
        <td style="color: #4B5563;">Total Claimed:</td>
        <td style="text-align: right; font-weight: 700; color: #111827;">₹${formatCurrency(totalAmount)}</td>
      </tr>
      ${claim.approvedAmount !== null && claim.approvedAmount !== undefined ? `
      <tr>
        <td style="color: #059669; font-weight: 600;">Approved Amount:</td>
        <td style="text-align: right; font-weight: 700; color: #059669;">₹${formatCurrency(claim.approvedAmount)}</td>
      </tr>
      ` : ''}
      ${claimDirectPaid > 0 ? `
      <tr>
        <td style="color: #D97706; font-weight: 600;">Direct Paid (Cash / Online):</td>
        <td style="text-align: right; font-weight: 700; color: #D97706;">₹${formatCurrency(claimDirectPaid)}</td>
      </tr>
      ` : ''}
      ${totalExpenseAdvance > 0 && status === 'settled' ? `
      <tr>
        <td style="color: #7C3AED; font-weight: 600;">Advance Against Expense:</td>
        <td style="text-align: right; font-weight: 700; color: #7C3AED;">₹${formatCurrency(totalExpenseAdvance)}</td>
      </tr>
      <tr>
        <td style="color: #059669; font-weight: 600;">Settled from Advance:</td>
        <td style="text-align: right; font-weight: 700; color: #059669;">- ₹${formatCurrency(Math.min(totalExpenseAdvance, claimNetToSettle))}</td>
      </tr>
      ${claimDiff < 0 ? `
      <tr style="background: #FEF2F2; border: 1.5px solid #FCA5A5;">
        <td style="color: #B91C1C; font-weight: 800; padding: 7px 8px;">Net Deducted in Payroll (Salary Recovery):</td>
        <td style="text-align: right; font-weight: 900; color: #DC2626; font-size: 13px; padding: 7px 8px;">₹${formatCurrency(Math.abs(claimDiff))}</td>
      </tr>
      ` : claimDiff > 0 ? `
      <tr style="background: #F0FDF4; border: 1.5px solid #86EFAC;">
        <td style="color: #166534; font-weight: 800; padding: 7px 8px;">Net Reimbursed in Salary via Payroll:</td>
        <td style="text-align: right; font-weight: 900; color: #16A34A; font-size: 13px; padding: 7px 8px;">+ ₹${formatCurrency(claimDiff)}</td>
      </tr>
      ` : `
      <tr style="background: #EFF6FF; border: 1.5px solid #93C5FD;">
        <td style="color: #1E40AF; font-weight: 800; padding: 7px 8px;">Advance vs Expense Balance:</td>
        <td style="text-align: right; font-weight: 900; color: #2563EB; font-size: 13px; padding: 7px 8px;">₹0.00 (Fully Settled)</td>
      </tr>
      `}
      ` : totalExpenseAdvance > 0 ? `
      <tr>
        <td style="color: #7C3AED; font-weight: 600;">Advance Against Expense:</td>
        <td style="text-align: right; font-weight: 700; color: #7C3AED;">₹${formatCurrency(totalExpenseAdvance)}</td>
      </tr>
      <tr>
        <td colspan="2" style="font-size: 10px; color: #64748B; padding: 3px 0; text-align: right;">
          <em>(दावा Approved & Settled होने के बाद पेरोल में एडजस्ट होगा)</em>
        </td>
      </tr>
      ` : ''}
      <tr class="grand-total-row">
        <td>Total Expense Value:</td>
        <td style="text-align: right;">₹${formatCurrency(claim.approvedAmount !== null && claim.approvedAmount !== undefined ? claim.approvedAmount : totalAmount)}</td>
      </tr>
    </table>
  </div>

  <div class="amount-words-box">
    <strong>Amount in Words:</strong> ${words}
  </div>

  ${(status === 'approved' || status === 'settled') && (claim.approvedBy || claim.approvedAt) ? `
  <div class="approval-box">
    ✔ <strong>Approval Details:</strong> Approved by <strong>${claim.approvedBy || 'Admin / Management'}</strong> on <strong>${formatDate(claim.approvedAt)}</strong>${claim.settledAt ? ` &bull; Settled on <strong>${formatDate(claim.settledAt)}</strong>` : ''}
  </div>
  ` : ''}
  ${totalExpenseAdvance > 0 && status === 'settled' ? `
  <div style="background: ${claimDiff < 0 ? '#FEF2F2' : claimDiff > 0 ? '#F0FDF4' : '#F5F3FF'}; border: 1.5px solid ${claimDiff < 0 ? '#FCA5A5' : claimDiff > 0 ? '#86EFAC' : '#DDD6FE'}; border-radius: 8px; padding: 12px 16px; margin-top: 14px;">
    <div style="font-size: 12px; font-weight: 800; color: ${claimDiff < 0 ? '#991B1B' : claimDiff > 0 ? '#166534' : '#6B21A8'}; text-transform: uppercase; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
      <span>🧾 Advance Against Expense & Payroll Settlement Summary</span>
      <span style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: #FFFFFF; border: 1px solid ${claimDiff < 0 ? '#F87171' : '#4ADE80'}; color: ${claimDiff < 0 ? '#DC2626' : '#16A34A'};">
        ${claimDiff < 0 ? 'DEDUCTION IN PAYROLL' : claimDiff > 0 ? 'REIMBURSEMENT IN PAYROLL' : 'EXACT MATCH'}
      </span>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #374151;">
      <tr>
        <td style="padding: 4px 0;">1. कुल एडवांस लिया गया (Advance Taken):</td>
        <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #7C3AED; font-size: 12px;">₹${formatCurrency(totalExpenseAdvance)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">2. अप्रूव्ड खर्चा (Approved Expense Claim):</td>
        <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #059669; font-size: 12px;">₹${formatCurrency(claimAppAmt)}</td>
      </tr>
      ${claimDirectPaid > 0 ? `
      <tr>
        <td style="padding: 4px 0;">3. सीधा कैश/ऑनलाइन पे किया गया (Direct Paid):</td>
        <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #D97706; font-size: 12px;">₹${formatCurrency(claimDirectPaid)}</td>
      </tr>
      ` : ''}
      <tr style="border-top: 1.5px dashed ${claimDiff < 0 ? '#FCA5A5' : '#86EFAC'};">
        <td style="padding: 8px 0; font-size: 12px; font-weight: 800; color: ${claimDiff < 0 ? '#991B1B' : '#166534'};">
          ${claimDiff < 0 ? '4. पेरोल में सैलरी से कटेगा (Deducted from Salary):' : '4. पेरोल में सैलरी में जुड़ेगा (Reimbursed in Salary):'}
        </td>
        <td style="padding: 8px 0; text-align: right; font-size: 16px; font-weight: 900; color: ${claimDiff < 0 ? '#DC2626' : '#16A34A'};">
          ${claimDiff < 0 ? `- ₹${formatCurrency(Math.abs(claimDiff))}` : `+ ₹${formatCurrency(claimDiff)}`}
        </td>
      </tr>
    </table>
    
    <div style="margin-top: 6px; font-size: 10px; color: #6B7280; line-height: 1.4;">
      ${claimDiff < 0 
        ? `* कुल एडवांस <strong>₹${formatCurrency(totalExpenseAdvance)}</strong> में से <strong>₹${formatCurrency(claimNetToSettle)}</strong> का खर्चा एडजस्ट हो गया। शेष <strong>₹${formatCurrency(Math.abs(claimDiff))}</strong> कर्मचारी की मासिक सैलरी से <strong>advance_against_expense</strong> के तहत काट लिया जाएगा।`
        : `* कुल खर्चा <strong>₹${formatCurrency(claimNetToSettle)}</strong> एडवांस <strong>₹${formatCurrency(totalExpenseAdvance)}</strong> से ज्यादा था। अतिरिक्त <strong>₹${formatCurrency(claimDiff)}</strong> कर्मचारी को सैलरी में जोड़कर दिया जाएगा।`}
    </div>
  </div>
  ` : ''}
    `;
  })()}

  <!-- Signatures -->
  <table class="signatures-table">
    <tr>
      <td class="signature-block">
        <div style="height: 40px;"></div>
        <div class="signature-line">Claimant / Employee</div>
        <div class="signature-sub">${staffName}</div>
      </td>
      <td class="signature-block">
        <div style="height: 40px;"></div>
        <div class="signature-line">Verified By</div>
        <div class="signature-sub">Reporting Manager / TL</div>
      </td>
      <td class="signature-block">
        <div style="height: 40px;"></div>
        <div class="signature-line">Approved / Authorized</div>
        <div class="signature-sub">Accounts / HR Department</div>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <div class="footer">
    This is an authentic computer-generated document from ${companyName} VetanSutra ERP system. Generated on ${new Date().toLocaleString('en-IN')}.
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
    printBackground: true,
    margin: {
      top: '12mm',
      right: '12mm',
      bottom: '12mm',
      left: '12mm'
    }
  });
  await browser.close();

  return {
    pdfBuffer,
    claimId: claim.claimId || `EC-${claim.id}`,
    claim
  };
}

async function generateExpenseReportPDF({ userId, orgAccountId = null, startDate = null, endDate = null, status = null, category = null, allowedUserIds = null }) {
  const { Op } = require('sequelize');

  let orgStaffIds = [];
  if (Array.isArray(allowedUserIds) && allowedUserIds.length > 0) {
    orgStaffIds = allowedUserIds;
  } else if (orgAccountId) {
    try {
      const orgUsers = await User.findAll({
        where: { orgAccountId },
        attributes: ['id']
      });
      orgStaffIds = orgUsers.map(u => u.id);
    } catch (e) {
      console.error('Error fetching org users for expense report:', e);
    }
  }

  const where = {};
  if (userId) {
    where.userId = userId;
  } else if (orgStaffIds.length > 0) {
    if (Array.isArray(allowedUserIds) && allowedUserIds.length > 0) {
      where.userId = { [Op.in]: allowedUserIds };
    } else {
      where[Op.or] = [
        { userId: { [Op.in]: orgStaffIds } },
        { orgAccountId: orgAccountId }
      ];
    }
  } else if (orgAccountId) {
    where.orgAccountId = orgAccountId;
  }

  if (startDate && endDate) {
    where.expenseDate = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    where.expenseDate = { [Op.gte]: startDate };
  } else if (endDate) {
    where.expenseDate = { [Op.lte]: endDate };
  }

  if (status && status !== 'ALL' && status !== 'all') {
    where.status = status.toLowerCase();
  }

  if (category && category !== 'ALL' && category !== 'all') {
    where.expenseType = category;
  }

  const claims = await ExpenseClaim.findAll({
    where,
    order: [['expenseDate', 'DESC'], ['id', 'DESC']]
  });

  const user = userId ? await User.findOne({
    where: { id: userId },
    include: [{ model: StaffProfile, as: 'profile' }]
  }) : null;

  let orgId = orgAccountId || user?.orgAccountId;
  if (!orgId && expenses.length > 0 && expenses[0].orgAccountId) {
    orgId = expenses[0].orgAccountId;
  }
  let companyName = 'ThinkTech Solutions';
  let companyAddress = '';
  let companyGst = '';
  let companyPhone = '';
  let companyEmail = '';

  if (orgId) {
    try {
      const orgAcc = await OrgAccount.findByPk(orgId);
      const orgInfo = await OrgBusinessInfo.findOne({ where: { orgAccountId: orgId } });
      const { OrgBrand } = require('../models');
      const orgBrand = await OrgBrand.findOne({ where: { orgAccountId: orgId } });
      companyName = orgAcc?.name || orgInfo?.companyName || orgBrand?.displayName || 'ThinkTech Solutions';
      companyAddress = [orgInfo?.address, orgInfo?.city, orgInfo?.state, orgInfo?.pincode].filter(Boolean).join(', ');
      companyGst = orgInfo?.gstin || '';
      companyPhone = orgInfo?.phone || orgAcc?.phone || '';
      companyEmail = orgInfo?.email || orgAcc?.email || '';
    } catch (_) {}
  }

  const profile = user?.profile;
  const staffName = user ? (profile?.name || user?.name || user?.fullName || 'Staff Member') : 'All Staff Members';
  const staffId = user ? (profile?.staffId || `USR-${userId}`) : 'All Staff';
  const department = user ? (profile?.department || '-') : 'All Departments';
  const designation = user ? (profile?.designation || '-') : '-';

  const userMap = {};
  if (!userId && orgId) {
    try {
      const orgStaff = await User.findAll({
        where: { orgAccountId: orgId },
        include: [{ model: StaffProfile, as: 'profile' }]
      });
      orgStaff.forEach(u => {
        userMap[u.id] = u.profile?.name || u.name || `Staff #${u.id}`;
      });
    } catch (_) {}
  }

  const totalCount = claims.length;
  const totalClaimed = claims.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalApproved = claims.reduce((sum, c) => {
    if (c.status === 'approved' || c.status === 'settled') {
      return sum + (c.approvedAmount !== null && c.approvedAmount !== undefined ? Number(c.approvedAmount) : Number(c.amount || 0));
    }
    return sum;
  }, 0);
  const totalPaid = claims.reduce((sum, c) => sum + Number(c.paidAmount || 0), 0);

  // Fetch Advance Against Expense records for staff
  let expenseAdvances = [];
  try {
    const advWhere = {
      advanceCategory: 'expense',
      status: { [Op.ne]: 'cancelled' }
    };
    if (userId) advWhere.staffId = userId;
    if (orgId) advWhere.orgAccountId = orgId;
    if (startDate && endDate) {
      advWhere[Op.or] = [
        { advanceDate: { [Op.between]: [startDate, endDate] } },
        { deductionMonth: { [Op.between]: [String(startDate).slice(0, 7), String(endDate).slice(0, 7)] } }
      ];
    }
    expenseAdvances = await StaffAdvance.findAll({
      where: advWhere,
      order: [['advanceDate', 'ASC']]
    });
  } catch (err) {
    console.error('Error fetching expense advances for report PDF:', err);
  }

  const totalExpenseAdvance = expenseAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  
  // Advance against expense reconciliation ONLY applies to claims that are settled (status === 'settled')
  const settledClaims = claims.filter(c => c.status === 'settled');
  const hasSettledClaims = settledClaims.length > 0;
  const totalSettledApproved = settledClaims.reduce((sum, c) => {
    return sum + (c.approvedAmount !== null && c.approvedAmount !== undefined ? Number(c.approvedAmount) : Number(c.amount || 0));
  }, 0);
  const totalSettledPaid = settledClaims.reduce((sum, c) => sum + Number(c.paidAmount || 0), 0);
  const remainingSettledExpense = Math.max(0, totalSettledApproved - totalSettledPaid);
  const reconDiff = remainingSettledExpense - totalExpenseAdvance;

  const filterSummary = [];
  if (startDate && endDate) {
    filterSummary.push(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`);
  } else if (startDate) {
    filterSummary.push(`From: ${formatDate(startDate)}`);
  } else if (endDate) {
    filterSummary.push(`To: ${formatDate(endDate)}`);
  } else {
    filterSummary.push('Period: All Time');
  }

  if (status && status !== 'ALL' && status !== 'all') {
    filterSummary.push(`Status: ${status.toUpperCase()}`);
  } else {
    filterSummary.push('Status: ALL');
  }

  if (category && category !== 'ALL' && category !== 'all') {
    filterSummary.push(`Category: ${category}`);
  }

  const rowsHtml = claims.length === 0
    ? `<tr><td colspan="8" style="text-align: center; padding: 24px; color: #6B7280; font-size: 13px;">No expense claims found matching the criteria.</td></tr>`
    : claims.map((c, idx) => {
        let details = c.description || '-';
        if (c.items) {
          try {
            const its = typeof c.items === 'string' ? JSON.parse(c.items) : c.items;
            if (Array.isArray(its) && its.length > 0) {
              const detailsList = its.map(it => {
                if (it.travelFrom || it.travelTo) {
                  return `${[it.travelFrom, it.travelTo].filter(Boolean).join(' → ')}${it.mode ? ` (${it.mode})` : ''}`;
                }
                return it.description || it.expenseType || '';
              }).filter(Boolean);
              if (detailsList.length > 0) {
                details = detailsList.join(', ');
              }
            }
          } catch (_) {}
        } else if (c.travelFrom || c.travelTo) {
          details = `${[c.travelFrom, c.travelTo].filter(Boolean).join(' → ')}${c.mode ? ` (${c.mode})` : ''}`;
        }

        const s = String(c.status || 'pending').toLowerCase();
        let sColor = '#F59E0B', sBg = '#FEF3C7';
        if (s === 'approved') { sColor = '#10B981'; sBg = '#D1FAE5'; }
        else if (s === 'rejected') { sColor = '#EF4444'; sBg = '#FEE2E2'; }
        else if (s === 'settled') { sColor = '#3B82F6'; sBg = '#DBEAFE'; }

        const approvedAmt = (c.status === 'approved' || c.status === 'settled')
          ? (c.approvedAmount !== null && c.approvedAmount !== undefined ? c.approvedAmount : c.amount)
          : null;

        return `
          <tr>
            <td style="text-align: center; padding: 8px 6px; border-bottom: 1px solid #E5E7EB; font-size: 11px; color: #4B5563;">${idx + 1}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 11px; color: #111827; white-space: nowrap;">
              <strong>${c.claimId || `EC-${c.id}`}</strong><br/>
              ${!userId && userMap[c.userId] ? `<span style="color: #0F3B8C; font-weight: 700; font-size: 10px;">${userMap[c.userId]}<br/></span>` : ''}
              <span style="color: #6B7280; font-size: 10px;">${formatDate(c.expenseDate)}</span>
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 11px; color: #111827; font-weight: 600;">
              ${c.expenseType || 'General'}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 11px; color: #374151;">
              ${details}
            </td>
            <td style="text-align: center; padding: 8px 6px; border-bottom: 1px solid #E5E7EB; font-size: 11px; color: #4B5563;">
              ${c.billNumber || '-'}
            </td>
            <td style="text-align: center; padding: 8px 6px; border-bottom: 1px solid #E5E7EB;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: ${sBg}; color: ${sColor}; border: 0.5px solid ${sColor};">${s}</span>
            </td>
            <td style="text-align: right; padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px; font-weight: 700; color: #111827; white-space: nowrap;">
              ₹${formatCurrency(c.amount)}
            </td>
            <td style="text-align: right; padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px; font-weight: 700; color: ${approvedAmt !== null ? '#059669' : '#9CA3AF'}; white-space: nowrap;">
              ${approvedAmt !== null ? `₹${formatCurrency(approvedAmt)}` : '-'}
            </td>
          </tr>
        `;
      }).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Expense Summary Report - ${staffName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm 12mm 12mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 12px;
      line-height: 1.4;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .company-title {
      font-size: 20px;
      font-weight: 800;
      color: #0F3B8C;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .company-sub {
      font-size: 10px;
      color: #6B7280;
      margin-top: 3px;
      line-height: 1.3;
    }
    .report-badge {
      text-align: right;
    }
    .report-title {
      font-size: 18px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .report-meta {
      font-size: 11px;
      color: #4B5563;
      margin-top: 4px;
      font-weight: 500;
    }
    .divider {
      height: 3px;
      background: linear-gradient(90deg, #0F3B8C 0%, #0284C7 100%);
      margin-bottom: 14px;
      border-radius: 2px;
    }
    .info-bar {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
    }
    .info-bar td {
      padding: 8px 12px;
      font-size: 11px;
    }
    .kpi-row {
      width: 100%;
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    .kpi-card {
      flex: 1;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
      background: #F8FAFC;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .kpi-val {
      font-size: 18px;
      font-weight: 800;
      margin-top: 2px;
      color: #0F172A;
    }
    .table-container {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      overflow: hidden;
    }
    .table-container th {
      background: #0F3B8C;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 9px 10px;
      border: none;
    }
    .grand-total-row {
      background: #F1F5F9;
      font-weight: 800;
      font-size: 12px;
    }
    .grand-total-row td {
      padding: 10px;
      border-top: 2px solid #CBD5E1;
      border-bottom: 2px solid #CBD5E1;
      color: #0F172A;
    }
    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      page-break-inside: avoid;
    }
    .signature-block {
      width: 33.33%;
      padding: 0 20px;
      text-align: center;
    }
    .signature-line {
      border-top: 1.5px dashed #94A3B8;
      padding-top: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
    }
    .signature-sub {
      font-size: 9px;
      color: #64748B;
      margin-top: 1px;
    }
    .footer {
      margin-top: 14px;
      margin-bottom: 6px;
      text-align: center;
      font-size: 9px;
      color: #94A3B8;
      border-top: 1px solid #E2E8F0;
      padding-top: 6px;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="vertical-align: top;">
        <h1 class="company-title">${companyName}</h1>
        <div class="company-sub">
          ${companyAddress ? `${companyAddress} • ` : ''}
          ${companyPhone ? `Phone: ${companyPhone} • ` : ''}
          ${companyEmail ? `Email: ${companyEmail}` : ''}
          ${companyGst ? ` • GSTIN: ${companyGst}` : ''}
        </div>
      </td>
      <td class="report-badge" style="vertical-align: top;">
        <h2 class="report-title">Expense Report</h2>
        <div class="report-meta">${filterSummary.join(' | ')}</div>
        <div style="font-size: 10px; color: #6B7280; margin-top: 2px;">Generated on: ${new Date().toLocaleString('en-IN')}</div>
      </td>
    </tr>
  </table>

  <div class="divider"></div>

  <!-- Employee Info Strip -->
  <table class="info-bar">
    <tr>
      <td><strong>Employee:</strong> ${staffName} (${staffId})</td>
      <td><strong>Department:</strong> ${department}</td>
      <td><strong>Designation:</strong> ${designation}</td>
      <td style="text-align: right;"><strong>Total Records:</strong> ${totalCount} Claim(s)</td>
    </tr>
  </table>

  <!-- KPI Metrics Bar -->
  <table style="width: 100%; border-collapse: separate; border-spacing: 10px; margin-bottom: 14px;">
    <tr>
      <td style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 10px 14px; width: 25%;">
        <div class="kpi-label" style="color: #1E40AF;">Total Claims</div>
        <div class="kpi-val" style="color: #1E3A8A;">${totalCount}</div>
      </td>
      <td style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; width: 25%;">
        <div class="kpi-label">Claimed Amount</div>
        <div class="kpi-val">₹${formatCurrency(totalClaimed)}</div>
      </td>
      <td style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 10px 14px; width: 25%;">
        <div class="kpi-label" style="color: #166534;">Approved Amount</div>
        <div class="kpi-val" style="color: #14532D;">₹${formatCurrency(totalApproved)}</div>
      </td>
      <td style="background: #FAF5FF; border: 1px solid #E9D5FF; border-radius: 8px; padding: 10px 14px; width: 25%;">
        <div class="kpi-label" style="color: #6B21A8;">Settled Amount</div>
        <div class="kpi-val" style="color: #581C87;">₹${formatCurrency(totalPaid)}</div>
      </td>
    </tr>
  </table>

  <!-- Claims Table -->
  <table class="table-container">
    <thead>
      <tr>
        <th style="text-align: center; width: 35px;">#</th>
        <th style="width: 130px;">Claim ID & Date</th>
        <th style="width: 100px;">Category</th>
        <th>Particulars / Details</th>
        <th style="text-align: center; width: 85px;">Bill #</th>
        <th style="text-align: center; width: 75px;">Status</th>
        <th style="text-align: right; width: 95px;">Claimed (₹)</th>
        <th style="text-align: right; width: 95px;">Approved (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      ${claims.length > 0 ? `
      <tr class="grand-total-row">
        <td colspan="6" style="text-align: right;">Total Summary:</td>
        <td style="text-align: right;">₹${formatCurrency(totalClaimed)}</td>
        <td style="text-align: right; color: #059669;">₹${formatCurrency(totalApproved)}</td>
      </tr>
      ` : ''}
    </tbody>
  </table>

  ${totalExpenseAdvance > 0 ? `
  <!-- Advance Against Expense & Payroll Reconciliation Section -->
  <div style="margin-top: 14px; margin-bottom: 16px; background: #FFFFFF; border: 1.5px solid #CBD5E1; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
    <div style="background: #0F3B8C; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #FFFFFF; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
        🧾 Advance Against Expense & Payroll Reconciliation Details
      </span>
      <span style="color: #BFDBFE; font-size: 10px; font-weight: 600;">
        ${hasSettledClaims ? 'Settled Breakdown' : 'Settlement Pending'}
      </span>
    </div>

    ${hasSettledClaims ? `
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; width: 52%; vertical-align: top;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="padding: 5px 0; color: #475569;">1. Advance Taken (Against Expense):</td>
              <td style="padding: 5px 0; text-align: right; font-weight: 700; color: #7C3AED; font-size: 12px;">₹${formatCurrency(totalExpenseAdvance)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #475569;">2. Settled Expense Claims:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: 700; color: #059669; font-size: 12px;">₹${formatCurrency(totalSettledApproved)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #475569;">3. Direct Paid via "Pay" Button / Cash:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: 700; color: #D97706; font-size: 12px;">₹${formatCurrency(totalSettledPaid)}</td>
            </tr>
            <tr style="border-top: 1.5px dashed #CBD5E1;">
              <td style="padding: 6px 0; font-weight: 700; color: #1E293B;">4. Net Settled Claims for Payroll:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #2563EB; font-size: 12px;">₹${formatCurrency(remainingSettledExpense)}</td>
            </tr>
          </table>
        </td>

        <td style="padding: 14px 16px; border-bottom: 1px solid #E2E8F0; width: 48%; vertical-align: middle; background: ${reconDiff < 0 ? '#FEF2F2' : reconDiff > 0 ? '#F0FDF4' : '#EFF6FF'}; border-left: 1px solid #E2E8F0;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${reconDiff < 0 ? '#991B1B' : reconDiff > 0 ? '#166534' : '#1E40AF'}; letter-spacing: 0.5px;">
            Payroll Settlement Result
          </div>
          <div style="font-size: 18px; font-weight: 900; margin-top: 4px; color: ${reconDiff < 0 ? '#DC2626' : reconDiff > 0 ? '#16A34A' : '#2563EB'};">
            ${reconDiff < 0 
              ? `- ₹${formatCurrency(Math.abs(reconDiff))} (SALARY DEDUCTION)` 
              : reconDiff > 0 
              ? `+ ₹${formatCurrency(reconDiff)} (SALARY REIMBURSEMENT)` 
              : '₹0.00 (EXACT MATCH / ZERO BALANCE)'}
          </div>
          <div style="font-size: 10px; color: #475569; margin-top: 5px; line-height: 1.45;">
            ${reconDiff < 0 
              ? `Advance (₹${formatCurrency(totalExpenseAdvance)}) net settled claims se jyada tha. Excess <strong>₹${formatCurrency(Math.abs(reconDiff))}</strong> employee ki monthly salary se deduct (advance recovery) hoga.` 
              : reconDiff > 0 
              ? `Net settled claims (₹${formatCurrency(remainingSettledExpense)}) advance se jyada the. Additional <strong>₹${formatCurrency(reconDiff)}</strong> employee ki salary mein add (reimbursement) hokar milega.` 
              : `Advance aur settled claims exact match ho gaye. Pehle se diya gaya advance poora adjust ho gaya (No extra deduction/addition).`}
          </div>
        </td>
      </tr>
    </table>
    ` : `
    <div style="padding: 14px 16px; background: #F8FAFC;">
      <div style="font-size: 11px; font-weight: 700; color: #334155; display: flex; justify-content: space-between; align-items: center;">
        <span>ℹ️ Advance Against Expense on File: <strong>₹${formatCurrency(totalExpenseAdvance)}</strong></span>
        <span style="background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;">SETTLEMENT PENDING</span>
      </div>
      <div style="font-size: 10px; color: #64748B; margin-top: 5px; line-height: 1.4;">
        * वर्तमान में कोई भी दावा <strong>Settled</strong> नहीं हुआ है। जब दावा एडमिन द्वारा Approved होकर Settled मार्क होगा, तभी पेरोल में एडवांस का हिसाब (Deduction या Reimbursement) एडजस्ट किया जाएगा।
      </div>
    </div>
    `}

    ${expenseAdvances.length > 0 ? `
    <div style="padding: 7px 14px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 10px; font-weight: 700; color: #475569;">
      Advance Against Expense Records on File:
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
      <thead>
        <tr style="background: #F1F5F9; color: #475569; border-bottom: 1px solid #E2E8F0;">
          <th style="padding: 6px 12px; text-align: left; width: 100px;">Advance ID</th>
          <th style="padding: 6px 12px; text-align: left; width: 110px;">Date Given</th>
          <th style="padding: 6px 12px; text-align: left;">Notes / Purpose</th>
          <th style="padding: 6px 12px; text-align: right; width: 120px;">Advance Amount</th>
        </tr>
      </thead>
      <tbody>
        ${expenseAdvances.map(a => `
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 5px 12px; font-weight: 700; color: #0F172A;">ADV-${a.id}</td>
            <td style="padding: 5px 12px; color: #64748B;">${formatDate(a.advanceDate)}</td>
            <td style="padding: 5px 12px; color: #334155;">${a.notes || 'Advance Against Expense'}</td>
            <td style="padding: 5px 12px; text-align: right; font-weight: 700; color: #7C3AED;">₹${formatCurrency(a.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
  </div>
  ` : ''}

  <!-- Signatures -->
  <table class="signatures-table">
    <tr>
      <td class="signature-block">
        <div style="height: 22px;"></div>
        <div class="signature-line">Employee Signature</div>
        <div class="signature-sub">${staffName}</div>
      </td>
      <td class="signature-block">
        <div style="height: 22px;"></div>
        <div class="signature-line">Verified By</div>
        <div class="signature-sub">Reporting Manager / Team Leader</div>
      </td>
      <td class="signature-block">
        <div style="height: 22px;"></div>
        <div class="signature-line">Authorized Approval</div>
        <div class="signature-sub">Finance & HR Department</div>
      </td>
    </tr>
  </table>

  <div class="footer">
    This is an authentic computer-generated consolidated expense summary report from ${companyName} VetanSutra ERP. Page 1 of 1
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
    claims
  };
}

module.exports = {
  generateExpenseClaimPDF,
  generateExpenseReportPDF
};
