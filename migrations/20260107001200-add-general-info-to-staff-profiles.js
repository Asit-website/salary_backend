module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('staff_profiles', 'dob', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'gender', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'marital_status', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'nationality', {
      type: Sequelize.STRING(60),
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'personal_mobile', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'emergency_contact_name', {
      type: Sequelize.STRING(150),
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'current_address', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'permanent_address', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'work_location', {
      type: Sequelize.STRING(120),
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'reporting_manager', {
      type: Sequelize.STRING(120),
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'shift_timing', {
      type: Sequelize.STRING(120),
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      "UPDATE staff_profiles SET dob = COALESCE(dob, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.dob')), '')) WHERE extra IS NOT NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE staff_profiles SET gender = COALESCE(gender, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.gender')), '')) WHERE extra IS NOT NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE staff_profiles SET marital_status = COALESCE(marital_status, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.maritalStatus')), '')) WHERE extra IS NOT NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE staff_profiles SET nationality = COALESCE(nationality, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.nationality')), '')) WHERE extra IS NOT NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE staff_profiles SET personal_mobile = COALESCE(personal_mobile, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.personalMobile')), '')) WHERE extra IS NOT NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE staff_profiles SET emergency_contact_name = COALESCE(emergency_contact_name, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.emergencyContactName')), '')) WHERE extra IS NOT NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE staff_profiles SET current_address = COALESCE(current_address, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.currentAddress')), '')) WHERE extra IS NOT NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE staff_profiles SET permanent_address = COALESCE(permanent_address, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.permanentAddress')), '')) WHERE extra IS NOT NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE staff_profiles SET work_location = COALESCE(work_location, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.workLocation')), '')) WHERE extra IS NOT NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE staff_profiles SET reporting_manager = COALESCE(reporting_manager, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.reportingManager')), '')) WHERE extra IS NOT NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE staff_profiles SET shift_timing = COALESCE(shift_timing, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.shiftTiming')), '')) WHERE extra IS NOT NULL"
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('staff_profiles', 'shift_timing');
    await queryInterface.removeColumn('staff_profiles', 'reporting_manager');
    await queryInterface.removeColumn('staff_profiles', 'work_location');
    await queryInterface.removeColumn('staff_profiles', 'permanent_address');
    await queryInterface.removeColumn('staff_profiles', 'current_address');
    await queryInterface.removeColumn('staff_profiles', 'emergency_contact_name');
    await queryInterface.removeColumn('staff_profiles', 'personal_mobile');
    await queryInterface.removeColumn('staff_profiles', 'nationality');
    await queryInterface.removeColumn('staff_profiles', 'marital_status');
    await queryInterface.removeColumn('staff_profiles', 'gender');
    await queryInterface.removeColumn('staff_profiles', 'dob');
  },
};
