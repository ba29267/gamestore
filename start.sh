#!/bin/bash

echo "========================================"
echo "GameStore Frontend and Backend Startup"
echo "========================================"
echo

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    echo "Please install Docker from https://www.docker.com"
    exit 1
fi

echo "✓ Docker found"
echo

echo "Starting GameStore services..."
echo "- PostgreSQL Database"
echo "- Redis Cache"
echo "- Solr Search"
echo "- Auth Service (port 3001)"
echo "- Game Service (port 3002)"
echo "- Orders Service (port 3003)"
echo "- Reviews Service (port 3004)"
echo "- Frontend (port 8000)"
echo "- API Gateway (port 80)"
echo "- Prometheus (port 9090)"
echo "- Grafana (port 3005)"
echo

echo "Running: docker-compose up -d"
docker-compose up -d

echo
echo "Waiting for services to start..."
sleep 5

echo
echo "========================================"
echo "Services Starting!"
echo "========================================"
echo
echo "Frontend:   http://localhost:8000"
echo "API:        http://localhost:80"
echo "Grafana:    http://localhost:3005 (admin/admin)"
echo "Prometheus: http://localhost:9090"
echo
echo "Backend Services:"
echo "- Auth:     http://localhost:3001"
echo "- Game:     http://localhost:3002"
echo "- Orders:   http://localhost:3003"
echo "- Reviews:  http://localhost:3004"
echo

# Show service status
docker-compose ps

echo
echo "To stop all services: docker-compose down"
echo "To view logs: docker-compose logs -f"
echo
