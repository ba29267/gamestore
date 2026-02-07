#!/bin/bash

# GameStore Docker Build and Push Script
# Builds all services and pushes them to Google Artifact Registry

set -e

PROJECT_ID=${1:-your-gcp-project-id}
REGION=${2:-us-central1}
TAG=${3:-latest}

if [ "$PROJECT_ID" = "your-gcp-project-id" ]; then
    echo "ERROR: Please provide your GCP Project ID as first argument"
    echo "Usage: ./kubernetes/build-and-push.sh <PROJECT_ID> <REGION> [TAG]"
    exit 1
fi

IMAGE_REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/gamestore-repo"

echo "=========================================="
echo "Building and Pushing Docker Images"
echo "=========================================="
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Image Repository: $IMAGE_REPO"
echo "Tag: $TAG"
echo "=========================================="

# Function to build and push image
build_and_push() {
    local service_name=$1
    local service_path=$2
    
    echo ""
    echo "[*] Building $service_name..."
    cd "$service_path"
    
    docker build \
        --tag "${IMAGE_REPO}/gamestore-${service_name}:${TAG}" \
        --tag "${IMAGE_REPO}/gamestore-${service_name}:latest" \
        .
    
    echo "[*] Pushing $service_name..."
    docker push "${IMAGE_REPO}/gamestore-${service_name}:${TAG}"
    docker push "${IMAGE_REPO}/gamestore-${service_name}:latest"
    
    echo "✓ $service_name pushed successfully"
    cd - > /dev/null
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker daemon is not running"
    exit 1
fi

# Ensure we're in the correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo "ERROR: docker-compose.yml not found. Please run from project root."
    exit 1
fi

# Build and push each service
build_and_push "auth-service" "services/auth-service"
build_and_push "game-service" "services/game-service"
build_and_push "orders-service" "services/orders-service"
build_and_push "reviews-service" "services/reviews-service"
build_and_push "frontend" "frontend"

echo ""
echo "=========================================="
echo "All images built and pushed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update image references in kubernetes/base/*.yaml"
echo "2. Replace 'gcr.io/PROJECT_ID/' with '${IMAGE_REPO}/gamestore-'"
echo "3. Deploy with: kubectl apply -k kubernetes/base"
echo ""
