# KyuCollect Backend API

Node.js/Express backend API for KyuCollect SaaS platform.

## Features

- **Authentication**: JWT-based auth with Google/Apple OAuth for customers and store owners
- **Store Management**: CRUD operations for restaurants, holiday mode, opening hours
- **Menu Management**: Dynamic menus with ingredients, availability control
- **Order Processing**: Click & collect orders with time slots
- **Payment Integration**: Stripe cards, meal vouchers (Swile, Edenred, Sodexo, etc.), cash
- **Analytics**: Order history, revenue tracking, customer insights
- **Ingredient Auto-Reactivation**: Cron jobs for daily ingredient reactivation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis
- **Authentication**: JWT + Passport.js (Google/Apple OAuth)
- **Payments**: Stripe SDK + meal voucher provider APIs
- **Validation**: Joi + express-validator
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Winston
- **Testing**: Jest
- **Development**: TypeScript, ESLint, ts-node-dev

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (recommended for local development)
- pnpm

**Alternative**: Manual setup
- PostgreSQL 13+
- Redis 6+

### Installation

1. **Clone and navigate to backend directory**

   ```bash
   cd kyucollect-backend
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Environment setup**

   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start Docker services**

   ```bash
   # Start PostgreSQL and Redis
   pnpm run docker:up

   # Database is automatically created by Docker Compose
   # Run migrations (when implemented)
   pnpm run migration:run
   ```

5. **Start development server**
   ```bash
   pnpm run dev
   ```

The API will be available at `http://localhost:3000`

### Available Scripts

- `pnpm run dev` - Start development server with hot reload
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run test` - Run tests
- `pnpm run lint` - Run ESLint
- `pnpm run migration:generate` - Generate new migration
- `pnpm run migration:run` - Run pending migrations
- `pnpm run migration:revert` - Revert last migration
- `pnpm run docker:up` - Start Docker services (PostgreSQL + Redis)
- `pnpm run docker:down` - Stop Docker services
- `pnpm run docker:logs` - View Docker service logs
- `pnpm run docker:clean` - Stop services and remove volumes

## API Documentation

### Authentication Endpoints

- `POST /api/auth/customer/login` - Customer login
- `POST /api/auth/customer/register` - Customer registration
- `POST /api/auth/store/login` - Store owner login
- `POST /api/auth/store/register` - Store owner registration
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/apple` - Apple OAuth

### Store Endpoints

- `GET /api/stores` - Get all stores
- `GET /api/stores/:id` - Get store by ID
- `POST /api/stores` - Create store (store owners only)
- `PUT /api/stores/:id` - Update store (store owners only)
- `PUT /api/stores/:id/holiday` - Toggle holiday mode

### Menu Endpoints

- `GET /api/menus/store/:storeId` - Get menu for store
- `POST /api/menus` - Create menu item (store owners only)
- `PUT /api/menus/:id` - Update menu item (store owners only)
- `DELETE /api/menus/:id` - Delete menu item (store owners only)
- `GET /api/menus/ingredients/:storeId` - Get ingredients (store owners only)
- `PUT /api/menus/ingredients/:id/disable` - Disable ingredient
- `PUT /api/menus/ingredients/:id/enable` - Enable ingredient

### Order Endpoints

- `POST /api/orders` - Create order (customers)
- `GET /api/orders/store/:storeId` - Get orders for store (store owners)
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/status` - Update order status (store owners)
- `GET /api/orders/history/store/:storeId` - Order history with filters
- `GET /api/orders/history/export/:storeId` - Export order history (CSV/PDF)

### Payment Endpoints

- `POST /api/payments/stripe/create-intent` - Create Stripe payment intent
- `POST /api/payments/stripe/webhook` - Handle Stripe webhooks
- `POST /api/payments/meal-voucher/validate` - Validate meal voucher
- `POST /api/payments/meal-voucher/process` - Process meal voucher payment
- `POST /api/payments/cash` - Mark order as cash payment
- `GET /api/payments/discounts/store/:storeId` - Get discounts
- `POST /api/payments/discounts` - Create discount (store owners)
- `PUT /api/payments/discounts/:id` - Update discount (store owners)
- `DELETE /api/payments/discounts/:id` - Delete discount (store owners)

## Project Structure

```
src/
├── config/           # Database and app configuration
├── controllers/      # Route handlers
├── entities/         # TypeORM entities
├── middlewares/      # Express middlewares
├── routes/          # API routes
├── services/        # Business logic services
├── utils/           # Utility functions
└── __tests__/       # Test files
```

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Run `pnpm run lint` before committing

## License

Copyright © 2025 KyuCollect
