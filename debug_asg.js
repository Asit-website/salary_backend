
const { StaffShiftAssignment, ShiftTemplate } = require('./src/models');
const { Op } = require('sequelize');

async function debug() {
  const userId = 29;
  const asgs = await StaffShiftAssignment.findAll({
    where: { userId },
    include: [{ model: ShiftTemplate, as: 'template' }],
    order: [['effectiveFrom', 'ASC']]
  });
  console.log('Assignments:', JSON.stringify(asgs, null, 2));
}
debug();
