# GameStore Microservices Architecture

## Executive Summary

GameStore is a production-ready, cloud-native microservices platform demonstrating enterprise architecture patterns. The system is designed for scalability, observability, and environment flexibility across development, staging, and production deployments.

**Key Characteristics:**

- **Microservices Pattern**: 4 independent services with separate databases (database-per-service)
- **Container Orchestration**: Kubernetes with Kustomize for environment customization
- **Scalability**: Horizontal Pod Autoscaler (HPA) for dynamic scaling based on CPU/memory metrics
- **Observability**: Prometheus metrics + Grafana dashboards + structured logging
- **Data Persistence**: PostgreSQL (primary), Redis (cache), Apache Solr (search)
- **API Gateway**: Nginx reverse proxy with request routing and load balancing

---

## System Architecture Overview

### High-Level Data Flow

```
Internet Request
    ↓
[Ingress Controller] / [Load Balancer]
    ↓
[API Gateway - Nginx]
    ↓
┌───────────────────────────────────────────────────────┐
│ Kubernetes Service Mesh (gamestore namespace)         │
├───────────────────────────────────────────────────────┤
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Microservices (Deployments)                     │  │
│ │ ├─ Auth Service (JWT/OAuth)                     │  │
│ │ ├─ Game Service (CRUD, GraphQL, Search)         │  │
│ │ ├─ Orders Service (Checkout, Payments)          │  │
│ │ └─ Reviews Service (Ratings, Comments)          │  │
│ └─────────────────────────────────────────────────┘  │
│              ↓             ↓            ↓             │
│ ┌─────────────────┐ ┌──────────┐ ┌────────────────┐  │
│ │ PostgreSQL      │ │  Redis   │ │  Apache Solr   │  │
│ │ (StatefulSet)   │ │(Cached)  │ │  (Full-text)   │  │
│ │ - Primary DB    │ │ - Session│ │  - Game Index  │  │
│ │ - Persistent    │ │ - Counters   │  Search    │  │
│ └─────────────────┘ └──────────┘ └────────────────┘  │
│                                                       │
└───────────────────────────────────────────────────────┘
    ↓
[Frontend React App - 3000]
```

---

## Microservices Breakdown

### 1. Auth Service (Port 3001)

**Responsibility**: User authentication and authorization

**Key Components:**

- JWT token generation and validation
- User credential management
- Role-based access control (RBAC)
- Login/logout operations

**Database**: PostgreSQL (shared, `users` table)
**External Dependencies**: None
**Scaling**: HPA triggers on CPU (50%) and Memory (70%)
**Replica Configuration:**

- Development: 1 replica
- Staging: 2 replicas
- Production: 4 replicas

### 2. Game Service (Port 3002)

**Responsibility**: Game catalog and search functionality

**Key Components:**

- Game CRUD operations (Create, Read, Update, Delete)
- GraphQL API for flexible queries
- Full-text search integration (Apache Solr)
- Game filtering and sorting
- API rate limiting

**Database**: PostgreSQL (shared, `games` table)
**Cache**: Redis (game listings, popular games)
**Search**: Apache Solr (full-text index on game titles and descriptions)
**Scaling**: HPA on CPU metrics
**Default Behavior**: Reads from cache when available, updates search index asynchronously

### 3. Orders Service (Port 3003)

**Responsibility**: Order management and checkout

**Key Components:**

- Order creation and status tracking
- Inventory management
- Payment processing integration hooks
- Order history and analytics
- Cart management

**Database**: PostgreSQL (shared, `orders` table)
**Cache**: Redis (shopping carts, order state)
**External**: Payment gateway integration points
**Scaling**: HPA monitors CPU/Memory

### 4. Reviews Service (Port 3004)

**Responsibility**: Game reviews and ratings

**Key Components:**

- User review submission and moderation
- Rating aggregation
- Review filtering (helpful/unhelpful votes)
- Comment threading

**Database**: PostgreSQL (shared, `reviews` table)
**Cache**: Redis (review counts, ratings cache)
**Scaling**: HPA triggers on resource usage

---

## Infrastructure Components

### Data Storage

#### PostgreSQL (StatefulSet)

- **Type**: StatefulSet (ensures persistent identity)
- **Replicas**: 1 (single-node in dev, can scale with replication in prod)
- **Storage**: PersistentVolume (50Gi quota per environment)
- **Access**: Service DNS `postgres.gamestore.svc.cluster.local:5432`
- **Backup**: Manual snapshots recommended for prod
- **Database Schema**: Single database `gamestore_db` with 4 schemas (one per service)

#### Redis Cache (Deployment)

- **Type**: Deployment (stateless, can be replicated)
- **Replicas**: 1 (can scale for high-availability)
- **Storage**: In-memory with optional persistence
- **Access**: Service DNS `redis.gamestore.svc.cluster.local:6379`
- **TTL**: Configurable per service (typically 1 hour)
- **Use Cases**:
  - Session storage (Auth service)
  - Game listing cache (Game service)
  - Cart state (Orders service)
  - Review ratings aggregate (Reviews service)

#### Apache Solr (Deployment)

- **Type**: Deployment (single node in dev, cloud mode in prod)
- **Replicas**: 1 (can scale with SolrCloud for HA)
- **Storage**: PersistentVolume for index data
- **Access**: Service DNS `solr.gamestore.svc.cluster.local:8983`
- **Index Core**: `games` collection
- **Indexed Fields**: game_id, title, description, tags, price, rating

### Monitoring & Observability

#### Prometheus (StatefulSet)

- **Scrape Interval**: 30 seconds
- **Targets**: All service metrics ports (9090)
- **Retention**: 30 days (configurable)
- **Alerts**: Defined in `alerts.yml`

#### Grafana (Deployment)

- **Dashboards**: Pre-configured for microservices metrics
- **Data Source**: Prometheus
- **Alerts**: Alert notifications to Slack/email (configurable)
- **Access**: `http://grafana.gamestore.svc.cluster.local:3000`

### Networking

#### Services (Internal)

Each microservice has a Kubernetes Service for DNS-based discovery:

- `auth-service.gamestore.svc.cluster.local:3001`
- `game-service.gamestore.svc.cluster.local:3002`
- `orders-service.gamestore.svc.cluster.local:3003`
- `reviews-service.gamestore.svc.cluster.local:3004`

#### Ingress Controller

- Routes external traffic to Nginx
- SSL/TLS termination
- Path-based routing (`/api/auth`, `/api/games`, etc.)

#### API Gateway (Nginx)

- Load balancing across service replicas
- Request/response modification
- Rate limiting
- Compression

---

## Design Patterns

### 1. **Database-Per-Service Pattern**

Each microservice is isolated with logical database boundaries:

- Separate schemas within PostgreSQL
- No cross-service database access
- Loose coupling, independent scaling

### 2. **Circuit Breaker Pattern**

Services implement retry logic with exponential backoff:

- Prevents cascading failures
- Graceful degradation on service unavailability
- Timeout configurations per service

### 3. **API Gateway Pattern**

Nginx provides:

- Single entry point for clients
- Service discovery abstraction (clients don't know internal IPs)
- Cross-cutting concerns (auth headers, logging)

### 4. **Sidecar Pattern**

Prometheus sidecar on each service:

- Metrics collection without modifying application code
- Independent lifecycle and updates

### 5. **Configuration Pattern**

Kubernetes ConfigMap + Secrets:

- Environment-specific configs in Kustomize overlays
- Secrets encryption at rest
- No hardcoded credentials

---

## Environment Isolation Strategy

### Development Environment (gamestore-dev)

**Purpose**: Fast iteration, local debugging, experimental features

**Resource Limits**:

- Total CPU quota: 4 cores
- Total Memory quota: 8Gi
- **Minimum Host RAM: 6GB** (containers + Docker daemon + OS overhead)

**Service Configuration**:

- 1 replica per microservice (reduces memory footprint)
- `imagePullPolicy: IfNotPresent` (uses local images, faster startup)
- No HPA (manual scaling only)
- No VPA (Vertical Pod Autoscaler)
- Lower resource requests/limits per pod

**Database**:

- Single PostgreSQL instance
- No replication
- Weekly backups sufficient

**Monitoring**:

- Prometheus enabled with 7-day retention
- Grafana dashboards available
- Reduced scrape intervals acceptable

**Network**:

- Port-forwarding for local access
- No external Ingress (localhost only)
- mDNS service discovery

### Staging Environment (gamestore-staging)

**Purpose**: Pre-production testing, performance validation, release candidate testing

**Resource Limits**:

- Total CPU quota: 8 cores
- Total Memory quota: 16Gi
- Minimum Host RAM: 12GB

**Service Configuration**:

- 2-3 replicas per microservice
- `imagePullPolicy: IfNotPresent`
- HPA configured (scales 1-3 replicas based on CPU)
- VPA enabled for recommendations
- Moderate resource requests/limits

**Database**:

- PostgreSQL with read replicas (optional)
- Automated daily backups
- Connection pooling enabled

**Monitoring**:

- Prometheus with 14-day retention
- Active alerting
- Log aggregation

**Network**:

- Ingress controller enabled
- TLS certificates (self-signed or Let's Encrypt staging)
- External access for QA team

### Production Environment (gamestore-prod)

**Purpose**: Live traffic, maximum reliability, performance

**Resource Limits**:

- Total CPU quota: Unlimited (auto-scales)
- Total Memory quota: Unlimited
- Minimum Host RAM: 16GB+ (distributed across multiple nodes)

**Service Configuration**:

- 4+ replicas per microservice
- `imagePullPolicy: IfNotPresent` or pull from registry
- HPA aggressive (scales 1-10+ replicas)
- VPA enabled for continuous optimization
- High resource requests/limits for guaranteed performance

**Database**:

- PostgreSQL with primary-replica replication
- Multi-zone deployment
- Real-time backups (PITR - Point-in-Time Recovery)
- Connection pooling with pgBouncer

**Monitoring**:

- Prometheus with 90-day retention
- Real-time alerting (PagerDuty, Slack)
- Log aggregation (ELK/Loki stack)
- APM (Application Performance Monitoring)

**Network**:

- Ingress controller with WAF (Web Application Firewall)
- TLS 1.3 required
- DDoS protection
- Rate limiting per user/IP

---

## Deployment Flow

### Initial Deployment

```
1. Create namespace (gamestore-dev/staging/prod)
2. Apply secrets (JWT, DB credentials)
3. Apply ConfigMap (application config)
4. Deploy PostgreSQL (StatefulSet) - wait for ready
5. Deploy Redis (Deployment)
6. Deploy Apache Solr (Deployment) - wait for health
7. Deploy Auth Service (Deployment)
8. Deploy Game Service (Deployment)
9. Deploy Orders Service (Deployment)
10. Deploy Reviews Service (Deployment)
11. Deploy Nginx API Gateway (Deployment)
12. Deploy Frontend (Deployment)
13. Deploy Prometheus & Grafana (Deployments)
14. Apply Ingress rules
15. Apply HPA (staging/prod only)
```

### Rolling Update

When code changes occur:

1. New image is built and pushed to registry
2. Deployment image reference is updated
3. Kubernetes creates new pods with new image
4. old pods terminate after liveness check passes on new ones
5. Service traffic gradually shifts to new pods
6. Old pods are fully removed (default: 30 second grace period)

---

## Summary Table: Key Differences by Environment

| Aspect           | Development   | Staging           | Production            |
| ---------------- | ------------- | ----------------- | --------------------- |
| **Namespace**    | gamestore-dev | gamestore-staging | gamestore-prod        |
| **Replicas**     | 1             | 2-3               | 4+                    |
| **HPA**          | No            | Yes (1-3)         | Yes (1-10+)           |
| **Memory/CPU**   | Limited       | Medium            | Unlimited             |
| **Database**     | Single        | Primary + Replica | Multi-zone HA         |
| **Backups**      | Manual        | Daily             | Real-time PITR        |
| **Monitoring**   | 7 days        | 14 days           | 90 days               |
| **TLS**          | Self-signed   | Self-signed       | Production CA         |
| **Auto-scaling** | No            | Based on metrics  | Aggressive auto-scale |
| **Min Host RAM** | 6GB           | 12GB              | 16GB+                 |

---

## Resource Considerations for Local Development (4GB vs 6GB)

### Why 6GB Minimum?

**Container Memory Usage (approximate)**:

- PostgreSQL: 256 MB
- Redis: 100 MB
- Solr: 512 MB (Java heap)
- Auth Service: 150 MB
- Game Service: 150 MB
- Orders Service: 150 MB
- Reviews Service: 150 MB
- Frontend: 100 MB
- Nginx: 64 MB
- Prometheus: 256 MB
- Grafana: 200 MB

**Total: ~2.5 GB (containers)**

**System Overhead**:

- Docker daemon: 300-500 MB
- Host OS (Windows/Mac): 1.5-2 GB
- Kubernetes system pods (kubelet, etc.): 300-500 MB

**Total System: ~2.5 GB**

**Combined: ~5.0 GB**

**Recommendation: 6GB minimum** (provides 1GB buffer for spikes)

### Optimization for 4GB Systems (Not Recommended but Possible)

If you must run on 4GB:

1. **Disable Prometheus/Grafana** (-456 MB)
2. **Reduce Solr heap** (-200 MB)
3. **Single replica for all services** (already done)
4. **Use `docker-compose` instead of Kubernetes** (much lighter footprint)

See [Limited Hardware Section](#running-on-limited-hardware) for details.

---

## Running on Limited Hardware

If you're constrained to 4GB RAM on local development:

### Option 1: Use Docker Compose (Lightweight, ~2GB)

```bash
docker-compose up -d
# Skip monitoring for now
docker stop gamestore-prometheus gamestore-grafana
```

### Option 2: Kubernetes with Reduced Services

Edit `kubernetes/base/kustomization.yaml` and comment out non-essential resources:

```yaml
resources:
  # - monitoring.yaml  # Skip Prometheus/Grafana
  - namespace.yaml
  - secrets.yaml
  - configmap.yaml
  - postgres.yaml
  - redis.yaml
  - solr.yaml
  - auth-service.yaml
  - game-service.yaml
  - orders-service.yaml
  - reviews-service.yaml
  - frontend.yaml
```

### Option 3: Adjust Container Limits

Create `kubernetes/overlays/minimal/kustomization.yaml`:

```yaml
patches:
  - target:
      kind: Deployment
    patch: |-
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/memory
        value: "64Mi"
```

---

## Conclusion

GameStore's microservices architecture provides flexibility across development, staging, and production environments while maintaining consistent deployment patterns. Environment isolation through Kubernetes namespaces, resource quotas, and Kustomize overlays enables teams to safely test changes before production deployment.

For optimal performance and stability in local development, **maintain minimum 6GB RAM**. This ensures all components have sufficient resources without memory contention causing container crashes.
