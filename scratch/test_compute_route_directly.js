const express = require('express');
const { User, PayrollCycle, PayrollLine, AppSetting } = require('../src/models');
const adminRouter = require('../src/routes/admin.js');

async function runTest() {
  try {
    // 1. Force setting to basic_minus_penalties
    const settingRow = await AppSetting.findOne({ where: { key: 'salary_settings', orgAccountId: 10 } });
    if (settingRow) {
      const val = JSON.parse(settingRow.value);
      val.pfCalculationMode = 'basic_minus_penalties';
      await settingRow.update({ value: JSON.stringify(val) });
      console.log('Force updated setting pfCalculationMode to basic_minus_penalties');
    }

    // 2. Find the endpoint /payroll/:cycleId/compute
    const route = adminRouter.stack.find(s => s.route && s.route.path === '/payroll/:cycleId/compute');
    if (!route) {
      console.error('Route not found');
      process.exit(1);
    }
    const handler = route.route.stack[0].handle;

    // Mock req and res
    const req = {
      params: { cycleId: '134' },
      body: { staffId: 185 },
      tenantOrgAccountId: 10,
      headers: {}
    };

    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        console.log('Response Status:', this.statusCode || 200);
        
        // Let's also fetch from DB to verify it was written correctly
        setTimeout(verifyDB, 1000);
      }
    };

    async function verifyDB() {
      try {
        const line = await PayrollLine.findOne({ where: { cycleId: 134, userId: 185 } });
        console.log('=== VERIFY DB RESULT ===');
        console.log('Line ID:', line.id);
        console.log('Deductions:', typeof line.deductions === 'string' ? JSON.parse(line.deductions) : line.deductions);
        console.log('Totals:', typeof line.totals === 'string' ? JSON.parse(line.totals) : line.totals);
        process.exit(0);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    }

    // Call handler
    await handler(req, res);
  } catch (err) {
    console.error('Error running handler:', err);
    process.exit(1);
  }
}

runTest();
