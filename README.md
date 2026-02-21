# GameStore - Microservices Gaming Platform

A production-ready microservices application demonstrating enterprise architecture patterns with REST/GraphQL APIs, authentication, full-text search, container orchestration, and observability.

**Status**: ✅ Prototype - Docker Compose & Kubernetes Ready

---

## Quick Navigation

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Kubernetes Deployment](#kubernetes-deployment)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Overview

GameStore is a full-featured digital gaming platform built with microservices architecture:

- **4 Microservices**: Auth (JWT), Games (REST/GraphQL), Orders (checkout), Reviews (ratings)
- **Enterprise Features**: Full-text search (Solr), caching (Redis), monitoring (Prometheus/Grafana)
- **Production Ready**: Docker Compose for local development, Kubernetes for scaling
- **Dual Deployment**: Run locally with Docker Compose or deploy to Kubernetes (local/cloud)

---

## Architecture

```
┌─────────────────────────────────────────┐
│      Frontend (React)                   │
│      http://localhost:8000              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    API Gateway (Nginx)                  │
│    http://localhost                     │
├─────┬──────────┬───────────┬────────────┤
│ Auth│  Games   │  Orders   │  Reviews   │
│3001 │ 3002     │  3003     │  3004      │
└─────┴┬─────────┴────┬──────┴────────────┘
       │              │
       └──────┬───────┴─────────────────┐
              │                         │
       ┌──────▼──────┐        ┌─────────▼─────┐
       │ PostgreSQL  │        │ Redis Cache   │
       │ Port: 5432  │        │ Port: 6379    │
       └─────────────┘        └───────────────┘
              │
       ┌──────▼──────────┐
       │ Apache Solr     │
       │ Port: 8983      │
       └─────────────────┘

Monitoring:
┌──────────────────────────────────────┐
│ Prometheus (9090) → Grafana (3005)   │
└──────────────────────────────────────┘
```

**Services:**

| Service    | Port | Purpose                          |
| ---------- | ---- | -------------------------------- |
| Auth       | 3001 | User authentication & JWT tokens |
| Games      | 3002 | Game catalog, search, GraphQL    |
| Orders     | 3003 | Order management, checkout       |
| Reviews    | 3004 | Game reviews & ratings           |
| Nginx      | 80   | API gateway, request routing     |
| Frontend   | 8000 | React web application            |
| PostgreSQL | 5432 | Primary database                 |
| Redis      | 6379 | Cache layer                      |
| Solr       | 8983 | Full-text search                 |
| Prometheus | 9090 | Metrics collection               |
| Grafana    | 3005 | Monitoring dashboards            |

---

## Project Structure

```
gamestore/
├── services/                  # 4 microservices
│   ├── auth-service/         # User authentication
│   ├── game-service/         # Game CRUD, GraphQL, Solr
│   ├── orders-service/       # Order management
│   └── reviews-service/      # Game reviews
│
├── frontend/                 # React web application
├── nginx/                    # API gateway configuration
│
├── docker/                   # Database initialization scripts
│   ├── seed-games.sql
│   ├── seed-games.sh
│   └── solr-init.sh
│
├── kubernetes/               # Kubernetes manifests
│   ├── base/                 # Shared configuration
│   ├── overlays/
│   │   ├── development/      # Dev environment (1 replica, 1 CPU)
│   │   ├── staging/          # Staging (3 replicas, 2 CPU)
│   │   ├── production/       # Prod (3+ replicas, unlimited)
│   │   └── gcp/              # Google Cloud deployment
│   ├── gke-setup.sh          # Automated GKE setup
│   └── build-and-push.sh     # Docker image builder
│
├── grafana/                  # Monitoring dashboards
│
├── docker-compose.yml        # Local development stack
├── prometheus.yml            # Prometheus configuration
├── alerts.yml                # Alert rules
├── setup.sh                  # Initialize project
├── start.sh                  # Start services
└── README.md                 # This file
```

---

## Development Setup

### Docker Compose (Fast Local Development)

**Prerequisites**:

- Docker & Docker Compose
- **6GB+ RAM** (minimum), 10GB disk space
- Node.js 16+, npm 8+

⚠️ **Important**: With 4GB RAM, containers will crash frequently due to memory contention. Minimum 6GB recommended. See [Resource Requirements](#resource-requirements-by-setup) below.

**Start the application**:

```bash
# Clone and enter directory
git clone <repository-url>
cd gamestore

# Start all services in background
docker-compose up -d

# Or start in foreground for logs
docker-compose up
```

**Verify services**:

```bash
# Check all containers running
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Health check
curl http://localhost/health
```

**Access services**:

| Service             | URL                           |
| ------------------- | ----------------------------- |
| Frontend (React UI) | http://localhost:8000         |
| API Gateway         | http://localhost              |
| Swagger Docs        | http://localhost:3002/docs    |
| GraphQL Playground  | http://localhost:3002/graphql |
| Prometheus Metrics  | http://localhost:9090         |
| Grafana Dashboards  | http://localhost:3005         |

**Stop services**:

```bash
# Stop all containers (keep data)
docker-compose down

# Stop and remove all data
docker-compose down -v
```

---

## Resource Requirements by Setup

### System Requirements

| Setup                    | Minimum RAM      | Recommended RAM | CPU Cores | Disk Space |
| ------------------------ | ---------------- | --------------- | --------- | ---------- |
| **Docker Compose**       | 6GB              | 8GB             | 4+        | 10GB       |
| **Kubernetes (Dev)**     | 6GB              | 8GB             | 4+        | 15GB       |
| **Kubernetes (Staging)** | 12GB             | 16GB            | 8+        | 30GB       |
| **Kubernetes (Prod)**    | 16GB+ (per node) | 32GB            | 16+       | 100GB+     |

### Why 6GB Minimum for Docker Compose?

**Memory Breakdown** (~2.5GB container usage):

- PostgreSQL: 256 MB
- Apache Solr: 512 MB (Java heap)
- Redis: 100 MB
- 4 Microservices (Auth, Games, Orders, Reviews): 600 MB total
- Frontend: 100 MB
- Nginx: 64 MB
- Prometheus: 256 MB
- Grafana: 200 MB

**System Overhead** (~2.5GB):

- Docker daemon: 300-500 MB
- Host OS: 1.5-2 GB
- Kubernetes kubelet (if applicable): 300-500 MB

**Total: ~5GB minimum, 6GB recommended for stability**

### If You Have 4GB RAM

Option 1: **Use Docker Compose without monitoring** (saves ~450 MB)

```bash
docker-compose up -d --profile=core
# Disables: prometheus, grafana
```

Option 2: **Use Kubernetes with reduced services**

- Comment out monitoring in `kubernetes/base/kustomization.yaml`
- Reduce Solr heap to 256MB
- Use only 1 replica per service

Option 3: **Upgrade to at least 6GB RAM** (strongly recommended)

---

## Kubernetes Deployment

Deploy to any Kubernetes cluster (local, GKE, EKS, AKS, etc.)

### Prerequisites

- Kubernetes cluster (1.20+)
- kubectl configured
- Docker images built and available
- **6GB+ RAM (Dev)**, 12GB+ (Staging), 16GB+ per node (Prod)

### Local Kubernetes (Minikube / Docker Desktop)

**Enable Kubernetes**:

```bash
# Docker Desktop: Settings → Kubernetes → Enable Kubernetes
# Minikube: minikube start --memory=6000
```

**Build and load Docker images**:

```bash
# Build all service images
docker-compose build

# Load into Minikube (if using Minikube)
minikube image load gamestore-auth-service:latest
minikube image load gamestore-game-service:latest
minikube image load gamestore-orders-service:latest
minikube image load gamestore-reviews-service:latest
minikube image load gamestore-frontend:latest
minikube image load gamestore-api-gateway:latest
```

**Deploy to Kubernetes**:

```bash
# Deploy development environment (recommended for local)
kubectl apply -k kubernetes/overlays/development

# Or deploy staging for higher resources
kubectl apply -k kubernetes/overlays/staging

# Verify deployment
kubectl get all -n gamestore-dev

# Watch pods startup
kubectl get pods -n gamestore-dev --watch
```

### Environment-Specific Deployments

See [kubernetes/ARCHITECTURE.md](kubernetes/ARCHITECTURE.md) for complete environment isolation strategy.

**Development** (Local machine, 6GB RAM):

```bash
kubectl apply -k kubernetes/overlays/development
# 1 replica per service, 8Gi memory quota, no HPA
```

**Staging** (Test environment, 12GB RAM):

```bash
kubectl apply -k kubernetes/overlays/staging
# 2-3 replicas per service, 16Gi memory quota, HPA enabled (1-3)
```

**Production** (Cloud, 16GB+ per node):

```bash
kubectl apply -k kubernetes/overlays/production
# 4+ replicas per service, unlimited resources, HPA (1-10+)
```

---

## Automated Deployment Scripts

One-command deployment to Kubernetes with automatic Docker builds, image loading, and port forwarding.

### Windows (PowerShell)

**Basic deployment**:

```powershell
.\deploy.ps1
```

**Deploy to staging environment**:

```powershell
.\deploy.ps1 -Environment staging
```

**Skip Docker build (use existing images)**:

```powershell
.\deploy.ps1 -SkipBuild
```

**Auto-start port forwards**:

```powershell
.\deploy.ps1 -PortForward
```

**Combine flags**:

```powershell
.\deploy.ps1 -Environment production -PortForward -SkipBuild
```

### Linux/Mac (Bash)

**Basic deployment**:

```bash
chmod +x deploy.sh
./deploy.sh
```

**Deploy to staging environment**:

```bash
./deploy.sh staging
```

**Skip Docker build**:

```bash
SKIP_BUILD=true ./deploy.sh
```

**Auto-start port forwards**:

```bash
PORT_FORWARD=true ./deploy.sh
```

### What the Script Does

1. ✅ Checks prerequisites (Docker, kubectl, minikube)
2. ✅ Starts Minikube if not running
3. ✅ Builds 6 Docker images
4. ✅ Loads images into Minikube
5. ✅ Deploys to Kubernetes
6. ✅ Waits for pods to start
7. ✅ Shows pod status
8. ✅ (Optional) Starts port forwards
9. ✅ Displays access URLs

**Total time**: 3-5 minutes for first run, 1-2 minutes for subsequent runs with `-SkipBuild`

---

## Kubernetes Deployment

Deploy to any Kubernetes cluster (local, GKE, EKS, AKS, etc.)

### Prerequisites

- Kubernetes cluster (1.20+)
- kubectl configured
- Docker images built and available

### Local Kubernetes (Minikube / Docker Desktop)

**Enable Kubernetes**:

```bash
# Docker Desktop: Settings → Kubernetes → Enable Kubernetes
# Minikube: minikube start
```

**Build and load Docker images**:

```bash
# Build all service images
docker-compose build

# Load into Minikube (if using Minikube)
minikube image load gamestore-auth-service:latest
minikube image load gamestore-game-service:latest
minikube image load gamestore-orders-service:latest
minikube image load gamestore-reviews-service:latest
minikube image load gamestore-frontend:latest
minikube image load gamestore-api-gateway:latest
```

**Deploy to Kubernetes**:

```bash
# Deploy to development environment
kubectl apply -k kubernetes/overlays/development

# Or deploy base configuration
kubectl apply -k kubernetes/base
```

**Verify deployment**:

```bash
# Watch pods start
kubectl get pods -n gamestore -w

# Check services
kubectl get svc -n gamestore

# Check resources
kubectl get all -n gamestore
```

**Access services via port-forward**:

```bash
# Frontend (run in separate terminal)
kubectl port-forward -n gamestore svc/frontend 8000:3000

# Game API (run in separate terminal)
kubectl port-forward -n gamestore svc/game-service 3002:3002

# Grafana (run in separate terminal)
kubectl port-forward -n gamestore svc/grafana 3005:3000
```

**Access application**:

- Frontend: http://localhost:8000
- API: http://localhost
- Grafana: http://localhost:3005 (admin/admin)

### Production Deployment - Google Cloud (GKE)

**Create and configure GKE cluster**:

```bash
# Set project
export PROJECT_ID="your-gcp-project-id"

# Run automated setup
bash kubernetes/gke-setup.sh $PROJECT_ID gamestore-cluster us-central1

# This creates:
# - GKE cluster (3-10 nodes with auto-scaling)
# - Cloud SQL (PostgreSQL)
# - Cloud Memorystore (Redis)
# - Cloud Artifact Registry
# - Global Load Balancer with SSL
```

**Build and push images**:

```bash
bash kubernetes/build-and-push.sh $PROJECT_ID us-central1
```

**Deploy application**:

```bash
# Deploy to production environment
kubectl apply -k kubernetes/overlays/production

# Get external IP
kubectl get ingress -n gamestore

# Application available at: http://<EXTERNAL_IP>
```

**Cost**: ~$95/month for small production clusters

### Environment Tiers

**Development** (`kubernetes/overlays/development/`):

- 1 replica per service
- 1 CPU, 2GB memory quota
- HPA disabled
- Manual scaling

**Staging** (`kubernetes/overlays/staging/`):

- 3 replicas per service
- 2 CPU, 4GB memory quota
- HPA enabled (70% CPU, 80% memory triggers)
- Mirrors production topology

**Production** (`kubernetes/overlays/production/`):

- 3-4 replicas per service
- Unlimited resources (pod count limits only)
- HPA enabled with aggressive scaling
- Full monitoring and alerting

### Kubernetes Components

| Component      | Purpose                            |
| -------------- | ---------------------------------- |
| Deployments    | 4 microservices with replicas      |
| StatefulSet    | PostgreSQL with persistent storage |
| Services       | Internal DNS and load balancing    |
| Ingress        | HTTP/HTTPS routing and SSL         |
| ConfigMaps     | Application configuration          |
| Secrets        | Encrypted credentials              |
| HPA            | Auto-scaling based on metrics      |
| VPA            | Vertical resource optimization     |
| ResourceQuotas | Namespace resource limits          |

### Useful Kubernetes Commands

```bash
# Get all resources
kubectl get all -n gamestore

# Describe a pod
kubectl describe pod <pod-name> -n gamestore

# View logs
kubectl logs -f deployment/game-service -n gamestore

# Scale manually
kubectl scale deployment game-service --replicas=5 -n gamestore

# Update image
kubectl set image deployment/game-service game-service=myregistry/game-service:v2 -n gamestore

# Rollback deployment
kubectl rollout undo deployment/game-service -n gamestore

# Delete deployment
kubectl delete -k kubernetes/overlays/development
```

---

## API Endpoints

### Authentication Service (Port 3001)

**Register user**:

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"john","password":"pass123"}'
```

**Login**:

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'
```

### Games Service (Port 3002)

**List games**:

```bash
curl "http://localhost:3002/api/v1/games?limit=10&offset=0"
```

**Search games** (with Solr):

```bash
curl "http://localhost:3002/api/v1/games/search?q=witcher&genre=RPG&priceMin=20&priceMax=60"
```

**Create game** (admin only):

```bash
curl -X POST http://localhost:3002/api/v1/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"Game Name","genre":"RPG","price":49.99,"platform":"PC","rating":8.5}'
```

**GraphQL API**:

```
GET http://localhost:3002/graphql
```

### Orders Service (Port 3003)

**Get user orders**:

```bash
curl http://localhost:3003/api/v1/orders \
  -H "Authorization: Bearer TOKEN"
```

**Create order**:

```bash
curl -X POST http://localhost:3003/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"game_ids":[1,2,3],"quantities":[1,1,2]}'
```

### Reviews Service (Port 3004)

**Get game reviews**:

```bash
curl "http://localhost:3004/api/v1/reviews/game/1?limit=10"
```

**Create review**:

```bash
curl -X POST http://localhost:3004/api/v1/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"game_id":1,"rating":9,"title":"Excellent!","comment":"Great game"}'
```

### API Documentation

- **Swagger Docs**: http://localhost:3002/docs
- **GraphQL Playground**: http://localhost:3002/graphql

---

## Authentication

JWT tokens expire after 24 hours and include:

- User ID, username, email, role
- Algorithm: HS256
- Required for authenticated endpoints

**User roles**:

- `ADMIN`: Full access (create/update/delete games, update orders)
- `USER`: Read games/reviews, create reviews, manage own orders
- `GUEST`: Read-only access (no auth required)

**Get JWT token**:

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourpassword"}'
```

**Use token in requests**:

```bash
curl http://localhost:3002/api/v1/games \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Security features**:

- JWT authentication
- Role-based access control (RBAC)
- Rate limiting (30-100 req/min)
- CORS enabled
- Security headers (X-Frame-Options, CSP, XSS protection)
- Bcrypt password hashing

---

## Monitoring

### Prometheus & Grafana

**Prometheus** collects metrics: http://localhost:9090

Sample queries:

```
rate(http_requests_total[5m])           # Requests per second
avg(http_request_duration_ms)           # Average response time
sum(cache_hits_total) / (sum(cache_hits_total) + sum(cache_misses_total))  # Cache hit ratio
```

**Grafana** visualizes metrics: http://localhost:3005

- Default credentials: `admin` / `admin`
- Includes pre-built GameStore dashboard

**Available metrics**:

- `http_requests_total` - Request count by endpoint/status
- `http_request_duration_ms` - Response time histogram
- `database_connections_active` - Active DB connections
- `cache_hits_total` / `cache_misses_total` - Redis performance
- `api_auth_login_total` - Login attempts
- `api_games_created_total` - Games created
- `api_search_requests_total` - Search requests

**View service logs**:

```bash
docker-compose logs -f [service-name]
kubectl logs -f deployment/[service-name] -n gamestore
```

---

## Troubleshooting

### Docker Compose Issues

**Services not starting**:

```bash
docker-compose ps
docker-compose logs [service-name]
docker-compose restart [service-name]
```

**Port already in use**:

```bash
lsof -i :8000  # Find process using port
docker-compose restart  # Use different port in docker-compose.yml
```

**Database connection errors**:

```bash
docker-compose down -v
docker-compose up -d
# Wait 30 seconds for database to initialize
```

**Cache issues**:

```bash
docker-compose restart redis
docker-compose exec redis redis-cli FLUSHALL
```

### Kubernetes Issues

**Microservices in CrashLoopBackOff (CrashLoop)**:

If services like auth-service, game-service, orders-service, or reviews-service are crashing with "password authentication failed for user 'gamestore_user'":

1. **Check logs**: `kubectl logs auth-service-xxx -n gamestore-dev | tail -5`

2. **Verify database host**: The ConfigMap must point to the correct namespace:

   ```bash
   kubectl get configmap gamestore-config -n gamestore-dev -o yaml | grep DB_HOST
   # Should be: postgres.gamestore-dev.svc.cluster.local
   # NOT: postgres.gamestore.svc.cluster.local
   ```

3. **Fix if needed**:

   ```bash
   kubectl patch configmap gamestore-config -n gamestore-dev \
     -p '{"data":{"DB_HOST":"postgres.gamestore-dev.svc.cluster.local"}}'
   ```

4. **Restart affected services**:

   ```bash
   kubectl rollout restart deployment/auth-service -n gamestore-dev
   kubectl rollout restart deployment/game-service -n gamestore-dev
   kubectl rollout restart deployment/orders-service -n gamestore-dev
   kubectl rollout restart deployment/reviews-service -n gamestore-dev
   ```

5. **Verify services are running**:
   ```bash
   kubectl get pods -n gamestore-dev | grep -E 'auth|game|orders|reviews'
   # All should show "Running" status
   ```

**Pods stuck in pending**:

```bash
kubectl describe pod <pod-name> -n gamestore-dev
kubectl logs <pod-name> -n gamestore-dev
```

**ImagePullBackOff errors**:

- Verify images are built: `docker images | grep gamestore`
- For Minikube: `minikube image load gamestore-service:latest`

**Services not accessible**:

```bash
kubectl port-forward svc/frontend 8000:3000 -n gamestore-dev
curl http://localhost:8000
```

**Delete and redeploy**:

```bash
kubectl delete -k kubernetes/overlays/development
kubectl apply -k kubernetes/overlays/development
```

### API Issues

**Invalid token errors (403)**:

- Token expired: Login again to get new token
- Wrong header: Use `Authorization: Bearer TOKEN`

**CORS errors**:

- Verify frontend is accessing correct API endpoint
- Check Security headers in response

**Slow responses**:

- Check database connections: `SELECT count(*) FROM pg_stat_activity;`
- Monitor Redis: `docker-compose exec redis redis-cli INFO`
- View metrics: http://localhost:9090

**Search not working**:

```bash
# Verify Solr is running
curl http://localhost:8983/solr/admin/ping

# Reinitialize search
docker-compose exec solr solr delete -c games
docker-compose exec solr solr create -c games -s 1
```

### Database Access

```bash
# Docker Compose
docker-compose exec postgres psql -U gamestore_user -d gamestore_db

# Kubernetes (development environment)
kubectl exec -it postgres-0 -n gamestore-dev -- psql -U gamestore_user -d gamestore_db
```

**Common commands**:

```sql
\dt                      # List tables
\d table_name            # Describe table
SELECT * FROM games;     # Query data
UPDATE users SET role='ADMIN' WHERE email='admin@example.com';  # Make admin
```
