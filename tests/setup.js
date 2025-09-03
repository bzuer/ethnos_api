require('dotenv').config({ path: '.env.test' });

const { sequelize } = require('../src/config/database');

beforeAll(async () => {
  try {
    await sequelize.authenticate();
  } catch (error) {
    console.warn('Database connection failed in test setup:', error.message);
  }
});

afterAll(async () => {
  try {
    await sequelize.close();
  } catch (error) {
    console.warn('Error closing database connection:', error.message);
  }
});

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};