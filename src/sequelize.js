require('dotenv').config();

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'thinktech_attendance',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
    timezone: '+05:30',
    dialectOptions: {
      connectTimeout: 15000,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 20000,
      idle: 10000,
    },
  }
);

module.exports = { sequelize };
