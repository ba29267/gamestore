#!/bin/bash

# Build and Push GameStore Images to Docker Hub
# Usage: ./build-and-push-dockerhub.sh [username] [tag] [push]
# Example: ./build-and-push-dockerhub.sh bejtulla latest true

set -e

DOCKER_USERNAME="${1:-bejtulla}"
IMAGE_TAG="${2:-latest}"
PUSH_TO_HUB="${3:-true}"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       GameStore - Docker Build & Push Script              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Configuration:"
echo "  Docker Hub Username: $DOCKER_USERNAME"
echo "  Image Tag: $IMAGE_TAG"
echo "  Push to Hub: $PUSH_TO_HUB"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Array of services to build
declare -a SERVICES=(
    "auth-service|services/auth-service|gamestore-auth-service"
    "game-service|services/game-service|gamestore-game-service"
    "orders-service|services/orders-service|gamestore-orders-service"
    "reviews-service|services/reviews-service|gamestore-reviews-service"
    "frontend|frontend|gamestore-frontend"
    "api-gateway|nginx|gamestore-api-gateway"
)

SUCCESS_COUNT=0
FAIL_COUNT=0

# Check if Docker is running
echo -e "${CYAN}Checking Docker daemon...${NC}"
if ! docker ps &> /dev/null; then
    echo -e "${RED}✗ Docker is not running.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# If pushing to Hub, check authentication
if [ "$PUSH_TO_HUB" = "true" ]; then
    echo -e "${CYAN}Checking Docker Hub authentication...${NC}"
    if docker info 2>/dev/null | grep -q "Username"; then
        echo -e "${GREEN}✓ Docker Hub authentication ready${NC}"
    else
        echo -e "${RED}✗ Not logged in to Docker Hub${NC}"
        echo "Run: docker login"
        exit 1
    fi
fi

echo ""
echo "─────────────────────────────────────────────────────────────"
echo -e "${CYAN}Building Images${NC}"
echo "─────────────────────────────────────────────────────────────"

# Build each service
for service_info in "${SERVICES[@]}"; do
    IFS='|' read -r service_name service_path image_name <<< "$service_info"
    
    IMAGE="$DOCKER_USERNAME/$image_name:$IMAGE_TAG"
    DOCKERFILE="$service_path/Dockerfile"
    
    echo ""
    echo -e "${CYAN}ℹ Building: $service_name${NC}"
    echo "  Path: $service_path"
    echo "  Image: $IMAGE"
    
    # Check if Dockerfile exists
    if [ ! -f "$DOCKERFILE" ]; then
        echo -e "${RED}✗ Dockerfile not found at $DOCKERFILE${NC}"
        ((FAIL_COUNT++))
        continue
    fi
    
    # Build the image
    if docker build -t "$IMAGE" -f "$DOCKERFILE" "$service_path" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $service_name built successfully${NC}"
        ((SUCCESS_COUNT++))
    else
        echo -e "${RED}✗ $service_name build failed${NC}"
        ((FAIL_COUNT++))
    fi
done

echo ""
echo "─────────────────────────────────────────────────────────────"
echo -e "${CYAN}Build Summary${NC}"
echo "─────────────────────────────────────────────────────────────"
echo -e "Successful builds: ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "Failed builds: ${RED}$FAIL_COUNT${NC}"

if [ $FAIL_COUNT -gt 0 ]; then
    echo ""
    echo -e "${RED}✗ Some builds failed. Fix errors above and try again.${NC}"
    exit 1
fi

# Push to Docker Hub if requested
if [ "$PUSH_TO_HUB" = "true" ]; then
    echo ""
    echo "─────────────────────────────────────────────────────────────"
    echo -e "${CYAN}Pushing Images to Docker Hub${NC}"
    echo "─────────────────────────────────────────────────────────────"
    
    PUSH_SUCCESS=0
    PUSH_FAIL=0
    
    for service_info in "${SERVICES[@]}"; do
        IFS='|' read -r service_name service_path image_name <<< "$service_info"
        IMAGE="$DOCKER_USERNAME/$image_name:$IMAGE_TAG"
        
        echo ""
        echo -e "${CYAN}ℹ Pushing: $service_name${NC}"
        
        if docker push "$IMAGE" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $IMAGE pushed successfully${NC}"
            ((PUSH_SUCCESS++))
        else
            echo -e "${RED}✗ Failed to push $IMAGE${NC}"
            ((PUSH_FAIL++))
        fi
    done
    
    echo ""
    echo "─────────────────────────────────────────────────────────────"
    echo -e "${CYAN}Push Summary${NC}"
    echo "─────────────────────────────────────────────────────────────"
    echo -e "Successful pushes: ${GREEN}$PUSH_SUCCESS${NC}"
    echo -e "Failed pushes: ${RED}$PUSH_FAIL${NC}"
    
    if [ $PUSH_FAIL -gt 0 ]; then
        echo -e "${RED}✗ Some images failed to push.${NC}"
        exit 1
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo -e "║${GREEN}              ✓ All Operations Completed!                  ${NC}║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next Steps:"
echo "1. Verify images on Docker Hub: https://hub.docker.com/u/$DOCKER_USERNAME"
echo "2. YAML files now use: $DOCKER_USERNAME/gamestore-*:$IMAGE_TAG"
echo "3. YAML files have imagePullPolicy: Always"
echo "4. Push code to GitHub: git push origin main"
echo ""
