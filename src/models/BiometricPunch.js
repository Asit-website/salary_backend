const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BiometricPunch = sequelize.define(
    'BiometricPunch',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'user_id',
        references: { model: 'users', key: 'id' }
      },
      orgAccountId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'org_account_id',
        references: { model: 'org_accounts', key: 'id' }
      },
      punchTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'punch_time'
      },
      direction: {
        type: DataTypes.STRING(32),
        allowNull: true
      },
      deviceName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'device_name'
      },
      serialNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'serial_number'
      },
      verificationType: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'verification_type'
      }
    },
    {
      tableName: 'biometric_punches',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          name: 'uniq_user_punch_time',
          fields: ['user_id', 'punch_time']
        },
        {
          fields: ['org_account_id']
        }
      ]
    }
  );

  return BiometricPunch;
};
