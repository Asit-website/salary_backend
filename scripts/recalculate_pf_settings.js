const { Subscription, OrgAccount, Plan, PayrollCycle, PayrollLine, User, SalaryTemplate, AppSetting } = require('../src/models');

async function run() {
  try {
    const args = process.argv.slice(2);
    let monthFilter = null;
    let cycleFilter = null;

    args.forEach(arg => {
      if (arg.startsWith('--month=')) {
        monthFilter = arg.split('=')[1];
      }
      if (arg.startsWith('--cycle=')) {
        cycleFilter = Number(arg.split('=')[1]);
      }
    });

    console.log('=== PAYROLL PF RECALCULATION SCRIPT ===');
    console.log('Filters: ', { monthFilter, cycleFilter });

    const whereClause = {};
    if (cycleFilter) {
      whereClause.id = cycleFilter;
    } else if (monthFilter) {
      whereClause.monthKey = monthFilter;
    } else {
      // Find latest month
      const latestCycle = await PayrollCycle.findOne({ order: [['id', 'DESC']] });
      if (latestCycle) {
        whereClause.monthKey = latestCycle.monthKey;
        console.log(`No filters specified. Defaulting to latest month: ${latestCycle.monthKey}`);
      } else {
        console.log('No payroll cycles found in database.');
        process.exit(0);
      }
    }

    const cycles = await PayrollCycle.findAll({
      where: whereClause,
      include: [{ model: OrgAccount, as: 'orgAccount' }]
    });

    console.log(`Found ${cycles.length} payroll cycles to process.`);

    for (const cycle of cycles) {
      const orgId = cycle.orgAccountId;
      const orgName = cycle.orgAccount?.name || `Org #${orgId}`;
      console.log(`\nProcessing Cycle #${cycle.id} | Month: ${cycle.monthKey} | Org: ${orgName}`);

      // Load salary settings
      const settingsRow = await AppSetting.findOne({
        where: { key: 'salary_settings', orgAccountId: orgId }
      });
      const salarySettings = settingsRow?.value ? JSON.parse(settingsRow.value) : null;
      const pfMode = salarySettings?.pfCalculationMode || 'basic';

      console.log(`PF Calculation Mode for Org: "${pfMode}"`);
      if (pfMode !== 'basic_minus_penalties') {
        console.log(`Skipping: Org is NOT configured for "basic_minus_penalties" (current: "${pfMode}")`);
        continue;
      }

      // Load all payroll lines for this cycle
      const lines = await PayrollLine.findAll({
        where: { cycleId: cycle.id },
        include: [{
          model: User,
          as: 'user',
          include: [{ model: SalaryTemplate, as: 'salaryTemplate' }]
        }]
      });

      console.log(`Found ${lines.length} payroll lines in this cycle.`);

      let updateCount = 0;
      for (const line of lines) {
        const u = line.user;
        if (!u) continue;
        if (!u.salaryTemplate) {
          // No salary template, keep as is
          continue;
        }

        const earnings = typeof line.earnings === 'string' ? JSON.parse(line.earnings) : line.earnings || {};
        const deductions = typeof line.deductions === 'string' ? JSON.parse(line.deductions) : line.deductions || {};
        const totals = typeof line.totals === 'string' ? JSON.parse(line.totals) : line.totals || {};

        // Parse template deductions
        const tD = u.salaryTemplate.deductions
          ? typeof u.salaryTemplate.deductions === 'string'
            ? JSON.parse(u.salaryTemplate.deductions)
            : u.salaryTemplate.deductions
          : [];

        const getRule = (key) => (Array.isArray(tD) ? tD : []).find(d => d.key === key);
        const pfRule = getRule('PROVIDENT_FUND_EMPLOYEE') || getRule('PROVIDENT_FUND');

        if (!pfRule) {
          // No PF rule in template
          continue;
        }

        const basicVal = Number(earnings.basic_salary || 0);
        const earlyExitPenalty = Number(deductions.early_exit_penalty || 0);
        const latePenalty = Number(deductions.late_punchin_penalty || 0);

        const pfBase = Math.max(0, basicVal - earlyExitPenalty - latePenalty);
        const newPF = Number((pfBase * (Number(pfRule.valueNumber || 0) / 100)).toFixed(2));
        const oldPF = Number(deductions.provident_fund || 0);

        if (Math.abs(newPF - oldPF) > 0.01) {
          console.log(`  Staff: ${u.phone} | Basic: ${basicVal} | Penalties: ${earlyExitPenalty + latePenalty} | Old PF: ${oldPF} -> New PF: ${newPF}`);
          
          // Update deductions
          deductions.provident_fund = newPF;
          
          // Re-calculate total deductions
          const totalDeductions = Object.values(deductions).reduce((s, v) => s + (Number(v) || 0), 0);
          const gross = totals.gross || 0;
          const net = Math.max(0, gross - totalDeductions);

          line.deductions = deductions;
          line.totals = {
            ...totals,
            totalDeductions: Number(totalDeductions.toFixed(2)),
            net: Number(net.toFixed(2))
          };

          await line.save();
          updateCount++;
        }
      }
      console.log(`Finished cycle #${cycle.id}: Updated ${updateCount} payroll lines.`);
    }

    console.log('\nRecalculation complete!');
  } catch (e) {
    console.error('Error running script:', e);
  } finally {
    process.exit(0);
  }
}

run();
