# Google Cloud Deployment Guide for GameStore

This guide covers deploying the GameStore microservices application to Google Cloud using Google Kubernetes Engine (GKE).

## Quick Start Checklist

Follow these steps in order for a successful GCP deployment:

1. ✅ **Setup GCP Project** - Enable APIs, create Artifact Registry
2. ✅ **Create GKE Cluster** - Kubernetes cluster with auto-scaling
3. ✅ **Create Cloud SQL** - PostgreSQL 15 database instance
4. ✅ **Create Cloud Redis** - Memorystore for Redis caching
5. ✅ **Build & Push Images** - Docker images to Artifact Registry
6. ✅ **Update Kubernetes Manifests** - Configure image references and secrets
7. ✅ **Deploy to GKE** - Apply Kubernetes resources
8. ✅ **Set Up Networking** - Configure Ingress, DNS, SSL
9. ✅ **Verify Deployment** - Test services and access application

**Estimated time:** 30-45 minutes (depends on GKE cluster creation time)

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start Checklist](#quick-start-checklist)
- [Architecture Overview](#architecture-overview)
- [Step-by-Step Deployment](#step-by-step-deployment)
- [Building & Pushing Docker Images](#building--pushing-docker-images)
- [Configuration & Secrets](#configuration--secrets)
- [Deploying to GKE](#deploying-to-gke)
- [Accessing Your Application](#accessing-your-application)
- [Monitoring & Logging](#monitoring--logging)
- [Cost Optimization](#cost-optimization)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- Google Cloud SDK (gcloud CLI)
- kubectl (Kubernetes CLI)
- Docker
- Git

### Installation Steps

**Install Google Cloud SDK:**

```bash
# Download and install from
https://cloud.google.com/sdk/docs/install

# Initialize gcloud
gcloud init
```

**Install kubectl:**

```bash
gcloud components install kubectl
```

**Verify installations:**

```bash
gcloud --version
kubectl version --client
docker --version
```

### GCP Account Setup

1. Create a Google Cloud project: https://console.cloud.google.com/
2. Enable billing for your project
3. Note your Project ID (used as `PROJECT_ID` throughout)

---

## Architecture Overview

### Google Cloud Resources Used

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Google Kubernetes Engine (GKE)                     │   │
│  │   • 3-10 nodes (auto-scaling)                        │   │
│  │   • Network Load Balancer / Cloud Load Balancer      │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │   Kubernetes Services & Deployments            │  │   │
│  │  │   • Auth Service (2 replicas)                  │  │   │
│  │  │   • Game Service (2-5 replicas with HPA)       │  │   │
│  │  │   • Orders Service (2-4 replicas with HPA)     │  │   │
│  │  │   • Reviews Service (1 replica)                │  │   │
│  │  │   • Frontend (2 replicas)                      │  │   │
│  │  │   • Prometheus + Grafana monitoring            │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Cloud SQL (PostgreSQL 15)                          │   │
│  │   • Automated backups                               │   │
│  │   • High availability (optional)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Cloud Memorystore for Redis                       │   │
│  │   • 1GB-300GB instance                              │   │
│  │   • 99.9% availability                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Cloud Artifact Registry                           │   │
│  │   • Docker image storage                            │   │
│  │   • Access control & scanning                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Cloud Monitoring & Logging                        │   │
│  │   • Prometheus metrics integration                  │   │
│  │   • Cloud Trace integration                         │   │
│  │   • Error reporting                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

External Access:
  • Cloud DNS (custom domain)
  • Google-managed SSL certificates
  • Cloud Armor (DDoS protection)
  • Cloud CDN (content caching)
```

---

## Step-by-Step Deployment

### Overview of Deployment Flow

The deployment follows this sequence:

```
1. Setup GCP Project & APIs
   ↓
2. Create Cloud Resources (GKE, Cloud SQL, Redis)
   ↓
3. Build & Push Docker Images to Artifact Registry
   ↓
4. Configure Kubernetes Manifests (images, secrets, configs)
   ↓
5. Deploy to GKE Cluster
   ↓
6. Configure Networking (Ingress, DNS, SSL)
   ↓
7. Test & Access Application
```

**Complete all steps 1-5 before accessing your application.**

### 1. Set Up Google Cloud Project

```bash
# Set your Project ID
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export CLUSTER_NAME="gamestore-cluster"

# Set as default project
gcloud config set project $PROJECT_ID

# Verify project is set
gcloud config list
```

### 2. Enable Required APIs

```bash
# Enable all required Google Cloud APIs
gcloud services enable \
  container.googleapis.com \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  cloudsql.googleapis.com \
  redis.googleapis.com \
  cloudkms.googleapis.com \
  cloudmonitoring.googleapis.com \
  logging.googleapis.com \
  dns.googleapis.com
```

### 3. Create Artifact Registry Repository

The Artifact Registry stores your Docker images.

```bash
# Create Docker repository
gcloud artifacts repositories create gamestore-repo \
  --repository-format=docker \
  --location=$REGION \
  --description="GameStore Docker Images"

# Configure Docker authentication
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Verify
gcloud artifacts repositories list
```

### 4. Create GKE Cluster

```bash
# Create the cluster (takes 5-10 minutes)
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
  --addons=HttpLoadBalancing,HorizontalPodAutoscaling \
  --workload-pool="${PROJECT_ID}.svc.id.goog" \
  --enable-network-policy

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION

# Verify cluster is running
kubectl cluster-info
kubectl get nodes
```

### 5. Create Cloud SQL PostgreSQL Instance

```bash
# Create the instance
gcloud sql instances create gamestore-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --network=default \
  --storage-auto-increase \
  --backup-start-time=03:00

# Create database
gcloud sql databases create gamestore_db \
  --instance=gamestore-db

# Create user
gcloud sql users create gamestore_user \
  --instance=gamestore-db \
  --password=gamestore_password

# Get public IP (if needed for local testing)
gcloud sql instances describe gamestore-db --format='value(ipAddresses[0].ipAddress)'
```

**Enable Cloud SQL Proxy in GKE:**

```bash
# Cloud SQL Auth Proxy allows secure connections from GKE
# This is automatically configured in the Kubernetes manifests

# Alternative: Direct connection via Cloud SQL Connector
# Update DATABASE_CONNECTION_NAME in secrets.yaml with:
gcloud sql instances describe gamestore-db \
  --format='value(connectionName)'
```

### 6. Create Cloud Memorystore (Redis) Instance

```bash
# Create Redis instance
gcloud redis instances create gamestore-redis \
  --size=1 \
  --region=$REGION \
  --redis-version=7.0 \
  --tier=basic

# Get connection details
gcloud redis instances describe gamestore-redis \
  --region=$REGION \
  --format='value(host,port)'
```

---

## Configuration & Secrets

### 1. Update Image References for GCP Deployment

Before deploying, you need to patch the Kubernetes manifests with your actual Artifact Registry image paths.

**Option A: Using Kustomize Overlays (Recommended)**

Create `kubernetes/overlays/gcp/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: gamestore

bases:
  - ../../base

images:
  - name: gamestore-auth-service:latest
    newName: ${REGION}-docker.pkg.dev/${PROJECT_ID}/gamestore-repo/gamestore-auth-service
    newTag: latest
  - name: gamestore-game-service:latest
    newName: ${REGION}-docker.pkg.dev/${PROJECT_ID}/gamestore-repo/gamestore-game-service
    newTag: latest
  - name: gamestore-orders-service:latest
    newName: ${REGION}-docker.pkg.dev/${PROJECT_ID}/gamestore-repo/gamestore-orders-service
    newTag: latest
  - name: gamestore-reviews-service:latest
    newName: ${REGION}-docker.pkg.dev/${PROJECT_ID}/gamestore-repo/gamestore-reviews-service
    newTag: latest
  - name: gamestore-frontend:latest
    newName: ${REGION}-docker.pkg.dev/${PROJECT_ID}/gamestore-repo/gamestore-frontend
    newTag: latest

# Remove imagePullPolicy: Never (local-only, not for GCP)
patches:
  - target:
      kind: Deployment
      version: v1
    patch: |-
      - op: replace
        path: /spec/template/spec/containers/0/imagePullPolicy
        value: IfNotPresent
```

Then deploy with:

```bash
# Replace actual values
sed -i "s|\${REGION}|${REGION}|g" kubernetes/overlays/gcp/kustomization.yaml
sed -i "s|\${PROJECT_ID}|${PROJECT_ID}|g" kubernetes/overlays/gcp/kustomization.yaml

# Deploy using GCP overlay
kubectl apply -k kubernetes/overlays/gcp
```

**Option B: Manually Edit Manifests**

Edit each service YAML file (e.g., `kubernetes/base/auth-service.yaml`):

```yaml
# Before:
image: gamestore-auth-service:latest
imagePullPolicy: Never

# After:
image: ${REGION}-docker.pkg.dev/${PROJECT_ID}/gamestore-repo/gamestore-auth-service:latest
imagePullPolicy: IfNotPresent
```

Replace in all 5 service manifests:

- `auth-service.yaml`
- `game-service.yaml`
- `orders-service.yaml`
- `reviews-service.yaml`
- `frontend.yaml`

### 2. Update ConfigMap for Cloud SQL & Redis

Edit `kubernetes/base/configmap.yaml` with actual GCP resource endpoints:

```bash
# Get Cloud SQL private IP (if using private GKE)
gcloud sql instances describe gamestore-db \
  --format='value(ipAddresses[0].ipAddress)' \
  --filter='type:PRIVATE'

# Get Redis internal IP
gcloud redis instances describe gamestore-redis \
  --region=$REGION \
  --format='value(host)'
```

Update `configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gamestore-config
  namespace: gamestore
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  DB_HOST: "10.x.x.x" # Cloud SQL private IP
  DB_PORT: "5432"
  DB_NAME: "gamestore_db"
  REDIS_HOST: "10.x.x.x" # Redis private IP
  REDIS_PORT: "6379"
  SOLR_HOST: "solr.gamestore.svc.cluster.local" # Internal K8s hostname
```

### 3. Update Secrets for Database & JWT

Edit `kubernetes/base/secrets.yaml`:

```bash
# Generate new JWT secret
openssl rand -base64 32  # Save this value

# Use the Cloud SQL password you set earlier
```

Update manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gamestore-secrets
  namespace: gamestore
type: Opaque
stringData:
  JWT_SECRET: "your-generated-jwt-secret-here"
  DB_USER: "gamestore_user"
  DB_PASSWORD: "your-cloud-sql-password"
```

### 4. Create Docker Registry Pull Secret (if needed)

For private Artifact Registry:

```bash
# Get credentials
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Create secret from Docker config
kubectl create secret generic docker-registry \
  --from-file=.dockerconfigjson=$HOME/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson \
  -n gamestore

# Verify
kubectl get secret docker-registry -n gamestore
```

---

## Building & Pushing Docker Images

### Prerequisites for This Step

Before building images, ensure:

1. ✅ Docker is installed and running
2. ✅ You've authenticated with Artifact Registry: `gcloud auth configure-docker ${REGION}-docker.pkg.dev`
3. ✅ Project ID and Region are set: `export PROJECT_ID="..."; export REGION="..."`

### Build All Services

```bash
# Set variables
export IMAGE_REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/gamestore-repo"

# Build and push Auth Service
cd services/auth-service
docker build -t ${IMAGE_REPO}/gamestore-auth-service:latest .
docker push ${IMAGE_REPO}/gamestore-auth-service:latest
cd ../..

# Build and push Game Service
cd services/game-service
docker build -t ${IMAGE_REPO}/gamestore-game-service:latest .
docker push ${IMAGE_REPO}/gamestore-game-service:latest
cd ../..

# Build and push Orders Service
cd services/orders-service
docker build -t ${IMAGE_REPO}/gamestore-orders-service:latest .
docker push ${IMAGE_REPO}/gamestore-orders-service:latest
cd ../..

# Build and push Reviews Service
cd services/reviews-service
docker build -t ${IMAGE_REPO}/gamestore-reviews-service:latest .
docker push ${IMAGE_REPO}/gamestore-reviews-service:latest
cd ../..

# Build and push Frontend
cd frontend
docker build -t ${IMAGE_REPO}/gamestore-frontend:latest .
docker push ${IMAGE_REPO}/gamestore-frontend:latest
cd ..

# Verify images in registry
gcloud artifacts docker images list ${IMAGE_REPO}
```

### Using Build Script (Automated)

Alternatively, use the provided build script for all services at once:

```bash
# From project root
bash kubernetes/build-and-push.sh $PROJECT_ID $REGION

# This will:
# 1. Build all 5 services
# 2. Tag with both 'latest' and specified tag
# 3. Push to Artifact Registry
# 4. Show progress for each service
```

### Verify Images Were Pushed

```bash
# List all images in your repository
gcloud artifacts docker images list ${REGION}-docker.pkg.dev/${PROJECT_ID}/gamestore-repo

# Show details of a specific image
gcloud artifacts docker images describe \
  ${REGION}-docker.pkg.dev/${PROJECT_ID}/gamestore-repo/gamestore-auth-service:latest
```

---

## Deploying to GKE

### 1. Create Kubernetes Namespace

```bash
kubectl create namespace gamestore
kubectl label namespace gamestore name=gamestore
```

### 2. Create Secrets & ConfigMaps

```bash
# Create from updated manifests (after Step 2-3 above)
kubectl apply -f kubernetes/base/secrets.yaml
kubectl apply -f kubernetes/base/configmap.yaml

# Verify
kubectl get secrets -n gamestore
kubectl get configmap -n gamestore
```

### 3. Deploy All Services Using GCP Overlay

**After configuring images (Step 1 above):**

```bash
# Deploy using the GCP overlay with proper image references
kubectl apply -k kubernetes/overlays/gcp

# Or if using manual manifest edits, deploy from base:
kubectl apply -k kubernetes/base

# Verify deployments started
kubectl get deployments -n gamestore
kubectl get pods -n gamestore
```

### 4. Monitor Deployment Progress

```bash
# Watch pod startup (takes 2-5 minutes for all pods to be ready)
kubectl get pods -n gamestore --watch

# Check for startup errors
kubectl describe pod <pod-name> -n gamestore

# View application logs
kubectl logs -f deployment/auth-service -n gamestore

# Wait for all pods ready
kubectl wait --for=condition=ready pod --all -n gamestore --timeout=300s
```

### 5. Verify Services are Running

```bash
# Check all services
kubectl get services -n gamestore

# Test a service health check (port-forward first if needed)
kubectl exec -it deployment/auth-service -n gamestore -- \
  curl -s http://localhost:3001/health

# Check auto-scaling is working
kubectl get hpa -n gamestore
kubectl top nodes  # GKE autoscaling metrics
```

### 6. Default Admin User Setup

The auth service automatically creates a default admin user on startup:

**Default Admin Credentials:**

- Email: `admin@gamestore.local`
- Password: `admin` (can be customized via `ADMIN_PASSWORD` environment variable)

To change the default password, update the auth service ConfigMap:

```yaml
# Add to kubernetes/base/configmap.yaml
ADMIN_PASSWORD: "your-secure-password"
```

Then restart the auth service:

```bash
kubectl rollout restart deployment/auth-service -n gamestore
```

---

## Accessing Your Application

### 1. Set Up Static IP and Domain

```bash
# Reserve static external IP
gcloud compute addresses create gamestore-ip \
  --global \
  --ip-version IPV4

# Get the IP address
gcloud compute addresses describe gamestore-ip --global --format='value(address)'

# Update your domain DNS records to point to this IP
# Add A record: yourdomain.com → <static-ip>
# Add A record: api.yourdomain.com → <static-ip>
# Add A record: www.yourdomain.com → <static-ip>
```

### 2. Set Up SSL/TLS Certificate

```bash
# Create managed SSL certificate (takes a few minutes to provision)
gcloud compute ssl-certificates create gamestore-cert \
  --domains=yourdomain.com,www.yourdomain.com,api.yourdomain.com

# Verify certificate
gcloud compute ssl-certificates describe gamestore-cert
```

### 3. Update Ingress Configuration

Edit `kubernetes/base/ingress.yaml`:

```yaml
spec:
  rules:
    - host: "api.yourdomain.com"
      http:
        paths:
        # ... update paths
    - host: "www.yourdomain.com"
      http:
        paths:
        # ... update paths
```

### 4. Verify Ingress

```bash
# Get ingress details
kubectl get ingress -n gamestore

# Check ingress events
kubectl describe ingress gamestore-ingress -n gamestore

# Wait for external IP (can take 5-10 minutes)
kubectl get ingress gamestore-ingress -n gamestore --watch
```

### 5. Test API Access

```bash
# Test health endpoint
curl https://api.yourdomain.com/health

# Test authentication
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Test frontend
curl https://www.yourdomain.com
```

---

## Monitoring & Logging

### 1. Access Prometheus

```bash
# Port-forward to access locally
kubectl port-forward -n gamestore svc/prometheus 9090:9090

# Access at http://localhost:9090
# Test query: rate(http_requests_total[5m])
```

### 2. Access Grafana

```bash
# Port-forward to Grafana
kubectl port-forward -n gamestore svc/grafana 3000:3000

# Access at http://localhost:3000
# Default credentials: admin / admin
```

### 3. Cloud Logging Integration

```bash
# View logs in Cloud Logging
gcloud logging read "resource.type=k8s_container AND resource.labels.namespace_name=gamestore" \
  --limit=100 \
  --format=json

# Or view in Cloud Console:
# https://console.cloud.google.com/logs
```

### 4. Set Up Alerts

```bash
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=<CHANNEL_ID> \
  --display-name="High Error Rate Alert" \
  --condition-display-name="Error rate > 1%" \
  --condition-threshold-value=1 \
  --condition-threshold-duration=300s
```

---

## Cost Optimization

### 1. Reduce Compute Resources

```bash
# Edit node pool to use cheaper machines
gcloud container node-pools update default-pool \
  --cluster=$CLUSTER_NAME \
  --region=$REGION \
  --machine-type=e2-standard-2

# Use Compute Engine managed disks (smaller size)
```

### 2. Use Preemptible Nodes

```bash
# Create node pool with preemptible nodes (75% cheaper, but can be terminated)
gcloud container node-pools create preemptible-pool \
  --cluster=$CLUSTER_NAME \
  --region=$REGION \
  --preemptible \
  --num-nodes=2 \
  --machine-type=e2-standard-2
```

### 3. Database Cost Optimization

```bash
# Use shared-core tier for development
# Use zonal (not regional) instances for non-critical data

gcloud sql instances patch gamestore-db \
  --tier=db-f1-micro \
  --maintenance-window-day=SAT \
  --maintenance-window-hour=03 \
  --maintenance-window-duration=4
```

### 4. Redis Cost Optimization

```bash
# Use smaller instance size
# Use shared-tier for development
gcloud redis instances patch gamestore-redis \
  --size=1 \
  --tier=basic
```

### Monitor Costs

```bash
# View GKE costs
gcloud billing budgets create \
  --billing-account=<BILLING_ACCOUNT_ID> \
  --display-name="GameStore Budget" \
  --budget-amount=100 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=100
```

---

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl get pods -n gamestore

# Describe pod for events
kubectl describe pod <pod-name> -n gamestore

# Check logs
kubectl logs <pod-name> -n gamestore

# Common issues:
# - Image not found: verify image in Artifact Registry
# - ImagePullBackOff: check service account permissions
# - CrashLoopBackOff: check logs for application errors
```

### Database Connection Issues

```bash
# Verify Cloud SQL instance is running
gcloud sql instances describe gamestore-db

# Check firewall rules
gcloud compute firewall-rules list --filter="network:default"

# Test connection from pod
kubectl exec -it <pod-name> -n gamestore -- psql -h postgres.gamestore.svc.cluster.local -U gamestore_user -d gamestore_db

# View Cloud SQL Proxy logs
kubectl logs -n gamestore -f deployment/cloud-sql-proxy
```

### Redis Connection Issues

```bash
# Verify Redis instance
gcloud redis instances describe gamestore-redis --region=$REGION

# Test connection from pod
kubectl exec -it <pod-name> -n gamestore -- redis-cli -h redis.gamestore.svc.cluster.local -p 6379 ping

# Check Memorystore authorized networks
gcloud redis instances describe gamestore-redis --region=$REGION --format='value(authorizedNetwork)'
```

### Ingress Not Routing Traffic

```bash
# Check ingress status
kubectl get ingress -n gamestore
kubectl describe ingress gamestore-ingress -n gamestore

# Check service endpoints
kubectl get endpoints -n gamestore

# Check backend service health
gcloud compute backend-services list
gcloud compute backend-services get-health gamestore-backend-service --global

# Verify DNS propagation
nslookup api.yourdomain.com
```

### High Memory/CPU Usage

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n gamestore

# Check HPA status
kubectl get hpa -n gamestore
kubectl describe hpa auth-service-hpa -n gamestore

# Increase limits if needed
kubectl set resources deployment game-service -n gamestore \
  --limits=cpu=1000m,memory=512Mi \
  --requests=cpu=500m,memory=256Mi
```

### Scaling Issues

```bash
# Manually scale deployment
kubectl scale deployment game-service -n gamestore --replicas=5

# View HPA metrics
kubectl get hpa -n gamestore --watch

# Adjust HPA thresholds
kubectl patch hpa game-service-hpa -n gamestore --patch='{"spec":{"maxReplicas":10}}'
```

---

## Cleanup & Deletion

### Full Environment Cleanup

```bash
# Delete all Kubernetes resources
kubectl delete namespace gamestore

# Delete GKE cluster
gcloud container clusters delete $CLUSTER_NAME --region=$REGION

# Delete Cloud SQL instance
gcloud sql instances delete gamestore-db

# Delete Cloud Memorystore instance
gcloud redis instances delete gamestore-redis --region=$REGION

# Delete Cloud Artifact Repository
gcloud artifacts repositories delete gamestore-repo --location=$REGION

# Delete static IP
gcloud compute addresses delete gamestore-ip --global

# Delete SSL certificate
gcloud compute ssl-certificates delete gamestore-cert
```

---

## Additional Resources

- [Google Cloud Documentation](https://cloud.google.com/docs)
- [GKE Best Practices](https://cloud.google.com/kubernetes-engine/docs/best-practices)
- [Cloud SQL Best Practices](https://cloud.google.com/sql/docs/postgres/best-practices)
- [Cloud Memorystore Documentation](https://cloud.google.com/memorystore/docs/redis)
- [Kubernetes Official Documentation](https://kubernetes.io/docs/)

---

**Last Updated:** February 2024
