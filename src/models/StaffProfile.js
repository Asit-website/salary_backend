const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffProfile = sequelize.define(
    'StaffProfile',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: false, 
        unique: true,
        field: 'user_id'
      },

      staffId: { 
        type: DataTypes.STRING(50), 
        allowNull: true, 
        unique: true,
        field: 'staff_id'
      },
      name: { type: DataTypes.STRING(150), allowNull: true },
      email: { type: DataTypes.STRING(191), allowNull: true },
      phone: { type: DataTypes.STRING(20), allowNull: true },

      designation: { type: DataTypes.STRING(120), allowNull: true },
      department: { type: DataTypes.STRING(120), allowNull: true },
      staffType: { 
        type: DataTypes.STRING(80), 
        allowNull: true,
        field: 'staff_type'
      },
      dateOfJoining: { 
        type: DataTypes.DATEONLY, 
        allowNull: true,
        field: 'date_of_joining'
      },

      addressLine1: { 
        type: DataTypes.STRING(255), 
        allowNull: true,
        field: 'address_line1'
      },
      addressLine2: { 
        type: DataTypes.STRING(255), 
        allowNull: true,
        field: 'address_line2'
      },
      city: { type: DataTypes.STRING(100), allowNull: true },
      state: { type: DataTypes.STRING(100), allowNull: true },
      postalCode: { 
        type: DataTypes.STRING(20), 
        allowNull: true,
        field: 'postal_code'
      },

      emergencyContact: { 
        type: DataTypes.STRING(20), 
        allowNull: true,
        field: 'emergency_contact'
      },
      bloodGroup: { 
        type: DataTypes.STRING(10), 
        allowNull: true,
        field: 'blood_group'
      },

      photoUrl: { 
        type: DataTypes.STRING(255), 
        allowNull: true,
        field: 'photo_url'
      },

      dob: { type: DataTypes.DATEONLY, allowNull: true },
      gender: { type: DataTypes.STRING(20), allowNull: true },
      maritalStatus: { 
        type: DataTypes.STRING(30), 
        allowNull: true,
        field: 'marital_status'
      },
      nationality: { type: DataTypes.STRING(60), allowNull: true },
      personalMobile: { 
        type: DataTypes.STRING(20), 
        allowNull: true,
        field: 'personal_mobile'
      },
      emergencyContactName: { 
        type: DataTypes.STRING(150), 
        allowNull: true,
        field: 'emergency_contact_name'
      },
      currentAddress: { 
        type: DataTypes.TEXT, 
        allowNull: true,
        field: 'current_address'
      },
      permanentAddress: { 
        type: DataTypes.TEXT, 
        allowNull: true,
        field: 'permanent_address'
      },
      workLocation: { 
        type: DataTypes.STRING(120), 
        allowNull: true,
        field: 'work_location'
      },
      reportingManager: { 
        type: DataTypes.STRING(120), 
        allowNull: true,
        field: 'reporting_manager'
      },
      shiftTiming: { 
        type: DataTypes.STRING(120), 
        allowNull: true,
        field: 'shift_timing'
      },

      // New fields for staff management
      attendanceSettingTemplate: { 
        type: DataTypes.STRING(100), 
        allowNull: true,
        field: 'attendance_setting_template'
      },
      salaryCycleDate: { 
        type: DataTypes.DATEONLY, 
        allowNull: true,
        field: 'salary_cycle_date'
      },
      shiftSelection: { 
        type: DataTypes.STRING(100), 
        allowNull: true,
        field: 'shift_selection'
      },
      openingBalance: { 
        type: DataTypes.TEXT, 
        allowNull: true,
        field: 'opening_balance'
      },
      salaryDetailAccess: { 
        type: DataTypes.BOOLEAN, 
        allowNull: true,
        defaultValue: false,
        field: 'salary_detail_access'
      },
      allowCurrentCycleSalaryAccess: { 
        type: DataTypes.BOOLEAN, 
        allowNull: true,
        defaultValue: false,
        field: 'allow_current_cycle_salary_access'
      },

      bankAccountHolderName: { 
        type: DataTypes.STRING(150), 
        allowNull: true,
        field: 'bank_account_holder_name'
      },
      bankAccountNumber: { 
        type: DataTypes.STRING(50), 
        allowNull: true,
        field: 'bank_account_number'
      },
      bankIfsc: { 
        type: DataTypes.STRING(20), 
        allowNull: true,
        field: 'bank_ifsc'
      },
      bankName: { type: DataTypes.STRING(120), allowNull: true },
      bankBranch: { 
        type: DataTypes.STRING(120), 
        allowNull: true,
        field: 'bank_branch'
      },
      upiId: { 
        type: DataTypes.STRING(120), 
        allowNull: true,
        field: 'upi_id'
      },

      extra: { type: DataTypes.JSON, allowNull: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    {
      tableName: 'staff_profiles',
      underscored: true,
    }
  );

  return StaffProfile;
};
