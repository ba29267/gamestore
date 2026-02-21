# Kubernetes Deployment Guide - Quick Reference

This directory contains Kubernetes manifests for deploying GameStore to any Kubernetes cluster (local, GKE, EKS, AKS, or self-managed).

## 🐳 Docker Hub Images

Pre-built images available on Docker Hub:

- `bejtulla/gamestore-auth-service:latest`
- `bejtulla/gamestore-game-service:latest`
- `bejtulla/gamestore-orders-service:latest`
- `bejtulla/gamestore-reviews-service:latest`
- `bejtulla/gamestore-frontend:latest`
- `bejtulla/gamestore-api-gateway:latest`

**YAML files automatically pull from Docker Hub** (`imagePullPolicy: Always`). No local Docker build required!

See [Docker Hub Setup Guide](../DOCKER-HUB-SETUP.md) for details on building and pushing custom images.

---

## 📖 Documentation

- [Architecture Overview](ARCHITECTURE.md) - 2-page architecture summary + design patterns
- [Component Diagram](COMPONENT-DIAGRAM.md) - Visual all components & relationships
- [Quick Start - Local Development](#quick-start---local-development)
- [Environment-Specific Deployment](#environment-specific-deployment)
- [Rebuilding After Code Changes](#rebuilding-after-code-changes)
- [Troubleshooting](#troubleshooting)

## Directory Structure

```
kubernetes/
├── base/                          # Base Kubernetes manifests (Kustomize)
│   ├── namespace.yaml            # Gamestore namespace
│   ├── secrets.yaml              # Secrets (JWT, DB credentials)
│   ├── configmap.yaml            # Application configuration
│   ├── postgres.yaml             # PostgreSQL StatefulSet
│   ├── redis.yaml                # Redis deployment
│   ├── solr.yaml                 # Apache Solr deployment
│   ├── auth-service.yaml         # Auth microservice
│   ├── game-service.yaml         # Game microservice
│   ├── orders-service.yaml       # Orders microservice
│   ├── reviews-service.yaml      # Reviews microservice
│   ├── frontend.yaml             # React frontend
│   ├── monitoring.yaml           # Prometheus & Grafana
│   ├── ingress.yaml              # Kubernetes Ingress
│   └── kustomization.yaml        # Kustomize configuration
│
├── overlays/                      # Environment-specific customizations
│   ├── development/              # Dev overrides
│   ├── staging/                  # Staging overrides
│   └── production/               # Prod overrides
│
├── gke-setup.sh                  # Google Cloud GKE setup script
├── build-and-push.sh             # Docker build & push script
├── GOOGLE_CLOUD_DEPLOYMENT.md    # Google Cloud detailed guide
└── README.md                     # This file
```

## Quick Start - Local Development

### 1. Prerequisites

- kubectl 1.20+
- Docker (with Kubernetes enabled) or Minikube
- **6GB+ RAM** (minimum for all containers), 20GB+ disk space
- Node.js 18+, npm

⚠️ **Important**: 4GB RAM will cause frequent container crashes. Minimum 6GB strongly recommended. See [ARCHITECTURE.md - Resource Considerations](ARCHITECTURE.md#resource-considerations-for-local-development-4gb-vs-6gb).

### 2. Local Workflow: Build → Load → Deploy

**Step 1: Build Docker images**

```bash
# Build all service images
docker build -t gamestore-auth-service:latest services/auth-service
docker build -t gamestore-game-service:latest services/game-service
docker build -t gamestore-orders-service:latest services/orders-service
docker build -t gamestore-reviews-service:latest services/reviews-service
docker build -t gamestore-frontend:latest frontend
docker build -t gamestore-api-gateway:latest nginx
```

**Step 2: Load images into Minikube (if using Minikube)**

```bash
# Load each image into minikube
minikube image load gamestore-auth-service:latest
minikube image load gamestore-game-service:latest
minikube image load gamestore-orders-service:latest
minikube image load gamestore-reviews-service:latest
minikube image load gamestore-frontend:latest
minikube image load gamestore-api-gateway:latest
```

**Step 3: Deploy to Kubernetes**

```bash
# Deploy all components at once
kubectl apply -k kubernetes/base

# Verify deployment
kubectl get all -n gamestore

# Watch pod startup (Ctrl+C to exit)
kubectl get pods -n gamestore --watch
```

**Step 4: Port-forward all services**

```powershell
# PowerShell: Forward all services to local ports
$services = @{
    "frontend" = "3000:3000"
    "auth-service" = "3001:3001"
    "game-service" = "3002:3002"
    "orders-service" = "3003:3003"
    "reviews-service" = "3004:3004"
    "api-gateway" = "8080:80"
    "postgres" = "5432:5432"
    "redis" = "6379:6379"
    "prometheus" = "9090:9090"
    "grafana" = "3000:3000"
}

foreach ($service in $services.Keys) {
    $port = $services[$service]
    Write-Host "Port forwarding $service -> $port"
    Start-Job -ScriptBlock {
        kubectl port-forward -n gamestore svc/$svc $port
    } -ArgumentList $service, $port
}

Write-Host "All port forwards started. Run 'Get-Job' to see active jobs."
```

**Step 5: Test the application**

```bash
# Test auth login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gamestore.local","password":"admin"}'

# Access frontend
open http://localhost:3000

# Access Grafana dashboards
open http://localhost:3000  # (after port-forward, use different terminal)

# Access Prometheus metrics
open http://localhost:9090
```

### 3. For Google Cloud (GKE)

**Full automated setup:**

```bash
# Run the GKE setup script
bash kubernetes/gke-setup.sh your-project-id gamestore-cluster us-central1 gamestore-repo

# Build and push images to Artifact Registry
bash kubernetes/build-and-push.sh your-project-id us-central1

# Deploy
kubectl apply -k kubernetes/base
```

See [GOOGLE_CLOUD_DEPLOYMENT.md](GOOGLE_CLOUD_DEPLOYMENT.md) for detailed instructions.

---

## Environment-Specific Deployment

GameStore supports three isolated deployment environments with different resource configurations and capabilities. See [ARCHITECTURE.md](ARCHITECTURE.md#environment-isolation-strategy) for complete details.

### Development Environment (`gamestore-dev`)

**Use this for local development and debugging**

```bash
# Deploy development environment
kubectl apply -k kubernetes/overlays/development

# Get dev namespace
kubectl get all -n gamestore-dev

# View logs
kubectl logs -f deployment/game-service -n gamestore-dev
```

**Characteristics:**

- 1 replica per microservice (minimal memory usage)
- 8Gi total memory quota
- No Horizontal Pod Autoscaler (manual scaling)
- Runs on local images from Docker
- Requires: **6GB+ host RAM**
- Estimated container memory: ~2.5GB
- Best for: Active development, fast iteration, debugging

### Staging Environment (`gamestore-staging`)

**Use this for pre-production testing and release validation**

```bash
# Deploy staging environment
kubectl apply -k kubernetes/overlays/staging

# Get staging namespace
kubectl get all -n gamestore-staging

# Check HPA status
kubectl get hpa -n gamestore-staging
```

**Characteristics:**

- 2-3 replicas per microservice
- 16Gi total memory quota
- Horizontal Pod Autoscaler enabled (scales 1-3 replicas based on CPU/Memory)
- Ingress enabled for external access
- Requires: **12GB+ host RAM**
- Best for: QA testing, performance validation, release candidate testing

### Production Environment (`gamestore-prod`)

**Use this for live traffic and critical applications**

```bash
# Deploy production environment
kubectl apply -k kubernetes/overlays/production

# Check resources
kubectl get all -n gamestore-prod

# Check auto-scaling
kubectl get hpa -n gamestore-prod
kubectl describe hpa game-service-hpa -n gamestore-prod
```

**Characteristics:**

- 4+ replicas per microservice for high availability
- **Unlimited resources** (no hard quota limits)
- Aggressive Horizontal Pod Autoscaler (scales 1-10+ replicas)
- Vertical Pod Autoscaler for performance optimization
- Distributed across multiple nodes
- Requires: **16GB+ RAM per node** (typically 3+ nodes)
- Best for: Production traffic, reliability, scaling

---

## Rebuilding After Code Changes

**Quick rebuild & redeploy workflow:**

```bash
# 1. Rebuild specific service
docker build -t gamestore-game-service:latest services/game-service

# 2. (If using Minikube) Load new image
minikube image load gamestore-game-service:latest

# 3. Restart deployment to pick up new image
kubectl rollout restart deployment/game-service -n gamestore

# 4. Watch rollout
kubectl rollout status deployment/game-service -n gamestore

# 5. Check logs
kubectl logs -f deployment/game-service -n gamestore
```

Or **rebuild all services at once:**

```bash
# Build all
docker build -t gamestore-auth-service:latest services/auth-service && \
docker build -t gamestore-game-service:latest services/game-service && \
docker build -t gamestore-orders-service:latest services/orders-service && \
docker build -t gamestore-reviews-service:latest services/reviews-service && \
docker build -t gamestore-frontend:latest frontend

# Load all into Minikube
minikube image load gamestore-auth-service:latest && \
minikube image load gamestore-game-service:latest && \
minikube image load gamestore-orders-service:latest && \
minikube image load gamestore-reviews-service:latest && \
minikube image load gamestore-frontend:latest

# Restart all deployments
kubectl rollout restart deployment/auth-service -n gamestore && \
kubectl rollout restart deployment/game-service -n gamestore && \
kubectl rollout restart deployment/orders-service -n gamestore && \
kubectl rollout restart deployment/reviews-service -n gamestore && \
kubectl rollout restart deployment/frontend -n gamestore
```

---

## Manifest Overview

### Namespace & Secrets

- **namespace.yaml** - Creates `gamestore` namespace
- **secrets.yaml** - Stores sensitive data (JWT secret, DB password)
- **configmap.yaml** - Application configuration

### Infrastructure

- **postgres.yaml** - PostgreSQL StatefulSet with persistent volume
- **redis.yaml** - Redis deployment for caching
- **solr.yaml** - Apache Solr search engine

### Microservices

Each service deployment includes:

- Pods with rolling updates
- Liveness/readiness probes for health checks
- Resource requests and limits
- Prometheus metrics ports

### Networking

- **Service** manifests for internal communication
- **Ingress** for external access with load balancing
- **HPA** (HorizontalPodAutoscaler) for auto-scaling

### Monitoring

- **Prometheus** - Metrics collection
- **Grafana** - Visualizations and dashboards

---

## Configuration

### Environment Variables

Edit `kubernetes/base/configmap.yaml`:

```yaml
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  DB_HOST: "postgres.gamestore.svc.cluster.local"
  REDIS_HOST: "redis.gamestore.svc.cluster.local"
  SOLR_HOST: "solr.gamestore.svc.cluster.local"
```

### Secrets

Edit `kubernetes/base/secrets.yaml`:

```yaml
stringData:
  JWT_SECRET: "generate-new-secret"
  DB_PASSWORD: "secure-password"
  DB_USER: "gamestore_user"
```

**Generate strong JWT secret:**

```bash
openssl rand -base64 32
```

---

## Deployment Instructions

### Local Kubernetes (Docker Desktop or Minikube)

```bash
# Apply all manifests
kubectl apply -k kubernetes/base

# Verify
kubectl get all -n gamestore

# Port-forward services
kubectl port-forward -n gamestore svc/frontend 8000:3000
kubectl port-forward -n gamestore svc/prometheus 9090:9090
kubectl port-forward -n gamestore svc/grafana 3000:3000

# Access:
# Frontend: http://localhost:8000
# API: http://localhost/api/v1/...
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000
```

### AWS EKS

```bash
# Create EKS cluster
eksctl create cluster --name gamestore --region us-east-1

# Get credentials
aws eks update-kubeconfig --region us-east-1 --name gamestore

# Deploy
kubectl apply -k kubernetes/base

# Create LoadBalancer service for ingress
kubectl patch service frontend -n gamestore -p '{"spec":{"type":"LoadBalancer"}}'
```

### Azure AKS

```bash
# Create AKS cluster
az aks create --resource-group myResourceGroup --name gamestore

# Get credentials
az aks get-credentials --resource-group myResourceGroup --name gamestore

# Deploy
kubectl apply -k kubernetes/base
```

### Google Cloud GKE

See [GOOGLE_CLOUD_DEPLOYMENT.md](GOOGLE_CLOUD_DEPLOYMENT.md)

```bash
# Quick version
bash kubernetes/gke-setup.sh your-project-id
bash kubernetes/build-and-push.sh your-project-id us-central1
kubectl apply -k kubernetes/base
```

---

## Scaling & Updates

### Manual Scaling

```bash
# Scale game-service to 5 replicas
kubectl scale deployment game-service -n gamestore --replicas=5

# Check HPA (auto-scaling)
kubectl get hpa -n gamestore
kubectl describe hpa game-service-hpa -n gamestore
```

### Rolling Updates

```bash
# Update image version
kubectl set image deployment/game-service \
  game-service=gcr.io/PROJECT_ID/gamestore-game-service:v2 \
  -n gamestore

# Watch rollout
kubectl rollout status deployment/game-service -n gamestore

# Rollback if needed
kubectl rollout undo deployment/game-service -n gamestore
```

### Database Migrations

```bash
# Run database initialization
kubectl exec -it postgres-0 -n gamestore -- psql -U gamestore_user -d gamestore_db

# Or use init script
kubectl exec -it postgres-0 -n gamestore -- bash
# Run your migration scripts
```

---

## Monitoring & Debugging

### View Logs

```bash
# Service logs
kubectl logs -f deployment/game-service -n gamestore

# Multiple pods
kubectl logs -f -l app=game-service -n gamestore

# Previous pod logs (if crashed)
kubectl logs --previous deployment/game-service -n gamestore
```

### Describe Resources

```bash
# Deployment status
kubectl describe deployment game-service -n gamestore

# Pod details
kubectl describe pod <pod-name> -n gamestore

# Service endpoints
kubectl get endpoints -n gamestore
```

### Port Forwarding

```bash
# Prometheus
kubectl port-forward -n gamestore svc/prometheus 9090:9090

# Grafana
kubectl port-forward -n gamestore svc/grafana 3000:3000

# PostgreSQL
kubectl port-forward -n gamestore svc/postgres 5432:5432

# Redis
kubectl port-forward -n gamestore svc/redis 6379:6379
```

### Shell Access

```bash
# Execute command in pod
kubectl exec -it <pod-name> -n gamestore -- /bin/bash

# Example: Check if Redis is accessible
kubectl exec -it game-service-xyz -n gamestore -- redis-cli -h redis info
```

---

## Health Checks

```bash
# Check all pod health
kubectl get pods -n gamestore

# Status should be "Running"
# Check conditions with "describe"
kubectl describe pod <pod-name> -n gamestore

# Check readiness
kubectl get pods -n gamestore --no-headers | grep -v Running

# Check events
kubectl get events -n gamestore --sort-by='.lastTimestamp'
```

---

## Cleanup

```bash
# Stop all port-forward jobs (PowerShell)
Get-Job | Stop-Job
Get-Job | Remove-Job

# Delete entire gamestore namespace (all resources)
kubectl delete namespace gamestore

# Delete specific resources
kubectl delete deployment game-service -n gamestore
kubectl delete statefulset postgres -n gamestore

# Delete persistent data
kubectl delete pvc --all -n gamestore
```

---

## Troubleshooting

### Pod Stuck in Pending

```bash
kubectl describe pod <pod-name> -n gamestore
# Check for:
# - Insufficient resources
# - PVC not bound
# - Image pull errors
```

### CrashLoopBackOff

```bash
kubectl logs <pod-name> -n gamestore
# Application crashed - check application logs for errors
```

### ImagePullBackOff

```bash
# Image not found or not accessible
# Check image exists
docker images | grep gamestore

# Check image references in manifests
grep -r "image:" kubernetes/base | grep gamestore

# Verify Artifact Registry/Docker Hub credentials
kubectl get secrets -n gamestore
```

### Database Connection Failed

```bash
# Check if postgres pod is running
kubectl get pod postgres-0 -n gamestore

# Test connection from another pod
kubectl exec -it <pod-name> -n gamestore -- psql -h postgres -U gamestore_user -d gamestore_db
```

### Out of Memory: Containers Crashing / OOMKilled

**Symptoms:**

- Pods crash frequently with `OOMKilled` status
- `kubectl describe pod` shows `MemoryExceeded`
- Services keep restarting

**Causes:**

- Host RAM less than 6GB
- Too many containers running (typical with 4GB RAM)
- Memory leaks in application code
- Insufficient Kubernetes system resources

**Solutions:**

1. **Upgrade your system to 6GB+ RAM** (recommended)

   ```
   Current: 4GB → Target: 6GB-8GB
   Total memory: OS (1.5GB) + Docker (300-500MB) + Containers (2.5GB) = ~5GB
   Buffer needed: 1GB
   ```

2. **Use Docker Compose instead of Kubernetes** (lighter footprint)

   ```bash
   # Docker Compose uses less system overhead than Kubernetes
   docker-compose up -d
   ```

3. **Disable non-essential services** to free memory

   ```bash
   # Edit kubernetes/base/kustomization.yaml and remove:
   # - monitoring.yaml  (saves 450+ MB)

   # Rebuild
   kubectl apply -k kubernetes/overlays/development
   ```

4. **Reduce memory limits and requests**

   ```bash
   # Create kubernetes/overlays/minimal/deployment-patch.yaml
   patches:
     - target:
         kind: Deployment
       patch: |-
         - op: replace
           path: /spec/template/spec/containers/0/resources/requests/memory
           value: "64Mi"
         - op: replace
           path: /spec/template/spec/containers/0/resources/limits/memory
           value: "128Mi"
   ```

5. **Reduce Solr Java heap** (saves 256+ MB)

   ```bash
   # Edit kubernetes/base/solr.yaml
   # Change: -Xmx512m → -Xmx256m
   ```

6. **Run only essential services** (skip Redis, Solr for MVP)
   ```yaml
   # Comment in kustomization.yaml:
   # - redis.yaml
   # - solr.yaml
   # - monitoring.yaml
   ```

**Check actual memory usage:**

```bash
# Using Docker
docker stats --no-stream

# Using Kubernetes
kubectl top nodes
kubectl top pods -n gamestore-dev
```

---

## Custom Overlays

Create environment-specific customizations in `kubernetes/overlays/`:

**overlays/production/kustomization.yaml:**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../../base

replicas:
  - name: game-service
    count: 5
  - name: auth-service
    count: 3

patchesJson6902:
  - target:
      group: apps
      version: v1
      kind: Deployment
      name: game-service
    patch: |-
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/memory
        value: 512Mi
```

Deploy with:

```bash
kubectl apply -k kubernetes/overlays/production
```

---

## Resources & Limits

Current defaults (adjustable):

| Service         | CPU Request | CPU Limit | Memory Request | Memory Limit |
| --------------- | ----------- | --------- | -------------- | ------------ |
| PostgreSQL      | 250m        | 500m      | 256Mi          | 512Mi        |
| Redis           | 100m        | 200m      | 128Mi          | 256Mi        |
| Solr            | 500m        | 1000m     | 512Mi          | 1Gi          |
| Auth Service    | 100m        | 200m      | 128Mi          | 256Mi        |
| Game Service    | 200m        | 500m      | 256Mi          | 512Mi        |
| Orders Service  | 100m        | 200m      | 128Mi          | 256Mi        |
| Reviews Service | 100m        | 200m      | 128Mi          | 256Mi        |
| Frontend        | 100m        | 200m      | 128Mi          | 256Mi        |

Adjust in `kubernetes/base/*.yaml` if needed.

---

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Guide](https://kustomize.io/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

---

**Last Updated:** February 2024
