#!/bin/bash
echo "📦 Running database migrations on server..."
cd /opt/smartcity-platform

echo "Creating databases and tables..."
docker exec -i smartcity-mysql mysql -uroot -ppassword < database/schema.sql

echo "Seeding data (200+ rows)..."
docker exec -i smartcity-mysql mysql -uroot -ppassword < database/seed.sql

echo "✅ Migrations completed!"