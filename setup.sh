#!/bin/bash

# Game Store Backend - Complete Setup Script

echo "=========================================="
echo "Game Store Backend Setup"
echo "=========================================="

# Create logs directory
mkdir -p logs

# Build Docker images
echo ""
echo "Building services..."
docker-compose build

# Start services
echo ""
echo "Starting services..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# Wait for services to be ready
echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check service health
echo ""
echo "Service Status:"
docker-compose ps

# Test endpoints
echo ""
echo "=========================================="
echo "Testing Core Services"
echo "=========================================="

# Test Auth Service
echo ""
echo "1. Auth Service (Port 3001):"
curl -s http://localhost:3001/health | jq .

# Test Game Service
echo ""
echo "2. Game Service (Port 3002):"
curl -s http://localhost:3002/health | jq .

# Test Orders Service
echo ""
echo "3. Orders Service (Port 3003):"
curl -s http://localhost:3003/health | jq .

# Test Reviews Service
echo ""
echo "4. Reviews Service (Port 3004):"
curl -s http://localhost:3004/health | jq .

# Test API Gateway
echo ""
echo "5. API Gateway (Port 80):"
curl -s http://localhost/health | jq .

# Test Swagger Docs
echo ""
echo "=========================================="
echo "Swagger Documentation Endpoints"
echo "=========================================="
echo "Auth Service Docs:      http://localhost:3001/docs"
echo "Game Service Docs:      http://localhost:3002/docs"
echo "Orders Service Docs:    http://localhost:3003/docs"
echo "Reviews Service Docs:   http://localhost:3004/docs"

# Test Metrics
echo ""
echo "=========================================="
echo "Prometheus Metrics Endpoints"
echo "=========================================="
echo "Auth Service Metrics:   http://localhost:3001/metrics"
echo "Game Service Metrics:   http://localhost:3002/metrics"
echo "Orders Service Metrics: http://localhost:3003/metrics"
echo "Reviews Service Metrics: http://localhost:3004/metrics"

# Test Logs
echo ""
echo "=========================================="
echo "Log Files Location"
echo "=========================================="
echo "Combined Logs: ./logs/combined.log"
echo "Error Logs:    ./logs/error.log"
echo ""
echo "View logs: tail -f logs/combined.log"

# Create sample nginx prometheus config
echo ""
echo "=========================================="
echo "Setting up Monitoring (Optional)"
echo "=========================================="
echo ""
echo "To monitor with Prometheus, create prometheus.yml:"
cat > prometheus.yml.example << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'auth-service'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'

  - job_name: 'game-service'
    static_configs:
      - targets: ['localhost:3002']
    metrics_path: '/metrics'

  - job_name: 'orders-service'
    static_configs:
      - targets: ['localhost:3003']
    metrics_path: '/metrics'

  - job_name: 'reviews-service'
    static_configs:
      - targets: ['localhost:3004']
    metrics_path: '/metrics'
EOF

echo "Created prometheus.yml.example"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. View API Documentation: http://localhost:3001/docs"
echo "2. Monitor with Prometheus: http://localhost:9090"
echo "3. Check logs: tail -f logs/combined.log"
echo "4. Stop services: docker-compose down"
echo ""
