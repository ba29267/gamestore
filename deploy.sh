#!/bin/bash

# GameStore Kubernetes Deployment Script
# Automates: Docker build, image load, Kubernetes deployment, port-forwarding

set -e

ENVIRONMENT="${1:-development}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_LOAD="${SKIP_LOAD:-false}"
PORT_FORWARD="${PORT_FORWARD:-false}"

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
success() { echo -e "${GREEN}✓ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; exit 1; }
warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
info() { echo -e "${BLUE}→ $1${NC}"; }

# ============================================================================
# 1. CHECK PREREQUISITES
# ============================================================================
info "Step 1: Checking prerequisites..."

for tool in docker kubectl minikube; do
    if command -v $tool &> /dev/null; then
        success "$tool is installed"
    else
        error "Missing tool: $tool (https://kubernetes.io/docs/tasks/tools/)"
    fi
done

# ============================================================================
# 2. START MINIKUBE
# ============================================================================
echo ""
info "Step 2: Starting Minikube..."

if minikube status | grep -q "Running"; then
    success "Minikube is already running"
else
    warning "Starting Minikube (this may take a minute)..."
    minikube start --driver=docker 2>/dev/null || error "Failed to start Minikube"
    success "Minikube started successfully"
fi

# ============================================================================
# 3. BUILD DOCKER IMAGES
# ============================================================================
if [ "$SKIP_BUILD" = "true" ]; then
    warning "Skipping Docker build (SKIP_BUILD=true)"
else
    echo ""
    info "Step 3: Building Docker images..."
    
    if docker-compose build > /dev/null 2>&1; then
        success "All Docker images built successfully"
    else
        error "Docker build failed"
    fi
fi

# ============================================================================
# 4. LOAD IMAGES INTO MINIKUBE
# ============================================================================
if [ "$SKIP_LOAD" = "true" ]; then
    warning "Skipping image load (SKIP_LOAD=true)"
else
    echo ""
    info "Step 4: Loading images into Minikube..."
    
    images=(
        "gamestore-auth-service:latest"
        "gamestore-game-service:latest"
        "gamestore-orders-service:latest"
        "gamestore-reviews-service:latest"
        "gamestore-frontend:latest"
        "gamestore-api-gateway:latest"
    )
    
    for image in "${images[@]}"; do
        echo -n "  Loading $image..."
        if minikube image load "$image" 2>/dev/null; then
            echo -e " ${GREEN}✓${NC}"
        else
            echo -e " ${RED}✗${NC}"
            exit 1
        fi
    done
    
    success "All images loaded into Minikube"
fi

# ============================================================================
# 5. DEPLOY TO KUBERNETES
# ============================================================================
echo ""
info "Step 5: Deploying to Kubernetes ($ENVIRONMENT environment)..."

KUBE_OVERLAY="kubernetes/overlays/$ENVIRONMENT"

if [ ! -d "$KUBE_OVERLAY" ]; then
    error "Environment not found: $KUBE_OVERLAY (available: development, staging, production)"
fi

echo "Running: kubectl apply -k $KUBE_OVERLAY"
if kubectl apply -k "$KUBE_OVERLAY" > /dev/null 2>&1; then
    success "Kubernetes deployment successful"
else
    error "Kubernetes deployment failed"
fi

# ============================================================================
# 6. WAIT FOR PODS TO START
# ============================================================================
echo ""
info "Step 6: Waiting for pods to start (this may take a minute)..."

NAMESPACE="gamestore-$ENVIRONMENT"
MAX_WAIT=60
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    RUNNING=$(kubectl get pods -n "$NAMESPACE" 2>/dev/null | grep -c "Running" || echo 0)
    TOTAL=$(kubectl get pods -n "$NAMESPACE" 2>/dev/null | grep -c "^[a-z]" || echo 0)
    
    echo -ne "  Pods ready: $RUNNING/$TOTAL ...\r"
    
    if [ $RUNNING -ge 5 ]; then
        echo -e "  Pods ready: $RUNNING/$TOTAL ${GREEN}✓${NC}"
        break
    fi
    
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done

success "Pods are starting"

# ============================================================================
# 7. SHOW STATUS
# ============================================================================
echo ""
info "Step 7: Deployment Status"
echo "================================="
kubectl get pods -n "$NAMESPACE" --no-headers

# ============================================================================
# 8. SETUP PORT FORWARDS (Optional)
# ============================================================================
echo ""
info "Step 8: Port Forwarding Setup"
echo "================================="

if [ "$PORT_FORWARD" = "true" ]; then
    info "Starting port forwards..."
    
    # Kill existing kubectl port-forward processes
    pkill -f "kubectl port-forward.*frontend" 2>/dev/null || true
    pkill -f "kubectl port-forward.*grafana" 2>/dev/null || true
    pkill -f "kubectl port-forward.*prometheus" 2>/dev/null || true
    
    # Start new port forwards in background
    kubectl port-forward -n "$NAMESPACE" svc/frontend 8000:3000 > /dev/null 2>&1 &
    kubectl port-forward -n "$NAMESPACE" svc/grafana 3005:3000 > /dev/null 2>&1 &
    kubectl port-forward -n "$NAMESPACE" svc/prometheus 9090:9090 > /dev/null 2>&1 &
    
    sleep 2
    success "Port forwards started"
else
    warning "To start port forwards, run:"
    echo "  PORT_FORWARD=true ./deploy.sh"
fi

# ============================================================================
# 9. SHOW ACCESS URLS
# ============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"

echo ""
success "Access your services:"
echo ""
echo -e "  Frontend (React)     →  ${GREEN}http://localhost:8000${NC}"
echo -e "  Grafana Dashboards   →  ${GREEN}http://localhost:3005${NC}  (admin/admin)"
echo -e "  Prometheus Metrics   →  ${GREEN}http://localhost:9090${NC}"
echo -e "  API Gateway          →  ${GREEN}http://localhost${NC}"
echo -e "  Swagger Docs         →  ${GREEN}http://localhost:3002/docs${NC}"
echo -e "  GraphQL              →  ${GREEN}http://localhost:3002/graphql${NC}"

echo ""
success "Useful commands:"
echo "  kubectl get pods -n $NAMESPACE                  # View all pods"
echo "  kubectl logs -f deployment/game-service -n $NAMESPACE     # View logs"
echo "  kubectl exec -it postgres-0 -n $NAMESPACE -- psql -U gamestore_user -d gamestore_db  # Access database"

echo ""
success "To stop the deployment:"
echo "  kubectl delete -k $KUBE_OVERLAY"

echo ""
info "Documentation: See README.md for detailed information"
echo ""
