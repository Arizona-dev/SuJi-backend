// Jest setup file
import "reflect-metadata";
import { config } from 'dotenv';
import path from 'path';
import { DataSource } from 'typeorm';
import { TestDataSource } from '../config/test-database';
import { logger } from '../utils/logger';

// Load test environment variables
config({ path: path.resolve(process.cwd(), '.env.test') });

// Set default test environment variables if not loaded from file
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost'; // Use localhost for local testing
process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '5432';
process.env.TEST_DB_USERNAME = process.env.TEST_DB_USERNAME || 'postgres';
process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'password';
process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'suji_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_test-key-for-testing-only';

beforeAll(async () => {
  try {
    if (!TestDataSource.isInitialized) {
      // First, create the database using a connection to the default postgres database
      const dbName = TestDataSource.options.database as string;
      const adminDataSource = new DataSource({
        type: 'postgres',
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '5432'),
        username: process.env.TEST_DB_USERNAME || 'postgres',
        password: process.env.TEST_DB_PASSWORD || 'password',
        database: 'postgres', // Connect to default postgres database
      });

      await adminDataSource.initialize();
      try {
        await adminDataSource.query(`CREATE DATABASE "${dbName}"`);
        logger.info(`Created test database: ${dbName}`);
      } catch (createError: any) {
        // Database might already exist, ignore error
        if (!createError.message?.includes('already exists')) {
          throw createError;
        }
        logger.info(`Test database already exists: ${dbName}`);
      } finally {
        await adminDataSource.destroy();
      }

      // Now initialize the test database
      await TestDataSource.initialize();
      logger.info('Test database initialized successfully');

      // Create fresh schema for this test run
      await TestDataSource.synchronize();
      logger.info('Test database schema synchronized');
    }
  } catch (error) {
    logger.error('Error initializing test database:', error);
    throw error;
  }
}, 60000); // Increase timeout for database operations

afterAll(async () => {
  try {
    if (TestDataSource.isInitialized) {
      await TestDataSource.destroy();
      logger.info('Test database connection closed');
    }
  } catch (error) {
    logger.error('Error closing test database connection:', error);
  }
}, 30000);

afterEach(async () => {
  try {
    if (TestDataSource.isInitialized) {
      // Clear all tables using TRUNCATE with CASCADE
      const entities = TestDataSource.entityMetadatas;
      const tableNames = entities.map(entity => `"${entity.tableName}"`).join(', ');

      if (tableNames) {
        // Disable foreign key checks temporarily
        await TestDataSource.query('SET CONSTRAINTS ALL DEFERRED');
        await TestDataSource.query(`TRUNCATE ${tableNames} RESTART IDENTITY CASCADE`);
        // Re-enable foreign key checks
        await TestDataSource.query('SET CONSTRAINTS ALL IMMEDIATE');
      }
    }
  } catch (error) {
    logger.error('Error cleaning up test data:', error);
    // If truncate fails, try dropping and recreating schema
    try {
      await TestDataSource.dropDatabase();
      await TestDataSource.synchronize();
    } catch (fallbackError) {
      logger.error('Error in fallback cleanup:', fallbackError);
    }
  }
});
