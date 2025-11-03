# KyuCollect Backend - Local Development Setup

This Docker Compose setup provides PostgreSQL and Redis for local development.

## Quick Start

1. **Start the services:**

   ```bash
   docker-compose up -d
   ```

2. **Copy environment file:**

   ```bash
   cp env.example .env
   ```

3. **Install dependencies:**

   ```bash
   pnpm install
   ```

4. **Run the application:**
   ```bash
   pnpm run dev
   ```

## Services Included

- **PostgreSQL 15**: Database on port 5432

  - Username: `postgres`
  - Password: `password`
  - Database: `kyucollect`

- **Redis 7**: Cache on port 6379

## Useful Commands

```bash
# Start services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ destroys data)
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build
```

## Testing

### E2E Tests with Docker

```bash
# Run e2e tests in isolated Docker environment
pnpm run test:e2e:docker

# Or manually:
# 1. Start test services
pnpm run test:setup

# 2. Wait for database to be ready
# 3. Run tests
pnpm run test:e2e

# 4. Stop test services
docker-compose -f docker-compose.test.yml down
```

### Local E2E Tests

For local testing without Docker, ensure PostgreSQL is running on port 5432 with the `kyucollect_test` database.

```bash
# Create test database
createdb kyucollect_test

# Run tests
pnpm run test:e2e
```

## Database Management

The database uses TypeORM with `synchronize: true` in development, so schema changes are applied automatically.

For production, use migrations:

```bash
pnpm run migration:generate -- -n MigrationName
pnpm run migration:run
```

## Troubleshooting

- **Port conflicts**: Ensure ports 5432 and 6379 are free
- **Database connection issues**: Wait for health checks to pass
- **Data persistence**: Data is stored in Docker volumes
