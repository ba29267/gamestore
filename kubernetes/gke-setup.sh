#!/bin/bash

# GameStore GKE Deployment Script
# This script sets up a complete GKE cluster with all required resources

set -e

# Configuration
PROJECT_ID=${1:-your-gcp-project-id}
CLUSTER_NAME=${2:-gamestore-cluster}
REGION=${3:-us-central1}
ZONE="${REGION}-a"
ARTIFACT_REPO=${4:-gamestore-repo}

echo "=========================================="
echo "GameStore GKE Deployment"
echo "=========================================="
echo "Project ID: $PROJECT_ID"
echo "Cluster Name: $CLUSTER_NAME"
echo "Region: $REGION"
echo "Artifact Repository: $ARTIFACT_REPO"
echo "=========================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "ERROR: gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Set the project
echo "[1/10] Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "[2/10] Enabling required APIs..."
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudsql.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable cloudkms.googleapis.com

# Create Artifact Registry repository
echo "[3/10] Creating Artifact Registry repository..."
gcloud artifacts repositories create $ARTIFACT_REPO \
    --repository-format=docker \
    --location=$REGION \
    --description="GameStore Docker Images" || echo "Repository already exists"

# Configure Docker authentication
echo "[4/10] Configuring Docker authentication..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev"

# Create GKE cluster
echo "[5/10] Creating GKE cluster (this may take several minutes)..."
gcloud container clusters create $CLUSTER_NAME \
    --region=$REGION \
    --num-nodes=3 \
    --machine-type=n1-standard-2 \
    --enable-autoscaling \
    --min-nodes=3 \
    --max-nodes=10 \
    --enable-autorepair \
    --enable-autoupgrade \
    --enable-stackdriver-kubernetes \
    --enable-ip-alias \
    --network="default" \
    --addons=HttpLoadBalancing,HorizontalPodAutoscaling \
    --workload-pool="${PROJECT_ID}.svc.id.goog" \
    --enable-shielded-nodes \
    --enable-network-policy \
    --cluster-version=latest \
    --logging=SYSTEM_COMPONENTS,WORKLOADS \
    --monitoring=SYSTEM_COMPONENTS,WORKLOADS || echo "Cluster already exists"

# Get cluster credentials
echo "[6/10] Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION

# Create Cloud SQL instance
echo "[7/10] Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create gamestore-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --network=default \
    --allocate-ip-range \
    --storage-auto-increase \
    --backup-start-time=03:00 \
    --enable-bin-log=false || echo "Database instance already exists"

# Create Cloud SQL database
echo "[8/10] Creating database..."
gcloud sql databases create gamestore_db \
    --instance=gamestore-db || echo "Database already exists"

# Create Cloud SQL user
echo "[9/10] Creating database user..."
gcloud sql users create gamestore_user \
    --instance=gamestore-db \
    --password=gamestore_password || echo "User already exists"

# Create Cloud Memorystore (Redis) instance
echo "[10/10] Creating Cloud Memorystore (Redis) instance..."
gcloud redis instances create gamestore-redis \
    --size=1 \
    --region=$REGION \
    --redis-version=7.0 \
    --tier=basic || echo "Redis instance already exists"

echo ""
echo "=========================================="
echo "GKE Cluster Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update PROJECT_ID in kubernetes/base/kustomization.yaml"
echo "2. Update image references in deployments (replace gcr.io/PROJECT_ID/)"
echo "3. Build and push Docker images:"
echo "   cd services/auth-service && docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/gamestore-repo/gamestore-auth-service:latest ."
echo "   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/gamestore-repo/gamestore-auth-service:latest"
echo "4. Also push game-service, orders-service, reviews-service, and frontend"
echo "5. Deploy to GKE:"
echo "   kubectl apply -k kubernetes/base"
echo ""
echo "Useful commands:"
echo "  kubectl get pods -n gamestore"
echo "  kubectl logs -n gamestore -f deployment/game-service"
echo "  kubectl port-forward -n gamestore svc/prometheus 9090:9090"
echo "  kubectl port-forward -n gamestore svc/grafana 3000:3000"
echo ""
