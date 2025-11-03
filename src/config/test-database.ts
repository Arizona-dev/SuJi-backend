import { DataSource } from 'typeorm';
import { User } from '../entities/auth/User';
import { Store } from '../entities/stores/Store';
import { Menu } from '../entities/menus/Menu';
import { MenuItem } from '../entities/menus/MenuItem';
import { Ingredient } from '../entities/menus/Ingredient';
import { Order } from '../entities/orders/Order';
import { OrderItem } from '../entities/orders/OrderItem';
import { Payment } from '../entities/payments/Payment';
import { Discount } from '../entities/payments/Discount';
import { AuditLog } from '../entities/audit/AuditLog';

// Generate unique database name for each test run to avoid enum conflicts
const uniqueDbName = `kyucollect_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

export const TestDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  username: process.env.TEST_DB_USERNAME || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
  database: uniqueDbName,
  synchronize: false, // We'll handle synchronization manually
  logging: false,
  dropSchema: false, // We'll handle schema dropping manually with dropDatabase()
  entities: [
    User,
    Store,
    Menu,
    MenuItem,
    Ingredient,
    Order,
    OrderItem,
    Payment,
    Discount,
    AuditLog,
  ],
});
