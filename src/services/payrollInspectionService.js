const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const {
  User,
  StaffProfile,
  StaffAdvance,
  AttendanceAutomationRule,
  PayrollCycle,
  PayrollLine,
  LeaveRequest,
  OrgAccount,
  Attendance,
  StaffRoster,
} = require('../models');
const { calculateSalary, computeOvertimeMeta } = require('./payrollService');
const {
  loadGeneratedPayrollMonths,
  computeStaffAdvancePayroll,
} = require('./staffAdvancePayroll');

const uploadSessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000;

const FIELD_ALIASES = {
  staffId: ['staff id', 'emp id', 'employee id', 'employee code', 'code', 'staffid', 'emp code', 'ft no', 'ft'],
  name: ['name', 'employee name', 'staff name', 'emp name', 'employee'],
  month: ['month', 'payroll month', 'salary month', 'pay month'],
  absent: ['absent', 'absents', 'absence', 'absent days', 'lop', 'lop days', 'loss of pay', 'unpaid days'],
  present: ['present', 'present days', 'payable days', 'paid days', 'working days', 'days worked', 'total present', 'attendance days'],
  otHours: ['overtime hours', 'ot hours', 'overtime hour', 'ot hrs', 'ot hour', 'over time hours'],
  otMinutes: ['ot min', 'ot (min)', 'overtime min', 'overtime minutes', 'ot minutes', 'ot mins', 'overtime'],
  otPay: ['overtime pay', 'ot pay', 'overtime amount', 'ot amount', 'ot pay amount'],
  advanceDeduction: [
    'advance deduction', 'adv deduction', 'advance recover', 'advance recovery',
    'monthly advance', 'emi deduction', 'loan deduction', 'deduction advance',
  ],
  outstandingAdvance: [
    'outstanding adv', 'outstanding advance', 'advance outstanding', 'advance balance',
    'loan/advance balance', 'adv balance', 'balance advance', 'remaining advance',
  ],
  netSalary: ['net salary', 'net pay', 'net salary with advance', 'take home', 'net payable', 'in hand', 'net amount', 'net'],
  lateCount: ['late count', 'late days', 'late mark', 'late penalty days', 'late coming', 'late mins'],
  grossSalary: ['gross salary', 'gross pay', 'gross', 'total earnings'],
};

function normHeader(h) {
  return String(h || '')
    .toLowerCase()
    .replace(/[_\-.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cellText(val) {
  if (val == null) return '';
  if (typeof val === 'object') {
    if (val.text != null) return String(val.text).trim();
    if (val.result != null) return cellText(val.result);
    if (val.formula != null && val.result != null) return cellText(val.result);
    if (Array.isArray(val.richText)) {
      return val.richText.map((t) => (t && t.text != null ? String(t.text) : '')).join('').trim();
    }
    if (val.error) return '';
    return '';
  }
  return String(val).trim();
}

const FIELD_HEADER_BLOCKLIST = {
  month: ['monthly', 'salary', 'gross', 'present', 'net'],
  absent: ['name', 'employee', 'staff', 'salary', 'present', 'overtime', 'advance', 'gross', 'net'],
  present: ['name', 'employee', 'salary', 'overtime', 'advance', 'gross', 'net', 'late'],
  otPay: ['encashment', 'leave', 'present', 'name', 'salary', 'gross'],
  otHours: ['min', 'minute', 'pay', 'amount', 'encashment', 'leave', 'salary'],
  otMinutes: ['pay', 'amount', 'hour', 'hrs', 'encashment', 'leave', 'salary'],
  lateCount: ['present', 'name', 'employee', 'salary', 'overtime', 'advance', 'payable', 'paid days'],
  netSalary: ['gross', 'advance', 'overtime', 'present', 'absent'],
  grossSalary: ['advance', 'overtime', 'present', 'absent', 'net '],
  outstandingAdvance: ['leave', 'encashment', 'salary', 'gross', 'deduction'],
  advanceDeduction: ['outstanding', 'balance', 'gross', 'net salary'],
};

const FIELD_HEADER_REQUIRE = {
  otPay: (h) => /\b(overtime|ot)\b/.test(h) && /\b(pay|amount|amt)\b/.test(h),
  otMinutes: (h) => {
    if (/\b(hour|hrs)\b/.test(h)) return false;
    if (/\b(min|minute)\b/.test(h)) return /\b(overtime|ot)\b/.test(h);
    return h === 'overtime' || h === 'ot' || h === 'over time';
  },
  otHours: (h) => /\b(overtime|ot)\b/.test(h) && /\b(hour|hrs)\b/.test(h),
  lateCount: (h) => /\blate\b/.test(h),
  month: (h) => /\b(month|payroll month|salary month|pay month)\b/.test(h) || h === 'month',
};

function headerMatchesField(field, headerNorm, alias) {
  const block = FIELD_HEADER_BLOCKLIST[field];
  if (block && block.some((b) => headerNorm.includes(b))) return false;
  const requireFn = FIELD_HEADER_REQUIRE[field];
  if (requireFn && !requireFn(headerNorm)) return false;
  return headerMatchesAlias(headerNorm, alias);
}

function parseNumber(val) {
  const s = cellText(val).replace(/[,₹]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function scoreHeaderRow(cells) {
  const normalized = cells.map(normHeader);
  let score = 0;
  for (const aliases of Object.values(FIELD_ALIASES)) {
    if (normalized.some((c) => aliases.some((a) => c === a || c.includes(a)))) score += 1;
  }
  return score;
}

function headerMatchesAlias(headerNorm, alias) {
  if (!headerNorm || !alias) return false;
  if (headerNorm === alias) return true;
  if (alias.includes(' ')) {
    return headerNorm.includes(alias);
  }
  if (alias.length <= 4) {
    const words = headerNorm.split(' ').filter(Boolean);
    return words.some((w) => w === alias);
  }
  if (headerNorm.includes(alias)) return true;
  const words = headerNorm.split(' ').filter(Boolean);
  return words.some((w) => w === alias);
}

function scoreHeaderForField(field, headerNorm) {
  const aliases = FIELD_ALIASES[field] || [];
  let best = 0;
  for (const a of aliases) {
    if (!headerMatchesField(field, headerNorm, a)) continue;
    if (headerNorm === a) best = Math.max(best, 100);
    else if (headerNorm.includes(a)) best = Math.max(best, 50 + a.length);
    else best = Math.max(best, 20);
  }
  return best;
}

function mapColumns(headers) {
  const mapping = {};
  const normalized = headers.map(normHeader);
  for (const field of Object.keys(FIELD_ALIASES)) {
    let bestIdx = -1;
    let bestScore = 0;
    normalized.forEach((h, idx) => {
      const score = scoreHeaderForField(field, h);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0 && bestScore > 0) mapping[field] = bestIdx;
  }
  const allColumns = headers.map((h, i) => ({
    index: i,
    header: cellText(h) || `Column ${i + 1}`,
    key: normHeader(h) || `col_${i}`,
  }));
  return { mapping, allColumns };
}

function fuzzyNameMatch(a, b) {
  const x = normHeader(a);
  const y = normHeader(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.includes(y) || y.includes(x)) return true;
  const ax = x.split(' ').filter(Boolean);
  const by = y.split(' ').filter(Boolean);
  if (!ax.length || !by.length) return false;
  const overlap = ax.filter((w) => by.includes(w)).length;
  return overlap >= Math.min(ax.length, by.length) - 1 && overlap >= 1;
}

function parseMonthKey(raw, fallback) {
  const s = cellText(raw);
  if (!s && fallback) return fallback;
  const m = s.match(/(\d{4})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return fallback || null;
}

async function loadWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

function worksheetToMatrix(worksheet, maxRows = 2000) {
  const colCount = Math.max(
    worksheet.columnCount || 0,
    worksheet.actualColumnCount || 0,
    1
  );
  const rows = [];
  let count = 0;
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (count >= maxRows) return;
    const cells = [];
    const width = Math.max(colCount, row.cellCount || 0, row.actualCellCount || 0);
    for (let c = 1; c <= width; c++) {
      cells[c - 1] = cellText(row.getCell(c).value);
    }
    rows.push(cells);
    count += 1;
  });
  return rows;
}

function resolveFieldValue(raw, mapping, rowJson, field, allColumns = []) {
  const aliases = FIELD_ALIASES[field] || [];
  let column = null;
  let rawText = '';

  if (mapping[field] != null && raw && raw[mapping[field]] !== undefined) {
    rawText = cellText(raw[mapping[field]]);
    const col = allColumns.find((c) => c.index === mapping[field]);
    column = col?.header || null;
  }

  if (!rawText && rowJson) {
    let bestScore = 0;
    for (const [key, val] of Object.entries(rowJson)) {
      const nk = normHeader(key);
      const score = scoreHeaderForField(field, nk);
      const t = cellText(val);
      if (score > bestScore && t !== '') {
        bestScore = score;
        rawText = t;
        column = key;
      }
    }
  }

  const value = parseNumber(rawText);
  return {
    value,
    raw: rawText || null,
    column,
    mapped: mapping[field] != null,
  };
}

function detectHeaderRow(matrix) {
  let best = { index: 0, score: 0 };
  const limit = Math.min(matrix.length, 25);
  for (let i = 0; i < limit; i++) {
    const score = scoreHeaderRow(matrix[i] || []);
    if (score > best.score) best = { index: i, score };
  }
  return best.score > 0 ? best.index : 0;
}

function createUploadSession(buffer) {
  const id = require('crypto').randomBytes(16).toString('hex');
  uploadSessions.set(id, { buffer, expiresAt: Date.now() + SESSION_TTL_MS });
  return id;
}

function getUploadSession(sessionId) {
  const entry = uploadSessions.get(sessionId);
  if (!entry || Date.now() > entry.expiresAt) {
    uploadSessions.delete(sessionId);
    return null;
  }
  return entry.buffer;
}

async function parseUpload(buffer) {
  const workbook = await loadWorkbook(buffer);
  const sessionId = createUploadSession(buffer);
  const sheets = workbook.worksheets.map((ws) => {
    const matrix = worksheetToMatrix(ws, 30);
    const headerRowIndex = detectHeaderRow(matrix);
    const headers = matrix[headerRowIndex] || [];
    const previewRows = matrix.slice(headerRowIndex + 1, headerRowIndex + 6).map((r) => {
      const obj = {};
      headers.forEach((h, i) => {
        const key = cellText(h) || `col_${i}`;
        obj[key] = r[i] ?? '';
      });
      return obj;
    });
    return {
      name: ws.name,
      rowCount: ws.rowCount,
      headerRowIndex,
      headers: headers.map((h, i) => cellText(h) || `Column ${i + 1}`),
      previewRows,
    };
  });
  return { sessionId, sheets };
}

async function loadOrgStaff(orgId) {
  const users = await User.findAll({
    where: { orgAccountId: orgId, role: { [Op.in]: ['staff', 'admin'] }, active: true },
    include: [{ model: StaffProfile, as: 'profile' }],
  });
  return users.map((u) => ({
    userId: u.id,
    staffId: u.profile?.staffId || '',
    name: u.profile?.name || u.phone || `User ${u.id}`,
    phone: u.phone,
  }));
}

function matchStaff(row, mapping, staffList) {
  const idVal = mapping.staffId != null ? cellText(row[mapping.staffId]) : '';
  if (idVal) {
    const byId = staffList.find(
      (s) => String(s.staffId).toLowerCase() === idVal.toLowerCase() || String(s.userId) === idVal
    );
    if (byId) return { staff: byId, confidence: 'id' };
  }
  const nameVal = mapping.name != null ? cellText(row[mapping.name]) : '';
  if (nameVal) {
    const byName = staffList.find((s) => fuzzyNameMatch(s.name, nameVal));
    if (byName) return { staff: byName, confidence: 'name' };
  }
  return { staff: null, confidence: 'none', hint: nameVal || idVal || 'unknown row' };
}

function parseJsonField(val) {
  if (val == null) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}

function monthDateKey(monthKey, dayNum) {
  return `${monthKey}-${String(dayNum).padStart(2, '0')}`;
}

function normalizeDateKey(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function expandLeaveDateKeys(leaves) {
  const keys = new Set();
  for (const l of leaves || []) {
    const start = new Date(l.from || l.startDate);
    const end = new Date(l.to || l.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    const cur = new Date(start);
    while (cur <= end) {
      keys.add(normalizeDateKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return keys;
}

async function buildStaffDayTimeline(orgId, userId, monthKey, attSummary = {}, approvedLeaves = []) {
  if (!monthKey) return null;
  const [y, m] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const from = monthDateKey(monthKey, 1);
  const to = monthDateKey(monthKey, daysInMonth);

  const rows = await Attendance.findAll({
    where: { userId, date: { [Op.gte]: from, [Op.lte]: to } },
    order: [['date', 'ASC']],
    attributes: [
      'date', 'status', 'overtimeMinutes', 'overtimeAmount', 'latePunchInMinutes',
      'punchedInAt', 'punchedOutAt', 'source', 'autoPunchout', 'note',
    ],
  });
  const byDate = new Map();
  for (const r of rows) {
    byDate.set(normalizeDateKey(r.date), r);
  }

  const rosters = await StaffRoster.findAll({
    where: { userId, date: { [Op.gte]: from, [Op.lte]: to } },
    attributes: ['date', 'status'],
  });
  const rosterByDate = new Map(rosters.map((r) => [normalizeDateKey(r.date), r]));

  const paidLeaveDates = new Set((attSummary.paidLeaveDates || []).map(normalizeDateKey));
  const leaveDates = expandLeaveDateKeys(approvedLeaves);

  const issueSummary = {
    ot: [],
    late: [],
    weeklyOff: [],
    holiday: [],
    leave: [],
    markedAbsent: [],
    noPunchAbsent: [],
  };

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = monthDateKey(monthKey, d);
    const roster = rosterByDate.get(date);
    const rec = byDate.get(date);
    let statusCode = rec?.status ? String(rec.status).toUpperCase() : '';
    let otMinutes = Number(rec?.overtimeMinutes || 0);
    const lateMinutes = Number(rec?.latePunchInMinutes || 0);
    let payrollLabel = statusCode || '—';
    let source = rec ? 'attendance' : 'none';
    let note = '';

    if (roster?.status === 'WEEKLY_OFF') {
      statusCode = 'WO';
      payrollLabel = 'Weekly off';
      source = 'roster';
      issueSummary.weeklyOff.push(date);
    } else if (roster?.status === 'HOLIDAY') {
      statusCode = 'H';
      payrollLabel = 'Holiday';
      source = 'roster';
      issueSummary.holiday.push(date);
    } else if (paidLeaveDates.has(date) || leaveDates.has(date)) {
      statusCode = 'L';
      payrollLabel = 'Leave (approved)';
      source = 'leave';
      if (!issueSummary.leave.includes(date)) issueSummary.leave.push(date);
    } else if (!rec) {
      statusCode = 'A';
      payrollLabel = 'No punch';
      source = 'system';
      note = 'No attendance row — payroll typically treats this as absent unless overridden';
      issueSummary.noPunchAbsent.push(date);
    } else {
      if (statusCode.includes('ABSENT') || statusCode === 'A') {
        issueSummary.markedAbsent.push(date);
      }
      if (otMinutes > 0) {
        issueSummary.ot.push({ date, minutes: otMinutes, amount: Number(rec.overtimeAmount || 0) });
      }
      if (lateMinutes > 0) {
        issueSummary.late.push({ date, minutes: lateMinutes });
      }
    }

    days.push({
      date,
      day: d,
      status: statusCode,
      label: payrollLabel,
      otMinutes,
      lateMinutes,
      punchedIn: rec?.punchedInAt || null,
      punchedOut: rec?.punchedOutAt || null,
      punchSource: rec?.source || null,
      autoPunchout: Boolean(rec?.autoPunchout),
      source,
      note,
    });
  }

  return {
    monthKey,
    daysInMonth,
    days,
    issueSummary,
    hint: 'Compare with Org Reports → Attendance matrix for the same month. “No punch” days are system-derived absences (you did not mark them manually).',
  };
}

async function staffDbSnapshot(orgId, userId, monthKey) {
  const advances = await StaffAdvance.findAll({
    where: { orgAccountId: orgId, staffId: userId, status: { [Op.ne]: 'cancelled' } },
    order: [['advanceDate', 'DESC']],
  });
  const generatedMonths = monthKey ? await loadGeneratedPayrollMonths(orgId) : new Set();
  const advanceMeta = computeStaffAdvancePayroll(advances, monthKey, generatedMonths);
  const rules = await AttendanceAutomationRule.findAll({
    where: { orgAccountId: orgId, active: true },
    attributes: ['id', 'key', 'config', 'active'],
  });
  const automationSummary = rules.map((r) => ({
    id: r.id,
    key: r.key,
    active: r.active,
  }));

  let payroll = null;
  let payrollCycleId = null;
  let cycleStatus = null;
  let projected = null;
  if (monthKey) {
    const cycles = await PayrollCycle.findAll({
      where: { orgAccountId: orgId, monthKey },
      order: [['id', 'DESC']],
    });
    for (const cycle of cycles) {
      const line = await PayrollLine.findOne({ where: { cycleId: cycle.id, userId } });
      if (line) {
        payroll = line;
        payrollCycleId = cycle.id;
        cycleStatus = cycle.status;
        break;
      }
    }
    try {
      projected = await calculateSalary(userId, monthKey);
    } catch (e) {
      console.warn('[payroll-inspection] calculateSalary failed', userId, monthKey, e.message);
    }
  }

  const attFromLine = payroll ? parseJsonField(payroll.attendanceSummary) : {};
  const totalsFromLine = payroll ? parseJsonField(payroll.totals) : {};
  const attCalc = projected?.attendanceSummary || {};
  const att = { ...attFromLine, ...attCalc };
  if (!Number(att.overtimeMinutes) && Number(attFromLine.overtimeMinutes) > 0) {
    att.overtimeMinutes = attFromLine.overtimeMinutes;
    att.overtimeHours = attFromLine.overtimeHours;
    att.overtimePay = attFromLine.overtimePay;
  }
  const totals = projected?.totals || totalsFromLine || {};

  let otMinutes = Number(att.overtimeMinutes ?? 0);
  if (!otMinutes && monthKey) {
    try {
      const u = await User.findByPk(userId, { attributes: ['id', 'orgAccountId', 'basicSalary', 'salaryValues'] });
      const orgAccount = u?.orgAccountId ? await OrgAccount.findByPk(u.orgAccountId) : null;
      const ot = await computeOvertimeMeta({
        userId,
        monthKey,
        orgAccount,
        overtimeBaseSalary: Number(u?.basicSalary || 0),
      });
      otMinutes = Number(ot.overtimeMinutes || 0);
    } catch (e) {
      /* ignore */
    }
  }
  const otHours = Number(
    att.overtimeHours ?? (otMinutes ? otMinutes / 60 : 0)
  );
  const presentDays = Number(
    att.payableDays ?? att.present ?? att.actualPresent ?? 0
  );
  const netSalary = totals.netSalary != null
    ? Number(totals.netSalary)
    : (totals.net != null ? Number(totals.net) : null);
  const grossSalary = totals.grossSalary != null
    ? Number(totals.grossSalary)
    : (totals.gross != null ? Number(totals.gross) : null);
  const otPay = Number(
    att.overtimePay ?? totals.overtimePay ?? projected?.earnings?.overtime_pay ?? 0
  );

  let leaves = [];
  if (monthKey) {
    const [y, m] = monthKey.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    leaves = await LeaveRequest.findAll({
      where: {
        userId,
        orgAccountId: orgId,
        status: 'APPROVED',
        [Op.or]: [
          { startDate: { [Op.between]: [start, end] } },
          { endDate: { [Op.between]: [start, end] } },
        ],
      },
      attributes: ['id', 'startDate', 'endDate', 'leaveType', 'paidDays', 'unpaidDays', 'days'],
      limit: 50,
    });
  }

  const deductionsFromLine = payroll ? parseJsonField(payroll.deductions) : {};
  let advanceDeductionThisMonth = advanceMeta.advanceDeductions;
  if (deductionsFromLine.advance_deduction != null && Number(deductionsFromLine.advance_deduction) > 0) {
    advanceDeductionThisMonth = Number(deductionsFromLine.advance_deduction);
  }

  const totalsOutstanding = totalsFromLine.outstandingAdvance != null
    ? Number(totalsFromLine.outstandingAdvance)
    : (totals.outstandingAdvance != null ? Number(totals.outstandingAdvance) : null);
  const outstandingAdvanceTotal = totalsOutstanding != null && payroll
    ? totalsOutstanding
    : advanceMeta.totalOutstandingAdvance;

  return {
    advances: advanceMeta.perAdvance,
    advanceDeductionThisMonth,
    outstandingAdvanceTotal,
    outstandingAdvanceSource: totalsOutstanding != null && payroll ? 'payroll_line' : 'live_advance_schedule',
    automationRules: automationSummary,
    payrollMonth: monthKey,
    attendance: {
      absent: Number(att.absent ?? att.absents ?? 0),
      present: presentDays,
      payableDays: presentDays,
      lateCount: Number(att.lateCount ?? att.late ?? 0),
      otHours,
      otMinutes,
      otPay,
    },
    netSalary,
    grossSalary,
    payrollGenerated: Boolean(payroll && (cycleStatus === 'LOCKED' || cycleStatus === 'PAID')),
    payrollCycleStatus: cycleStatus,
    dataSource: projected ? 'live_calculation' : (payroll ? 'payroll_line' : 'none'),
    isProjected: projected ? Boolean(projected.isProjected) : !payroll,
    payrollMonthKey: monthKey,
    payrollCycleId,
    approvedLeaves: leaves.map((l) => ({
      id: l.id,
      from: l.startDate,
      to: l.endDate,
      type: l.leaveType,
      paidDays: l.paidDays,
      unpaidDays: l.unpaidDays,
      days: l.days,
    })),
    dayTimeline: monthKey
      ? await buildStaffDayTimeline(orgId, userId, monthKey, att, leaves)
      : null,
  };
}

const NUMERIC_COMPARE_FIELDS = new Set([
  'absent', 'present', 'otHours', 'otMinutes', 'otPay', 'outstandingAdvance',
  'advanceDeduction', 'netSalary', 'lateCount', 'grossSalary',
]);

function addDiff(diffs, field, label, excelResolved, softwareVal, meta = {}) {
  const ex = excelResolved?.value != null ? Number(excelResolved.value) : null;
  const sw = softwareVal == null || softwareVal === '' ? null : Number(softwareVal);
  const rawStr = excelResolved?.raw != null ? String(excelResolved.raw).trim() : '';
  const hasExcelCell = rawStr !== '';
  const excelMapped = excelResolved?.mapped || hasExcelCell;

  if (NUMERIC_COMPARE_FIELDS.has(field) && hasExcelCell && ex == null && /[a-zA-Z]/.test(rawStr)) {
    return;
  }
  if (!excelMapped && (ex == null || ex === 0) && (sw == null || sw === 0)) return;
  if (ex != null && sw != null && Math.abs(ex - sw) < 0.01) return;

  diffs.push({
    id: `${meta.staffUserId || 'row'}_${field}`,
    field,
    label,
    excelValue: ex,
    excelRaw: excelResolved?.raw ?? null,
    excelColumn: excelResolved?.column ?? null,
    softwareValue: sw,
    impact: 'May affect salary / deductions if not corrected',
    ...meta,
  });
}

async function analyzeSheet({ orgId, sessionId, sheetName, monthKey: monthKeyInput, headerRowIndex: headerOverride }) {
  const buffer = getUploadSession(sessionId);
  if (!buffer) {
    throw Object.assign(new Error('Upload session expired. Please upload the file again.'), { status: 400 });
  }
  const workbook = await loadWorkbook(buffer);
  const ws = workbook.getWorksheet(sheetName) || workbook.worksheets[Number(sheetName)] || workbook.worksheets[0];
  if (!ws) throw Object.assign(new Error('Worksheet not found'), { status: 400 });

  const matrix = worksheetToMatrix(ws, 2000);
  const headerRowIndex = headerOverride != null ? Number(headerOverride) : detectHeaderRow(matrix);
  const headers = matrix[headerRowIndex] || [];
  const { mapping, allColumns } = mapColumns(headers);
  const staffList = await loadOrgStaff(orgId);

  const rows = [];
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const raw = matrix[r];
    if (!raw || raw.every((c) => !cellText(c))) continue;

    const rowJson = {};
    allColumns.forEach((col) => {
      rowJson[col.header] = cellText(raw[col.index] ?? '');
    });

    const { staff, confidence, hint } = matchStaff(raw, mapping, staffList);
    const monthKey = monthKeyInput || parseMonthKey(mapping.month != null ? raw[mapping.month] : '', monthKeyInput);

    const excelMetrics = {};
    for (const f of Object.keys(FIELD_ALIASES)) {
      if (f === 'name' || f === 'staffId' || f === 'month') continue;
      excelMetrics[f] = resolveFieldValue(raw, mapping, rowJson, f, allColumns);
    }

    let db = null;
    const diffs = [];
    if (staff) {
      db = await staffDbSnapshot(orgId, staff.userId, monthKey);
      const uid = { staffUserId: staff.userId };
      addDiff(diffs, 'absent', 'Absent days', excelMetrics.absent, db.attendance.absent, uid);
      addDiff(diffs, 'present', 'Present days', excelMetrics.present, db.attendance.present, uid);
      addDiff(diffs, 'otMinutes', 'OT (minutes)', excelMetrics.otMinutes, db.attendance.otMinutes, uid);
      addDiff(diffs, 'otHours', 'OT hours', excelMetrics.otHours, db.attendance.otHours, uid);
      addDiff(diffs, 'otPay', 'OT pay', excelMetrics.otPay, db.attendance.otPay, uid);
      addDiff(
        diffs,
        'advanceDeduction',
        'Advance deduction (this month)',
        excelMetrics.advanceDeduction,
        db.advanceDeductionThisMonth,
        { ...uid, advanceIds: db.advances.map((a) => a.id) }
      );
      addDiff(
        diffs,
        'outstandingAdvance',
        'Outstanding advance (before this month)',
        excelMetrics.outstandingAdvance,
        db.outstandingAdvanceTotal,
        { ...uid, advanceIds: db.advances.map((a) => a.id) }
      );
      addDiff(diffs, 'netSalary', 'Net salary', excelMetrics.netSalary, db.netSalary, uid);
      addDiff(diffs, 'lateCount', 'Late count', excelMetrics.lateCount, db.attendance.lateCount, uid);
      addDiff(diffs, 'grossSalary', 'Gross salary', excelMetrics.grossSalary, db.grossSalary, uid);
    }

    rows.push({
      rowNumber: r + 1,
      match: staff
        ? { userId: staff.userId, name: staff.name, staffId: staff.staffId, confidence }
        : { error: `Staff not matched (${hint})` },
      monthKey,
      excelRowJson: rowJson,
      excelMetrics,
      software: db,
      differences: diffs,
    });
  }

  const matchedRows = rows.filter((x) => x.match.userId);
  const withDiffs = rows.filter((x) => x.match.userId && x.differences.length > 0);
  const clean = rows.filter((x) => x.match.userId && x.differences.length === 0);
  const unmatched = rows.filter((x) => !x.match.userId);

  return {
    sheetName: ws.name,
    headerRowIndex,
    columnMapping: mapping,
    columns: allColumns,
    monthKeyDefault: monthKeyInput || null,
    rows,
    summary: {
      totalRows: rows.length,
      matched: matchedRows.length,
      unmatched: unmatched.length,
      staffWithDifferences: withDiffs.length,
      cleanMatches: clean.length,
      withDifferences: withDiffs.length,
    },
  };
}

async function applyFixes(orgId, fixes, userId) {
  const results = [];
  for (const fix of fixes || []) {
    const { resolution, field, staffUserId, excelValue, advanceId } = fix;
    if (resolution === 'excel') {
      results.push({ ...fix, applied: false, message: 'Marked: correct your Excel sheet to match software.' });
      continue;
    }
    if (resolution !== 'software') {
      results.push({ ...fix, applied: false, message: 'Unknown resolution' });
      continue;
    }
    if (field === 'outstandingAdvance' && advanceId) {
      const adv = await StaffAdvance.findOne({ where: { id: advanceId, orgAccountId: orgId, staffId: staffUserId } });
      if (!adv) {
        results.push({ ...fix, applied: false, message: 'Advance record not found' });
        continue;
      }
      const note = `[Inspection ${new Date().toISOString().slice(0, 10)}] Adjusted from Excel reconciliation by user ${userId}`;
      await adv.update({
        amount: Number(excelValue),
        notes: adv.notes ? `${adv.notes}\n${note}` : note,
        updatedBy: userId,
      });
      results.push({ ...fix, applied: true, message: 'Advance amount updated in software' });
      continue;
    }
    results.push({
      ...fix,
      applied: false,
      message: 'Software auto-fix for this field is not automated yet. Update attendance/payroll or fix Excel.',
    });
  }
  return results;
}

module.exports = {
  parseUpload,
  analyzeSheet,
  applyFixes,
  buildStaffDayTimeline,
};
