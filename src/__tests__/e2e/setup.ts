import { config } from 'dotenv';
import path from 'path';
import { TestDataSource } from '../../config/test-database';
import { logger } from '../../utils/logger';

// Load test environment variables
config({ path: path.resolve(process.cwd(), '.env.test') });

// Set default test environment variables if not loaded from file
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost'; // Use localhost for local testing
process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '5432';
process.env.TEST_DB_USERNAME = process.env.TEST_DB_USERNAME || 'postgres';
process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'password';
process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'kyucollect_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

beforeAll(async () => {
  try {
    await TestDataSource.initialize();
    logger.info('Test database initialized successfully');

    // Ensure schema is properly synchronized
    await TestDataSource.synchronize(true);
    logger.info('Test database schema synchronized');
  } catch (error) {
    logger.error('Error initializing test database:', error);
    throw error;
  }
}, 60000); // Increase timeout for database operations

afterAll(async () => {
  try {
    await TestDataSource.destroy();
    logger.info('Test database connection closed');
  } catch (error) {
    logger.error('Error closing test database connection:', error);
  }
}, 30000);

afterEach(async () => {
  try {
    // Clear all tables for clean state between tests
    const entities = TestDataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = TestDataSource.getRepository(entity.name);
      await repository.clear();
    }
  } catch (error) {
    logger.error('Error cleaning up test data:', error);
  }
});
