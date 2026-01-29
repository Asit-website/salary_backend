'use strict';

// Helper function to map template field names to database column names
function mapTemplateFieldToDbColumn(templateField) {
  const fieldMapping = {
    // Earnings fields (from staff-salary-fields migration)
    'basic_salary': 'basic_salary',
    'hra': 'hra',
    'da': 'da',
    'special_allowance': 'special_allowance',
    'conveyance': 'conveyance_allowance',
    'conveyance_allowance': 'conveyance_allowance',
    'medical': 'medical_allowance',
    'medical_allowance': 'medical_allowance',
    'telephone': 'telephone_allowance',
    'telephone_allowance': 'telephone_allowance',
    'other_allowances': 'other_allowances',
    
    // Incentive fields (from incentive-fields migration)
    'attendance_bonus': 'attendance_bonus',
    'performance_bonus': 'performance_bonus',
    'overtime': 'overtime_allowance',
    'overtime_allowance': 'overtime_allowance',
    'night_shift_allowance': 'night_shift_allowance',
    'experience_bonus': 'experience_bonus',
    'project_bonus': 'project_bonus',
    'management_bonus': 'management_bonus',
    'festival_bonus': 'festival_bonus',
    
    // Deduction fields (from staff-salary-fields migration)
    'pf': 'pf_deduction',
    'pf_deduction': 'pf_deduction',
    'esi': 'esi_deduction',
    'esi_deduction': 'esi_deduction',
    'professional_tax': 'professional_tax',
    'tds': 'tds_deduction',
    'tds_deduction': 'tds_deduction',
    'insurance': 'other_deductions', // Map to other_deductions as fallback
    'loan': 'other_deductions', // Map to other_deductions as fallback
    'loan_deduction': 'other_deductions',
    'advance_deduction': 'other_deductions',
    'other_deductions': 'other_deductions'
  };
  
  return fieldMapping[templateField] || null; // Return null if field doesn't exist
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all users with their salary templates
    const users = await queryInterface.sequelize.query(`
      SELECT u.id, u.salary_template_id, st.earnings, st.incentives, st.deductions
      FROM users u
      LEFT JOIN salary_templates st ON u.salary_template_id = st.id
      WHERE u.role = 'staff' AND u.salary_template_id IS NOT NULL
    `);

    for (const user of users[0]) {
      const userId = user.id;
      const templateId = user.salary_template_id;
      
      // Parse template fields
      const earnings = typeof user.earnings === 'string' ? JSON.parse(user.earnings) : user.earnings;
      const incentives = typeof user.incentives === 'string' ? JSON.parse(user.incentives) : user.incentives;
      const deductions = typeof user.deductions === 'string' ? JSON.parse(user.deductions) : user.deductions;

      // Prepare update data
      const updateData = {};

      // Process earnings - use template default values
      let totalEarnings = 0;
      if (Array.isArray(earnings)) {
        earnings.forEach(item => {
          const fieldName = item.key;
          let fieldValue = item.valueNumber || 0;
          
          // Map template field names to database column names
          const dbFieldName = mapTemplateFieldToDbColumn(fieldName);
          
          // Skip if field doesn't exist in database
          if (!dbFieldName) return;
          
          // For percentage-based fields, calculate based on basic salary
          if (item.type === 'percent' && item.meta && item.meta.basedOn) {
            const baseField = item.meta.basedOn;
            const baseValue = earnings.find(e => e.key === baseField)?.valueNumber || 0;
            fieldValue = (baseValue * item.valueNumber) / 100;
          }
          
          updateData[dbFieldName] = fieldValue;
          totalEarnings += fieldValue;
        });
      }
      updateData.total_earnings = totalEarnings;

      // Process incentives - use template default values
      let totalIncentives = 0;
      if (Array.isArray(incentives)) {
        incentives.forEach(item => {
          const fieldName = item.key;
          let fieldValue = item.valueNumber || 0;
          
          // Map template field names to database column names
          const dbFieldName = mapTemplateFieldToDbColumn(fieldName);
          
          // Skip if field doesn't exist in database
          if (!dbFieldName) return;
          
          // For percentage-based incentives, calculate based on gross salary
          if (item.type === 'percent' && item.meta && item.meta.basedOn) {
            const baseField = item.meta.basedOn;
            const baseValue = baseField === 'gross_salary' ? totalEarnings : 
                            earnings.find(e => e.key === baseField)?.valueNumber || 0;
            fieldValue = (baseValue * item.valueNumber) / 100;
          }
          
          updateData[dbFieldName] = fieldValue;
          totalIncentives += fieldValue;
        });
      }
      updateData.total_incentives = totalIncentives;

      // Process deductions - use template default values
      let totalDeductions = 0;
      if (Array.isArray(deductions)) {
        deductions.forEach(item => {
          const fieldName = item.key;
          let fieldValue = item.valueNumber || 0;
          
          // Map template field names to database column names
          const dbFieldName = mapTemplateFieldToDbColumn(fieldName);
          
          // Skip if field doesn't exist in database
          if (!dbFieldName) return;
          
          // For percentage-based deductions, calculate based on the specified base
          if (item.type === 'percent' && item.meta && item.meta.basedOn) {
            const baseField = item.meta.basedOn;
            const baseValue = baseField === 'gross_salary' ? (totalEarnings + totalIncentives) :
                            baseField === 'basic_salary' ? earnings.find(e => e.key === 'basic_salary')?.valueNumber || 0 :
                            earnings.find(e => e.key === baseField)?.valueNumber || 0;
            fieldValue = (baseValue * item.valueNumber) / 100;
          }
          
          updateData[dbFieldName] = fieldValue;
          totalDeductions += fieldValue;
        });
      }
      updateData.total_deductions = totalDeductions;

      // Calculate gross and net salary
      const grossSalary = totalEarnings + totalIncentives;
      const netSalary = grossSalary - totalDeductions;
      
      updateData.gross_salary = grossSalary;
      updateData.net_salary = netSalary;
      updateData.salary_last_calculated = new Date();

      // Build dynamic update query
      const setClause = Object.keys(updateData).map(key => `${key} = :${key}`).join(', ');
      const replacements = { ...updateData, userId };

      // Update user record
      await queryInterface.sequelize.query(`
        UPDATE users 
        SET ${setClause}
        WHERE id = :userId
      `, {
        replacements,
        type: Sequelize.QueryTypes.UPDATE
      });

      console.log(`Updated user ${userId} with template ${templateId} salary values:`, {
        totalEarnings,
        totalIncentives,
        totalDeductions,
        grossSalary,
        netSalary
      });
    }

    console.log('Successfully populated user salary fields based on templates');
  },

  down: async (queryInterface, Sequelize) => {
    // Reset all salary fields to 0 for staff users
    const salaryFields = [
      // Earnings fields
      'basic_salary', 'hra', 'da', 'special_allowance', 'conveyance_allowance',
      'medical_allowance', 'telephone_allowance', 'other_allowances',
      // Incentive fields
      'attendance_bonus', 'performance_bonus', 'overtime', 'overtime_allowance',
      'night_shift_allowance', 'experience_bonus', 'project_bonus', 'management_bonus',
      'festival_bonus',
      // Deduction fields
      'pf', 'pf_deduction', 'esi', 'esi_deduction', 'professional_tax',
      'tds', 'tds_deduction', 'insurance', 'loan', 'loan_deduction',
      'advance_deduction', 'other_deductions',
      // Total fields
      'total_earnings', 'total_incentives', 'total_deductions', 'gross_salary', 'net_salary'
    ];

    const setClause = salaryFields.map(field => `${field} = 0`).join(', ');
    
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET ${setClause}, salary_last_calculated = NULL
      WHERE role = 'staff'
    `);

    console.log('Reset all staff user salary fields to 0');
  }
};
