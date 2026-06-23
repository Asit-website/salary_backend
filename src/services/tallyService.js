const { AppSetting, PayrollCycle, PayrollLine, User, StaffProfile } = require('../models');

const DEFAULT_CONFIG = {
  bridgeUrl: "http://localhost:7000",
  companyName: "ABC Pvt Ltd",
  voucherType: "Journal",
  narrationFormat: "Salary for {month} {year}",
  entryMode: "CONSOLIDATED", // CONSOLIDATED or PER_EMPLOYEE
  includeEmployerContributions: false,
  exportOnlyLocked: true,
  ledgerMap: {
    "basic": "Basic Salary Expense",
    "hra": "HRA Expense",
    "da": "DA Expense",
    "special_allowance": "Special Allowance",
    "conveyance_allowance": "Conveyance Allowance",
    "overtime_pay": "Overtime Expense",
    "provident_fund": "PF Payable",
    "esi": "ESI Payable",
    "professional_tax": "Professional Tax Payable",
    "tds": "TDS Payable",
    "net_salary": "Salary Payable",
    
    // Employer mappings (used if includeEmployerContributions is enabled)
    "employer_pf": "Employer PF Contribution Expense",
    "employer_esi": "Employer ESI Contribution Expense",
    "employer_pf_payable": "PF Payable (Employer)",
    "employer_esi_payable": "ESI Payable (Employer)"
  }
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const escapeXML = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const alignVoucherBalances = (drEntries, crEntries, ledgerMap) => {
  const cleanDr = {};
  Object.entries(drEntries).forEach(([k, v]) => {
    if (v > 0) cleanDr[k] = parseFloat(v.toFixed(2));
  });

  const cleanCr = {};
  Object.entries(crEntries).forEach(([k, v]) => {
    if (v > 0) cleanCr[k] = parseFloat(v.toFixed(2));
  });

  const sumDr = parseFloat(Object.values(cleanDr).reduce((a, b) => a + b, 0).toFixed(2));
  const sumCr = parseFloat(Object.values(cleanCr).reduce((a, b) => a + b, 0).toFixed(2));
  const diff = parseFloat((sumDr - sumCr).toFixed(2));

  if (diff !== 0) {
    if (diff > 0) {
      const netSalaryLedger = ledgerMap['net_salary'] || 'net_salary';
      if (cleanCr[netSalaryLedger] !== undefined) {
        cleanCr[netSalaryLedger] = parseFloat((cleanCr[netSalaryLedger] + diff).toFixed(2));
      } else {
        const largestCrKey = Object.keys(cleanCr).reduce((a, b) => cleanCr[a] > cleanCr[b] ? a : b, null);
        if (largestCrKey) {
          cleanCr[largestCrKey] = parseFloat((cleanCr[largestCrKey] + diff).toFixed(2));
        }
      }
    } else {
      const basicLedger = ledgerMap['basic'] || 'basic';
      if (cleanDr[basicLedger] !== undefined) {
        cleanDr[basicLedger] = parseFloat((cleanDr[basicLedger] - diff).toFixed(2));
      } else {
        const largestDrKey = Object.keys(cleanDr).reduce((a, b) => cleanDr[a] > cleanDr[b] ? a : b, null);
        if (largestDrKey) {
          cleanDr[largestDrKey] = parseFloat((cleanDr[largestDrKey] - diff).toFixed(2));
        }
      }
    }
  }

  return { cleanDr, cleanCr };
};

const getTallyConfig = async (orgAccountId) => {
  const setting = await AppSetting.findOne({
    where: { key: 'tally_config', orgAccountId }
  });
  if (!setting) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    return JSON.parse(setting.value);
  } catch (err) {
    return { ...DEFAULT_CONFIG };
  }
};

const saveTallyConfig = async (orgAccountId, config) => {
  let setting = await AppSetting.findOne({
    where: { key: 'tally_config', orgAccountId }
  });
  if (setting) {
    await setting.update({ value: JSON.stringify(config) });
  } else {
    setting = await AppSetting.create({
      key: 'tally_config',
      value: JSON.stringify(config),
      orgAccountId
    });
  }
  return JSON.parse(setting.value);
};

const aggregatePayrollData = async (orgAccountId, cycleId) => {
  const cycle = await PayrollCycle.findOne({
    where: { id: cycleId, orgAccountId }
  });
  if (!cycle) {
    throw new Error('Payroll cycle not found');
  }

  const config = await getTallyConfig(orgAccountId);
  if (config.exportOnlyLocked && cycle.status !== 'LOCKED' && cycle.status !== 'PAID') {
    throw new Error('Only locked or paid payroll cycles can be exported to Tally.');
  }

  const lines = await PayrollLine.findAll({
    where: { cycleId, status: 'INCLUDED' },
    include: [
      {
        model: User,
        as: 'user',
        include: [{ model: StaffProfile, as: 'profile' }]
      }
    ]
  });

  const ledgerMap = config.ledgerMap || {};

  // Formatted date and narration helper
  const [yearPart, monthPart] = cycle.monthKey.split('-');
  const yearStr = yearPart.trim();
  const monthStr = monthPart.trim().padStart(2, '0');
  const monthName = MONTH_NAMES[parseInt(monthStr) - 1] || 'Month';
  const cycleNarration = (config.narrationFormat || "Salary for {month} {year}")
    .replace('{month}', monthName)
    .replace('{year}', yearStr);
  const dateFormatted = `${yearStr}${monthStr}28`; // Standard billing date

  if (!/^\d{8}$/.test(dateFormatted)) {
    throw new Error(`Invalid date format generated for Tally: ${dateFormatted}. Must be exactly 8 digits (YYYYMMDD).`);
  }

  const parseJsonField = (field) => {
    if (!field) return {};
    if (typeof field === 'object') return field;
    try {
      return JSON.parse(field);
    } catch (err) {
      return {};
    }
  };

  if (config.entryMode === 'PER_EMPLOYEE') {
    const vouchers = [];

    lines.forEach(line => {
      const drEntries = {};
      const crEntries = {};

      const earnings = parseJsonField(line.earnings);
      const incentives = parseJsonField(line.incentives);
      const deductions = parseJsonField(line.deductions);
      const totals = parseJsonField(line.totals);
      const adjustments = parseJsonField(line.adjustments);

      const addToEntry = (map, key, amount) => {
        if (!amount || isNaN(amount)) return;
        const ledgerName = ledgerMap[key] || key;
        map[ledgerName] = (map[ledgerName] || 0) + parseFloat(amount);
      };

      // 1. Earnings (DR)
      Object.entries(earnings).forEach(([key, val]) => {
        addToEntry(drEntries, key, val);
      });
      Object.entries(incentives).forEach(([key, val]) => {
        addToEntry(drEntries, key, val);
      });

      // 2. Deductions (CR)
      Object.entries(deductions).forEach(([key, val]) => {
        addToEntry(crEntries, key, val);
      });

      // 3. Adjustments
      if (Array.isArray(adjustments)) {
        adjustments.forEach(adj => {
          if (adj.type === 'ADD') {
            addToEntry(drEntries, adj.label, adj.amount);
          } else if (adj.type === 'DEDUCT') {
            addToEntry(crEntries, adj.label, adj.amount);
          }
        });
      }

      // 4. Net Salary (CR)
      const netSalary = totals.netSalary || totals.net;
      if (netSalary) {
        addToEntry(crEntries, 'net_salary', netSalary);
      }

      // 5. Employer Contributions (DR Expense, CR Liability)
      if (config.includeEmployerContributions) {
        const empPf = parseFloat(deductions.provident_fund || 0);
        if (empPf > 0) {
          addToEntry(drEntries, 'employer_pf', empPf);
          addToEntry(crEntries, 'employer_pf_payable', empPf);
        }

        const empEsi = parseFloat(deductions.esi || 0);
        const gross = totals.grossSalary || totals.gross;
        if (empEsi > 0 && gross) {
          const employerEsi = parseFloat((parseFloat(gross) * 0.0325).toFixed(2));
          if (employerEsi > 0) {
            addToEntry(drEntries, 'employer_esi', employerEsi);
            addToEntry(crEntries, 'employer_esi_payable', employerEsi);
          }
        }
      }

      const { cleanDr, cleanCr } = alignVoucherBalances(drEntries, crEntries, ledgerMap);

      const empName = line.user?.profile?.name || line.user?.phone || 'Employee';
      const empCode = line.user?.profile?.staffId || 'N/A';
      const narration = `Salary for ${empName} (${empCode}) - ${monthName} ${yearStr}`;

      if (Object.keys(cleanDr).length > 0 || Object.keys(cleanCr).length > 0) {
        vouchers.push({
          drEntries: cleanDr,
          crEntries: cleanCr,
          narration
        });
      }
    });

    return {
      cycle,
      config,
      entryMode: 'PER_EMPLOYEE',
      vouchers,
      dateFormatted
    };
  } else {
    // CONSOLIDATED entry mode
    const drEntries = {};
    const crEntries = {};

    const addToEntry = (map, key, amount) => {
      if (!amount || isNaN(amount)) return;
      const ledgerName = ledgerMap[key] || key;
      map[ledgerName] = (map[ledgerName] || 0) + parseFloat(amount);
    };

    lines.forEach(line => {
      const earnings = parseJsonField(line.earnings);
      const incentives = parseJsonField(line.incentives);
      const deductions = parseJsonField(line.deductions);
      const totals = parseJsonField(line.totals);
      const adjustments = parseJsonField(line.adjustments);

      // 1. Earnings (DR)
      Object.entries(earnings).forEach(([key, val]) => {
        addToEntry(drEntries, key, val);
      });
      Object.entries(incentives).forEach(([key, val]) => {
        addToEntry(drEntries, key, val);
      });

      // 2. Deductions (CR)
      Object.entries(deductions).forEach(([key, val]) => {
        addToEntry(crEntries, key, val);
      });

      // 3. Adjustments
      if (Array.isArray(adjustments)) {
        adjustments.forEach(adj => {
          if (adj.type === 'ADD') {
            addToEntry(drEntries, adj.label, adj.amount);
          } else if (adj.type === 'DEDUCT') {
            addToEntry(crEntries, adj.label, adj.amount);
          }
        });
      }

      // 4. Net Salary (CR)
      const netSalary = totals.netSalary || totals.net;
      if (netSalary) {
        addToEntry(crEntries, 'net_salary', netSalary);
      }

      // 5. Employer Contributions
      if (config.includeEmployerContributions) {
        const empPf = parseFloat(deductions.provident_fund || 0);
        if (empPf > 0) {
          addToEntry(drEntries, 'employer_pf', empPf);
          addToEntry(crEntries, 'employer_pf_payable', empPf);
        }

        const empEsi = parseFloat(deductions.esi || 0);
        const gross = totals.grossSalary || totals.gross;
        if (empEsi > 0 && gross) {
          const employerEsi = parseFloat((parseFloat(gross) * 0.0325).toFixed(2));
          if (employerEsi > 0) {
            addToEntry(drEntries, 'employer_esi', employerEsi);
            addToEntry(crEntries, 'employer_esi_payable', employerEsi);
          }
        }
      }
    });

    const { cleanDr, cleanCr } = alignVoucherBalances(drEntries, crEntries, ledgerMap);

    return {
      cycle,
      config,
      entryMode: 'CONSOLIDATED',
      drEntries: cleanDr,
      crEntries: cleanCr,
      narration: cycleNarration,
      dateFormatted
    };
  }
};

const getPreviewData = async (orgAccountId, cycleId) => {
  const data = await aggregatePayrollData(orgAccountId, cycleId);
  
  if (data.entryMode === 'PER_EMPLOYEE') {
    const previewList = [];
    let grandTotalDr = 0;
    let grandTotalCr = 0;

    data.vouchers.forEach((v, index) => {
      const voucherEntries = [];
      let voucherTotal = 0;

      Object.entries(v.drEntries).forEach(([ledger, amount]) => {
        voucherEntries.push({ type: 'DR', ledger, amount });
        voucherTotal += amount;
        grandTotalDr += amount;
      });

      Object.entries(v.crEntries).forEach(([ledger, amount]) => {
        voucherEntries.push({ type: 'CR', ledger, amount });
        grandTotalCr += amount;
      });

      previewList.push({
        id: index + 1,
        narration: v.narration,
        entries: voucherEntries,
        total: parseFloat(voucherTotal.toFixed(2))
      });
    });

    return {
      entryMode: 'PER_EMPLOYEE',
      vouchers: previewList,
      totalDr: parseFloat(grandTotalDr.toFixed(2)),
      totalCr: parseFloat(grandTotalCr.toFixed(2))
    };
  } else {
    // CONSOLIDATED preview
    const entries = [];
    let totalDr = 0;
    let totalCr = 0;

    Object.entries(data.drEntries).forEach(([ledger, amount]) => {
      entries.push({ type: 'DR', ledger, amount });
      totalDr += amount;
    });

    Object.entries(data.crEntries).forEach(([ledger, amount]) => {
      entries.push({ type: 'CR', ledger, amount });
      totalCr += amount;
    });

    return {
      entryMode: 'CONSOLIDATED',
      narration: data.narration,
      entries,
      totalDr: parseFloat(totalDr.toFixed(2)),
      totalCr: parseFloat(totalCr.toFixed(2))
    };
  }
};

const generateTallyXML = async (orgAccountId, cycleId) => {
  const data = await aggregatePayrollData(orgAccountId, cycleId);
  const companyName = data.config.companyName || "ABC Pvt Ltd";
  const voucherType = data.config.voucherType || "Journal";

  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
  xml += `<ENVELOPE>\n`;
  xml += `  <HEADER>\n`;
  xml += `    <TALLYREQUEST>Import Data</TALLYREQUEST>\n`;
  xml += `  </HEADER>\n`;
  xml += `  <BODY>\n`;
  xml += `    <IMPORTDATA>\n`;
  xml += `      <REQUESTDESC>\n`;
  xml += `        <REPORTNAME>Vouchers</REPORTNAME>\n`;
  xml += `        <STATICVARIABLES>\n`;
  xml += `          <SVCURRENTCOMPANY>${escapeXML(companyName)}</SVCURRENTCOMPANY>\n`;
  xml += `        </STATICVARIABLES>\n`;
  xml += `      </REQUESTDESC>\n`;
  xml += `      <REQUESTDATA>\n`;

  // 1. Gather all unique ledger names in the export payload
  const uniqueDrLedgers = new Set();
  const uniqueCrLedgers = new Set();

  if (data.entryMode === 'PER_EMPLOYEE') {
    data.vouchers.forEach(v => {
      Object.keys(v.drEntries).forEach(l => uniqueDrLedgers.add(l));
      Object.keys(v.crEntries).forEach(l => uniqueCrLedgers.add(l));
    });
  } else {
    Object.keys(data.drEntries).forEach(l => uniqueDrLedgers.add(l));
    Object.keys(data.crEntries).forEach(l => uniqueCrLedgers.add(l));
  }

  // 2. Output LEDGER declarations for auto-creation/alter
  uniqueDrLedgers.forEach(ledgerName => {
    const escLedger = escapeXML(ledgerName);
    xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `          <LEDGER NAME="${escLedger}" ACTION="Alter">\n`;
    xml += `            <NAME>${escLedger}</NAME>\n`;
    xml += `            <PARENT>Indirect Expenses</PARENT>\n`;
    xml += `            <ISBILLWISEON>No</ISBILLWISEON>\n`;
    xml += `          </LEDGER>\n`;
    xml += `        </TALLYMESSAGE>\n`;
  });

  uniqueCrLedgers.forEach(ledgerName => {
    const escLedger = escapeXML(ledgerName);
    xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `          <LEDGER NAME="${escLedger}" ACTION="Alter">\n`;
    xml += `            <NAME>${escLedger}</NAME>\n`;
    xml += `            <PARENT>Current Liabilities</PARENT>\n`;
    xml += `            <ISBILLWISEON>No</ISBILLWISEON>\n`;
    xml += `          </LEDGER>\n`;
    xml += `        </TALLYMESSAGE>\n`;
  });

  // 3. Output VOUCHER nodes
  const escVoucherType = escapeXML(voucherType);
  if (data.entryMode === 'PER_EMPLOYEE') {
    data.vouchers.forEach(v => {
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <VOUCHER VCHTYPE="${escVoucherType}" ACTION="Create">\n`;
      xml += `            <DATE>${data.dateFormatted}</DATE>\n`;
      xml += `            <NARRATION>${escapeXML(v.narration)}</NARRATION>\n`;
      xml += `            <VOUCHERTYPENAME>${escVoucherType}</VOUCHERTYPENAME>\n`;

      Object.entries(v.drEntries).forEach(([ledgerName, amount]) => {
        xml += `            <ALLLEDGERENTRIES.LIST>\n`;
        xml += `              <LEDGERNAME>${escapeXML(ledgerName)}</LEDGERNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
        xml += `              <AMOUNT>-${amount.toFixed(2)}</AMOUNT>\n`;
        xml += `            </ALLLEDGERENTRIES.LIST>\n`;
      });

      Object.entries(v.crEntries).forEach(([ledgerName, amount]) => {
        xml += `            <ALLLEDGERENTRIES.LIST>\n`;
        xml += `              <LEDGERNAME>${escapeXML(ledgerName)}</LEDGERNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
        xml += `              <AMOUNT>${amount.toFixed(2)}</AMOUNT>\n`;
        xml += `            </ALLLEDGERENTRIES.LIST>\n`;
      });

      xml += `          </VOUCHER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    });
  } else {
    // CONSOLIDATED Voucher
    xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `          <VOUCHER VCHTYPE="${escVoucherType}" ACTION="Create">\n`;
    xml += `            <DATE>${data.dateFormatted}</DATE>\n`;
    xml += `            <NARRATION>${escapeXML(data.narration)}</NARRATION>\n`;
    xml += `            <VOUCHERTYPENAME>${escVoucherType}</VOUCHERTYPENAME>\n`;

    Object.entries(data.drEntries).forEach(([ledgerName, amount]) => {
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>${escapeXML(ledgerName)}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>-${amount.toFixed(2)}</AMOUNT>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;
    });

    Object.entries(data.crEntries).forEach(([ledgerName, amount]) => {
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>${escapeXML(ledgerName)}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>${amount.toFixed(2)}</AMOUNT>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;
    });

    xml += `          </VOUCHER>\n`;
    xml += `        </TALLYMESSAGE>\n`;
  }

  xml += `      </REQUESTDATA>\n`;
  xml += `    </IMPORTDATA>\n`;
  xml += `  </BODY>\n`;
  xml += `</ENVELOPE>\n`;

  return xml;
};

module.exports = {
  getTallyConfig,
  saveTallyConfig,
  getPreviewData,
  generateTallyXML
};
