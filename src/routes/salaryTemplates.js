const express = require('express');
const router = express.Router();
const { SalaryTemplate } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Get all salary templates
router.get('/', authRequired, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const templates = await SalaryTemplate.findAll({
      where: { active: true },
      order: [['name', 'ASC']]
    });
    return res.json({ success: true, data: templates });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch salary templates' });
  }
});

// Get salary template by ID
router.get('/:id', authRequired, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const template = await SalaryTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Salary template not found' });
    }
    return res.json({ success: true, data: template });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch salary template' });
  }
});

// Create new salary template
router.post('/', authRequired, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const template = await SalaryTemplate.create(req.body);
    return res.json({ success: true, data: template });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create salary template' });
  }
});

// Update salary template
router.put('/:id', authRequired, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const template = await SalaryTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Salary template not found' });
    }
    
    await template.update(req.body);
    return res.json({ success: true, data: template });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update salary template' });
  }
});

// Delete salary template (soft delete)
router.delete('/:id', authRequired, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const template = await SalaryTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Salary template not found' });
    }
    
    await template.update({ active: false });
    return res.json({ success: true, message: 'Salary template deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete salary template' });
  }
});

// Calculate salary based on template
router.post('/:id/calculate', authRequired, async (req, res) => {
  try {
    const template = await SalaryTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Salary template not found' });
    }

    const { attendanceData = {} } = req.body;
    const { workingDays = 26, presentDays = 26, unpaidDays = 0, weeklyOffDays = 0 } = attendanceData;

    // Calculate earnings
    let earnings = {};
    let totalEarnings = 0;
    
    template.earnings.forEach(item => {
      let value = 0;
      if (item.type === 'fixed') {
        value = item.valueNumber;
      } else if (item.type === 'percent') {
        const baseValue = earnings[item.meta?.basedOn] || 0;
        value = (baseValue * item.valueNumber) / 100;
      }
      earnings[item.key] = value;
      totalEarnings += value;
    });

    // Calculate incentives
    let incentives = {};
    let totalIncentives = 0;
    
    template.incentives.forEach(item => {
      let value = 0;
      if (item.type === 'fixed') {
        value = item.valueNumber;
      } else if (item.type === 'percent') {
        const baseValue = earnings[item.meta?.basedOn] || totalEarnings;
        value = (baseValue * item.valueNumber) / 100;
      }
      incentives[item.key] = value;
      totalIncentives += value;
    });

    // Calculate deductions
    let deductions = {};
    let totalDeductions = 0;
    
    template.deductions.forEach(item => {
      let value = 0;
      if (item.type === 'fixed') {
        value = item.valueNumber;
      } else if (item.type === 'percent') {
        const baseValue = item.meta?.basedOn === 'gross_salary' ? 
          totalEarnings + totalIncentives : 
          earnings[item.meta?.basedOn] || 0;
        value = (baseValue * item.valueNumber) / 100;
      }
      deductions[item.key] = value;
      totalDeductions += value;
    });

    // Calculate gross and net salary
    const grossSalary = totalEarnings + totalIncentives;
    const netSalary = grossSalary - totalDeductions;

    // Apply attendance factor: unpaid leaves reduce presence; weekly-off days are counted as present
    const effectivePresent = Math.max(0, (Number(presentDays) || 0) - (Number(unpaidDays) || 0) + (Number(weeklyOffDays) || 0));
    const attendanceFactor = Math.max(0, Math.min(1, workingDays > 0 ? (effectivePresent / workingDays) : 1));
    const finalNetSalary = netSalary * attendanceFactor;

    return res.json({
      success: true,
      data: {
        template: template,
        earnings: { ...earnings, total: totalEarnings },
        incentives: { ...incentives, total: totalIncentives },
        deductions: { ...deductions, total: totalDeductions },
        grossSalary,
        netSalary,
        attendanceFactor,
        finalNetSalary,
        workingDays,
        presentDays
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to calculate salary' });
  }
});

module.exports = router;
