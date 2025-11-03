#!/bin/bash

# Local E2E Test Runner
# This script assumes you have PostgreSQL running locally on port 5432

set -e

echo "🚀 Setting up local test environment..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5433 >/dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on localhost:5433"
    echo "Please start PostgreSQL and ensure it's accessible"
    exit 1
fi

# Check if test database exists, create if not
if ! psql -h localhost -p 5433 -U postgres -l | grep -q kyucollect_test; then
    echo "📦 Creating test database..."
    createdb -h localhost -p 5433 -U postgres kyucollect_test
fi

echo "🧪 Running E2E tests..."
npm run test:e2e

echo "✅ Tests completed!"
