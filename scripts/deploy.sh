#!/bin/bash
echo "🚀 Deploying Smart City Platform to Server..."

SERVER_HOST="103.147.92.134"
SERVER_PORT="8989"
SERVER_USER="mahasiswa"
SERVER_DIR="/home/kelompokN/tubes-pplbs-3"

ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} << EOF
  cd ${SERVER_DIR}
  
  echo "📥 Pulling latest changes..."
  git pull origin feature/a6-devops
  
  echo "⚙️  Copying .env file..."
  cp .env.example .env
  
  echo "🐳 Building and starting containers..."
  docker-compose down
  docker-compose up -d --build
  
  echo "⏳ Waiting for MySQL to be ready..."
  sleep 30
  
  echo "🗄️  Running database migrations..."
  bash scripts/migrate.sh
  
  echo "🔍 Checking service status..."
  docker-compose ps
  
  echo "✅ Deployment completed!"
EOF