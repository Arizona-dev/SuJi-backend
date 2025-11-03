import express, { Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'reflect-metadata';
import { body } from 'express-validator';

import { TestDataSource } from '../../config/test-database';
import { logger } from '../../utils/logger';
import { errorHandler } from '../../middlewares/errorHandler';
import { AuthController } from '../../controllers/auth/auth.controller';
import { StoresController } from '../../controllers/stores/stores.controller';
import { MenusController } from '../../controllers/menus/menus.controller';
import { OrdersController } from '../../controllers/orders/orders.controller';

// Import route functions that accept controllers
import { createStoreRoutes } from '../../routes/stores/stores.routes';
import { createMenuRoutes } from '../../routes/menus/menus.routes';
import { createOrderRoutes } from '../../routes/orders/orders.routes';

// Import payment routes (no controller needed yet)
import paymentRoutes from '../../routes/payments/payments.routes';

export function createTestApp(): express.Application {
  const app = express();

  // Rate limiting (relaxed for tests)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Higher limit for tests
    message: 'Too many requests from this IP, please try again later.',
  });

  // Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    })
  );
  app.use(compression());
  app.use(limiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Create auth routes with TestDataSource
  const authRouter = Router();
  const authController = new AuthController(TestDataSource);
  
  authRouter.post(
    '/customer/login',
    [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 6 }),
    ],
    authController.customerLogin.bind(authController)
  );
  
  authRouter.post(
    '/customer/register',
    [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 6 }),
      body('firstName').trim().isLength({ min: 1 }),
      body('lastName').trim().isLength({ min: 1 }),
    ],
    authController.customerRegister.bind(authController)
  );
  
  authRouter.post(
    '/store/login',
    [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 6 }),
    ],
    authController.storeOwnerLogin.bind(authController)
  );
  
  authRouter.post(
    '/store/register',
    [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 6 }),
      body('storeName').trim().isLength({ min: 1 }),
    ],
    authController.storeOwnerRegister.bind(authController)
  );
  
  authRouter.get('/google', authController.googleOAuth.bind(authController));
  authRouter.get('/apple', authController.appleOAuth.bind(authController));

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/stores', createStoreRoutes(TestDataSource));
  app.use('/api/menus', createMenuRoutes(TestDataSource));
  app.use('/api/orders', createOrderRoutes(TestDataSource));
  app.use('/api/payments', paymentRoutes);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  return app;
}
