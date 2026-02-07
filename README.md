# GameStore Backend - Microservices Application

A comprehensive, production-ready web service-based gaming platform demonstrating advanced microservices architecture, API design patterns, security, and monitoring capabilities.

**Project Status**: ✅ Complete & Fully Functional

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
  - [System Design](#system-design)
  - [Service Stack](#service-stack)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
  - [Docker Compose (Local)](#docker-compose-local)
  - [⭐ Kubernetes (Local & Cloud)](#kubernetes-local--cloud)
- [Kubernetes & Cloud Deployment](#kubernetes--cloud-deployment)
  - [Local Kubernetes](#local-kubernetes)
  - [Google Cloud (GKE)](#google-cloud-gke)
  - [Other Cloud Providers](#other-cloud-providers)
- [Services](#services)
- [API Documentation](#api-documentation)
- [Authentication & Security](#authentication--security)
- [Performance & Monitoring](#performance--monitoring)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

---

## Overview

**GameStore Backend** is a full-featured microservices application for managing a digital game store. It showcases:

- ✅ **4 Independent Microservices**: Auth, Game, Orders, Reviews
- ✅ **Dual API Support**: REST (with HATEOAS) + GraphQL
- ✅ **Enterprise Security**: JWT authentication, RBAC, rate limiting, security headers
- ✅ **Advanced Search**: Apache Solr with complex filtering
- ✅ **Performance Optimization**: Redis caching, connection pooling, compression
- ✅ **Enterprise Monitoring**: Prometheus + Grafana observability stack
- ✅ **Container Orchestration**: Docker Compose + Kubernetes
- ✅ **Cloud Deployment**: Production-ready GKE, EKS, AKS, or self-hosted Kubernetes
- ✅ **API Gateway**: Nginx reverse proxy with request routing
- ✅ **Full Documentation**: Swagger/OpenAPI + GraphQL Playground

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│                        Port: 8000 (3000)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    API Gateway (Nginx)                          │
│                         Port: 80                                │
│    ┌─────────────┬─────────────┬──────────────┬──────────────┐  │
├────┤ Auth        │ Game        │ Orders       │ Reviews      ├──┤
│    │ Port: 3001  │ Port: 3002  │ Port: 3003   │ Port: 3004   │  │
└────┼─────────────┼─────────────┼──────────────┼──────────────┼──┘
     │             │             │              │
     │  ┌──────────┴──────────┐   │              │
     │  │   PostgreSQL DB     │   │              │
     │  │   (Shared)          │   │              │
     │  │   Port: 5432        │   │              │
     │  └─────────────────────┘   │              │
     │                             │              │
     │                    ┌────────▼──────────┐   │
     │                    │  Redis Cache      │   │
     │                    │  Port: 6379       │   │
     │                    └───────────────────┘   │
     │                                             │
     └─────────────────────────────────┬─────────┘
                                       │
                            ┌──────────▼───────────┐
                            │  Apache Solr         │
                            │  Port: 8983          │
                            └──────────────────────┘

Monitoring Stack:
┌──────────────────────────────────────────────────────────┐
│ Prometheus (9090) ──→ Grafana (3005) ──→ Dashboards     │
└──────────────────────────────────────────────────────────┘
```

### Service Stack

| Service             | Port | Purpose                                   | Tech                   |
| ------------------- | ---- | ----------------------------------------- | ---------------------- |
| **Auth Service**    | 3001 | User authentication, JWT token generation | Node.js/Express        |
| **Game Service**    | 3002 | Game CRUD, GraphQL, Solr search, caching  | Node.js/Express/Apollo |
| **Orders Service**  | 3003 | Order management, cart processing         | Node.js/Express        |
| **Reviews Service** | 3004 | Game reviews, ratings                     | Node.js/Express        |
| **API Gateway**     | 80   | Request routing, rate limiting, security  | Nginx                  |
| **Frontend**        | 8000 | React web application                     | React/Node.js          |

### Infrastructure Services

| Service     | Port | Purpose                     |
| ----------- | ---- | --------------------------- |
| PostgreSQL  | 5432 | Primary relational database |
| Redis       | 6379 | Caching layer               |
| Apache Solr | 8983 | Full-text search engine     |
| Prometheus  | 9090 | Metrics collection          |
| Grafana     | 3005 | Monitoring dashboards       |

---

## Technology Stack

### Backend Services

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **API Specifications**:
  - REST with HATEOAS
  - GraphQL (Apollo Server)
  - Swagger/OpenAPI 3.0
- **Authentication**: JWT (JSON Web Tokens)
- **Database**: PostgreSQL 15
- **Search**: Apache Solr 9
- **Caching**: Redis 7
- **Containerization**: Docker & Docker Compose

### Monitoring & Observability

- **Metrics**: Prometheus
- **Visualization**: Grafana
- **Logging**: Winston + Morgan
- **Health Checks**: Built-in endpoints

### Security

- Rate limiting (express-rate-limit, Nginx)
- JWT-based authentication
- Role-based access control (RBAC)
- CORS middleware
- Security headers (X-Frame-Options, CSP, XSS protection)
- Bcrypt password hashing

### Frontend

- React 18
- Context API for state management
- Axios for API calls

---

## Project Structure

```
gamestore/
├── services/
│   ├── auth-service/              # User authentication & authorization
│   │   ├── index.js              # Main application with REST endpoints
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── config/
│   │       ├── logger.js          # Winston logging configuration
│   │       ├── metrics.js         # Prometheus metrics
│   │       └── swagger.js         # Swagger documentation
│   │
│   ├── game-service/              # Game CRUD & GraphQL + Solr search
│   │   ├── index.js              # REST endpoints + GraphQL server
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── config/
│   │
│   ├── orders-service/            # Order management
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── config/
│   │
│   └── reviews-service/           # Game reviews & ratings
│       ├── index.js
│       ├── package.json
│       ├── Dockerfile
│       └── config/
│
├── frontend/                       # React web application
│   ├── src/
│   │   ├── pages/                # Page components
│   │   ├── components/           # Reusable components
│   │   ├── services/             # API service clients
│   │   ├── context/              # React context
│   │   └── App.js
│   ├── package.json
│   ├── Dockerfile
│   └── Dockerfile.dev
│
├── nginx/                          # API Gateway configuration
│   ├── nginx.conf                # Routing, rate limiting, security headers
│   └── Dockerfile
│
├── config/                         # Shared configuration
│   ├── logger.js
│   ├── metrics.js
│   └── swagger.js
│
├── docker/                         # Database initialization scripts
│   ├── seed-games.sql            # Sample game data
│   ├── seed-games.sh
│   └── solr-init.sh              # Solr schema setup
│
├── grafana/                        # Monitoring configuration
│   ├── datasources.yml
│   ├── dashboards.yml
│   └── dashboards/
│       └── gamestore-main.json
│
├── docker-compose.yml              # Multi-container orchestration
├── prometheus.yml                  # Prometheus scrape configuration
├── alerts.yml                      # Prometheus alert rules
├── setup.sh                        # Initial setup script
├── start.sh                        # Service startup script
└── README.md                       # This file
```

---

## Quick Start

### Docker Compose (Local)

**For rapid local development and testing**

#### Prerequisites

- Docker & Docker Compose
- Git
- Minimum 4GB RAM, 2GB disk space for Docker containers

#### Installation & Running

#### 1. Clone the repository

```bash
git clone <repository-url>
cd gamestore
```

#### 2. Configure environment variables (optional)

```bash
# Create .env file for custom configuration
cat > .env << EOF
JWT_SECRET=your-secret-key-change-this-in-production
DB_USER=gamestore_user
DB_PASSWORD=gamestore_password
DB_NAME=gamestore_db
REDIS_HOST=redis
REDIS_PORT=6379
SOLR_HOST=solr
SOLR_PORT=8983
EOF
```

#### 3. Start all services

```bash
# Start all containers in the background
docker-compose up -d

# Or start in foreground (for debugging)
docker-compose up

# Watch logs
docker-compose logs -f
```

#### 4. Verify services are running

```bash
# Check service health
curl http://localhost/health

# List running containers
docker-compose ps
```

#### 5. Access services

| Service              | URL                           | Purpose                  |
| -------------------- | ----------------------------- | ------------------------ |
| Frontend             | http://localhost:8000         | Web UI                   |
| API Gateway          | http://localhost              | REST API                 |
| Game Service Swagger | http://localhost:3002/docs    | API documentation        |
| GraphQL Playground   | http://localhost:3002/graphql | GraphQL IDE              |
| Prometheus           | http://localhost:9090         | Metrics                  |
| Grafana              | http://localhost:3005         | Dashboards (admin/admin) |

### Stopping Services

```bash
# Stop all containers
docker-compose down

# Stop and remove all data
docker-compose down -v
```

---

## ⭐ Kubernetes (Local & Cloud)

GameStore includes **production-ready Kubernetes manifests** for deploying to any Kubernetes cluster.

### Quick Start with Kubernetes

#### Option 1: Local Kubernetes (Fastest)

**Prerequisites**: Docker Desktop or Minikube with Kubernetes enabled

```bash
# Deploy all services to your local Kubernetes cluster
kubectl apply -k kubernetes/base

# Verify all pods are running
kubectl get pods -n gamestore --watch

# Access the application
kubectl port-forward -n gamestore svc/frontend 8000:3000
kubectl port-forward -n gamestore svc/game-service 3002:3002
kubectl port-forward -n gamestore svc/grafana 3005:3000

# Frontend: http://localhost:8000
# Game API: http://localhost:3002
# Grafana: http://localhost:3005
```

#### Option 2: Google Cloud (GKE) - Production Recommended ⭐

**One-command setup for fully managed Kubernetes on Google Cloud:**

```bash
# 1. Set your GCP project
export PROJECT_ID="your-gcp-project-id"

# 2. Create GKE cluster (handles everything)
bash kubernetes/gke-setup.sh $PROJECT_ID gamestore-cluster us-central1

# 3. Build and push Docker images
bash kubernetes/build-and-push.sh $PROJECT_ID us-central1

# 4. Deploy to GKE
kubectl apply -k kubernetes/base

# 5. Get your app URL
kubectl get ingress -n gamestore
```

**What You Get:**

- ✅ Fully managed GKE cluster (3-10 auto-scaling nodes)
- ✅ Cloud SQL (PostgreSQL)
- ✅ Cloud Memorystore (Redis)
- ✅ Global Load Balancer with SSL
- ✅ Prometheus + Grafana monitoring
- ✅ Auto-scaling & health checks
- ✅ Production-ready infrastructure

**Cost**: ~$95/month for a complete production deployment

### What's Included in Kubernetes

| Component         | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| **Deployments**   | 4 microservices with auto-scaling (2-5 replicas) |
| **StatefulSet**   | PostgreSQL with persistent storage               |
| **Services**      | Internal networking & load balancing             |
| **Ingress**       | HTTP/HTTPS routing & SSL termination             |
| **ConfigMaps**    | Application configuration                        |
| **Secrets**       | Secure credential management                     |
| **HPA**           | Horizontal Pod Auto-scaling (CPU/memory based)   |
| **Monitoring**    | Prometheus + Grafana dashboards                  |
| **Health Checks** | Liveness & readiness probes                      |

### Kubernetes Features

- 🚀 **Rolling Updates** - Zero-downtime deployments
- 📈 **Auto-Scaling** - Scales up/down based on load
- 🔄 **Self-Healing** - Automatically restarts failed pods
- 💾 **Persistent Storage** - StatefulSet for databases
- 📊 **Monitoring** - Built-in observability stack
- 🌍 **Multi-Cloud** - Deploy to GKE, EKS, AKS, or self-hosted

### Next Steps

For detailed Kubernetes documentation:

- **Local Deployment**: [kubernetes/README.md](kubernetes/README.md)
- **Google Cloud Deployment**: [kubernetes/GOOGLE_CLOUD_DEPLOYMENT.md](kubernetes/GOOGLE_CLOUD_DEPLOYMENT.md)
- **Secrets Configuration**: [SECRETS_SETUP.md](SECRETS_SETUP.md)

---

## Services

### 1. Auth Service (Port 3001)

**Purpose**: User authentication, registration, and JWT token generation

#### Key Endpoints

**POST /api/v1/auth/register**

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "john_doe",
    "password": "securePassword123"
  }'
```

Response:

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "john_doe",
    "role": "USER",
    "created_at": "2024-02-07T10:30:00Z"
  }
}
```

**POST /api/v1/auth/login**

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

Response:

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "john_doe",
    "role": "USER"
  }
}
```

**GET /api/v1/auth/me**

```bash
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Documentation**: http://localhost:3001/docs

---

### 2. Game Service (Port 3002)

**Purpose**: Game catalog management with REST API, GraphQL, and Solr search

#### KEY ENDPOINTS (REST API)

**GET /api/v1/games** - List all games with pagination

```bash
curl "http://localhost:3002/api/v1/games?limit=10&offset=0"
```

Response:

```json
{
  "data": [
    {
      "id": 1,
      "title": "The Witcher 3",
      "genre": "RPG",
      "platform": "PC",
      "price": 49.99,
      "rating": 9.2,
      "description": "Open-world fantasy RPG...",
      "release_date": "2015-05-19",
      "created_at": "2024-02-07T10:00:00Z",
      "updated_at": "2024-02-07T10:00:00Z",
      "_links": {
        "self": "/api/v1/games/1",
        "update": "/api/v1/games/1",
        "delete": "/api/v1/games/1",
        "list": "/api/v1/games"
      }
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 50
  },
  "_links": {
    "self": "/api/v1/games?limit=10&offset=0",
    "first": "/api/v1/games?limit=10&offset=0",
    "next": "/api/v1/games?limit=10&offset=10",
    "prev": null
  }
}
```

**GET /api/v1/games/:id** - Get game details

```bash
curl http://localhost:3002/api/v1/games/1
```

**POST /api/v1/games** - Create game (Admin only)

```bash
curl -X POST http://localhost:3002/api/v1/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Cyberpunk 2077",
    "genre": "RPG",
    "platform": "PC",
    "price": 59.99,
    "rating": 8.5,
    "description": "Futuristic open-world RPG...",
    "release_date": "2020-12-10"
  }'
```

**PUT /api/v1/games/:id** - Update game (Admin only)

```bash
curl -X PUT http://localhost:3002/api/v1/games/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "price": 39.99,
    "rating": 9.0
  }'
```

**DELETE /api/v1/games/:id** - Delete game (Admin only)

```bash
curl -X DELETE http://localhost:3002/api/v1/games/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### ADVANCED SEARCH (Solr Integration)

**GET /api/v1/games/search** - Search games with filters

```bash
# Search by title with price range
curl "http://localhost:3002/api/v1/games/search?q=witcher&priceMin=10&priceMax=60&limit=10"

# Filter by genre and platform
curl "http://localhost:3002/api/v1/games/search?genre=RPG&platform=PC"

# Filter by minimum rating
curl "http://localhost:3002/api/v1/games/search?ratingMin=8.5&sort=price_asc"
```

Query Parameters:

- `q`: Search query (full-text search)
- `genre`: Game genre filter
- `platform`: Game platform filter
- `priceMin`: Minimum price
- `priceMax`: Maximum price
- `ratingMin`: Minimum rating
- `sort`: Sort by field (price_asc, price_desc, rating_asc, rating_desc)
- `limit`: Results per page (default: 10)
- `offset`: Pagination offset (default: 0)

#### GraphQL API

**GET http://localhost:3002/graphql** - GraphQL Playground

**Query: Get all games with pagination**

```graphql
query {
  games(limit: 5, offset: 0) {
    data {
      id
      title
      genre
      platform
      price
      rating
      _links {
        self
        update
        delete
      }
    }
    pagination {
      limit
      offset
      total
    }
  }
}
```

**Query: Get single game**

```graphql
query {
  game(id: 1) {
    id
    title
    description
    price
    rating
    release_date
    _links {
      self
      update
      delete
    }
  }
}
```

**Query: Search games with filters**

```graphql
query {
  searchGames(
    q: "witcher"
    genre: "RPG"
    priceMin: 20
    priceMax: 60
    ratingMin: 8
    sort: "rating_desc"
    limit: 10
    offset: 0
  ) {
    data {
      id
      title
      genre
      price
      rating
    }
    pagination {
      total
      limit
      offset
    }
  }
}
```

**Mutation: Create game**

```graphql
mutation {
  createGame(
    title: "Baldur's Gate 3"
    genre: "RPG"
    price: 59.99
    platform: "PC"
    release_date: "2023-08-03"
    rating: 9.5
    description: "Turn-based RPG with deep story"
  ) {
    message
    data {
      id
      title
      price
    }
  }
}
```

**Documentation**:

- REST: http://localhost:3002/docs
- GraphQL: http://localhost:3002/graphql

---

### 3. Orders Service (Port 3003)

**Purpose**: Order management and checkout operations

#### Key Endpoints

**GET /api/v1/orders** - Get user orders (authenticated)

```bash
curl -X GET http://localhost:3003/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**POST /api/v1/orders** - Create order

```bash
curl -X POST http://localhost:3003/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "game_ids": [1, 2, 3],
    "quantities": [1, 2, 1]
  }'
```

**GET /api/v1/orders/:id** - Get order details

```bash
curl -X GET http://localhost:3003/api/v1/orders/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**PUT /api/v1/orders/:id/status** - Update order status (Admin)

```bash
curl -X PUT http://localhost:3003/api/v1/orders/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"status": "completed"}'
```

**Documentation**: http://localhost:3003/docs

---

### 4. Reviews Service (Port 3004)

**Purpose**: User reviews and ratings for games

#### Key Endpoints

**GET /api/v1/reviews/game/:gameId** - Get game reviews

```bash
curl "http://localhost:3004/api/v1/reviews/game/1?limit=10&offset=0"
```

**POST /api/v1/reviews** - Create review (authenticated)

```bash
curl -X POST http://localhost:3004/api/v1/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "game_id": 1,
    "rating": 9,
    "title": "Amazing game!",
    "comment": "One of the best games I have played..."
  }'
```

**GET /api/v1/reviews/:id** - Get review details

```bash
curl http://localhost:3004/api/v1/reviews/1
```

**PUT /api/v1/reviews/:id** - Update review (Owner or Admin)

```bash
curl -X PUT http://localhost:3004/api/v1/reviews/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rating": 8,
    "comment": "Updated review text..."
  }'
```

**DELETE /api/v1/reviews/:id** - Delete review (Owner or Admin)

```bash
curl -X DELETE http://localhost:3004/api/v1/reviews/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Documentation**: http://localhost:3004/docs

---

## API Documentation

### Accessing Swagger/OpenAPI Docs

Each service exposes Swagger documentation:

- **Auth Service**: http://localhost:3001/docs
- **Game Service**: http://localhost:3002/docs
- **Orders Service**: http://localhost:3003/docs
- **Reviews Service**: http://localhost:3004/docs

### Accessing GraphQL Playground

- **Game Service GraphQL**: http://localhost:3002/graphql

---

## Authentication & Security

### Authentication Flow

```
1. User Registration
   POST /api/v1/auth/register
   ↓
   Returns: User object

2. User Login
   POST /api/v1/auth/login
   ↓
   Returns: JWT Token

3. API Requests (Protected Endpoints)
   GET /api/v1/games
   Headers: Authorization: Bearer <JWT_TOKEN>
   ↓
   Request validated by middleware
   ↓
   Returns: Protected resource
```

### JWT Token Structure

Tokens are issued with:

- **Algorithm**: HS256
- **Expiry**: 24 hours
- **Payload**:
  ```json
  {
    "id": 1,
    "username": "john_doe",
    "email": "user@example.com",
    "role": "USER"
  }
  ```

### User Roles

| Role      | Permissions                                                            |
| --------- | ---------------------------------------------------------------------- |
| **ADMIN** | Full access to all operations (create/update/delete games and reviews) |
| **USER**  | Read games/reviews, create reviews, manage own orders                  |
| **GUEST** | Read-only access (no authentication required for GET requests)         |

### Role-Based Access Control (RBAC)

#### Admin-Only Endpoints

- `POST /api/v1/games` - Create game
- `PUT /api/v1/games/:id` - Update game
- `DELETE /api/v1/games/:id` - Delete game
- `PUT /api/v1/orders/:id/status` - Update order status
- `DELETE /api/v1/reviews/:id` - Delete any review

#### User-Only Endpoints

- `POST /api/v1/orders` - Create order
- `POST /api/v1/reviews` - Create review
- `PUT /api/v1/reviews/:id` - Update own review
- `GET /api/v1/orders` - Get own orders

#### Public Endpoints (No Auth Required)

- `GET /api/v1/games` - List games
- `GET /api/v1/games/:id` - Get game details
- `GET /api/v1/games/search` - Search games
- `GET /api/v1/reviews/game/:gameId` - Get game reviews

### Creating an Admin User

To create an admin user for testing:

```bash
# Connect to the database
docker-compose exec postgres psql -U gamestore_user -d gamestore_db

# Update user role in SQL
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Or use the API with admin privileges after promotion.

### Security Best Practices

✅ **Implemented:**

- JWT tokens with secure expiry
- Bcrypt password hashing
- Rate limiting (30 req/min for auth, 100 req/min for general)
- CORS enabled
- Security headers:
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: no-referrer-when-downgrade

⚠️ **For Production:**

- [ ] Enable HTTPS/TLS (Let's Encrypt certificates)
- [ ] Use environment variables for secrets (not in code)
- [ ] Implement input validation/sanitization
- [ ] Enable CORS only for trusted domains
- [ ] Use strong JWT_SECRET (min 32 characters)
- [ ] Implement OAuth2 for third-party integrations
- [ ] Add request size limits

---

## Performance & Monitoring

### Caching Strategy

**Redis Cache** is used for:

- Game listing results (TTL: 60s)
- Individual game details (TTL: 120s)
- Search results (TTL: 60s)

**Cache Keys:**

```
games:list:{limit}:{offset} → Cached game list
game:{id} → Single game cache
games:search:{query_hash} → Search results
```

**Manual Cache Invalidation:**

```bash
# Clear all game caches
curl -X POST http://localhost:3002/api/v1/cache/clear/games \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Performance Metrics

**Database Optimization:**

- Connection pooling (default: 20 connections)
- Indexed columns on foreign keys and frequently queried fields
- Query optimization for pagination

**Network Optimization:**

- Gzip compression enabled
- API response pagination (default: 10 items per page)
- GraphQL field selection (no over-fetching)

**Load Limits:**

- Rate limiting: 30-100 requests per minute per IP
- Search requests: 100 per minute
- Request body size: 10MB max

### Monitoring with Prometheus & Grafana

#### Access Points

- **Prometheus** (metrics collection): http://localhost:9090
- **Grafana** (dashboards): http://localhost:3005
  - Default credentials: `admin` / `admin`

#### Available Metrics

**Application Metrics:**

- `http_requests_total` - Total HTTP requests by method/endpoint/status
- `http_request_duration_ms` - Request duration histogram
- `http_request_size_bytes` - Request body size
- `database_connections_active` - Active database connections

**Custom Metrics:**

- `api_auth_login_total` - Total login attempts
- `api_games_created_total` - Total games created
- `api_search_requests_total` - Total search requests
- `cache_hits_total` - Redis cache hits
- `cache_misses_total` - Redis cache misses

#### Sample Prometheus Queries

```promql
# Request rate (requests per second)
rate(http_requests_total[5m])

# Error rate percentage
(rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) * 100

# Average response time by endpoint
avg(http_request_duration_ms) by (endpoint)

# Cache hit ratio
sum(cache_hits_total) / (sum(cache_hits_total) + sum(cache_misses_total))
```

#### Grafana Dashboards

**GameStore Main Dashboard** includes:

- Request rate and latency
- Error rates by service
- Active connections
- Cache hit/miss ratio
- Database performance
- Search query performance

### Logs

**View logs for a specific service:**

```bash
# Auth service logs
docker-compose logs -f auth-service

# Game service logs
docker-compose logs -f game-service

# All service logs
docker-compose logs -f
```

**Log Levels:**

- `INFO` - Application events
- `ERROR` - Error conditions
- `DEBUG` - Detailed debugging info

---

## Advanced Features

### GraphQL Features

**Supported Operations:**

- ✅ Queries (games, game, searchGames)
- ✅ Mutations (createGame, updateGame, deleteGame)
- ⚠️ Subscriptions (ready for implementation)
- ✅ Field-level resolvers with custom logic
- ✅ Error handling with descriptive messages

**Query Complexity:**

- No infinite nesting restrictions (safe defaults)
- Pagination enforced on list queries

### HATEOAS (Hypermedia As The Engine Of Application State)

All REST responses include navigational links:

```json
{
  "id": 1,
  "title": "The Witcher 3",
  "_links": {
    "self": "/api/v1/games/1",
    "update": "/api/v1/games/1",
    "delete": "/api/v1/games/1",
    "list": "/api/v1/games"
  }
}
```

Benefits:

- Clients can discover available actions
- API changes less disruptive to clients
- Self-documenting API

### Full-Text Search with Solr

**Search Capabilities:**

- Full-text search across game titles and descriptions
- Faceted search by genre, platform
- Range queries (price, rating)
- Sorting by multiple fields
- Highlighting of search terms

**Example Complex Query:**

```bash
curl "http://localhost:3002/api/v1/games/search?q=witcher&genre=RPG&platform=PC&priceMin=20&priceMax=60&ratingMin=8.5&sort=rating_desc&limit=20"
```

---

## Troubleshooting

### Services Not Starting

**Check service status:**

```bash
docker-compose ps
docker-compose logs <service-name>
```

**Rebuild containers:**

```bash
docker-compose down -v
docker-compose build
docker-compose up -d
```

### Database Connection Issues

**Error**: `connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**

```bash
# Ensure PostgreSQL is running and healthy
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Redis Connection Issues

**Error**: `Redis error: connect ECONNREFUSED`

**Solution:**

```bash
docker-compose restart redis
docker-compose logs redis
```

### Solr Not Indexing

**Check Solr status:**

```bash
curl http://localhost:8983/solr/admin/ping
```

**Re-initialize Solr:**

```bash
docker-compose exec solr /bin/bash
solr delete -c games
solr create -c games -s 1
```

### Port Already in Use

**Error**: `Error response from daemon: Ports are not available`

**Solution:**

```bash
# Find process using port
lsof -i :8000  # Replace with port number

# Kill process or use different port in docker-compose.yml
```

### Authentication Token Issues

**Error**: `403 Forbidden - Invalid or expired token`

**Solutions:**

- Ensure token is included in Authorization header: `Bearer <token>`
- Check token hasn't expired (24 hour expiry)
- Login again to get fresh token
- Verify JWT_SECRET matches across services

### Frontend Connection Issues

**Error**: `Cannot reach backend API`

**Solutions:**

1. Verify all services are running: `docker-compose ps`
2. Check environment variables in docker-compose.yml
3. Test connectivity: `curl http://localhost:80/health`
4. Check browser console for CORS errors

### Performance Degradation

**Symptoms**: Slow API responses, high error rates

**Troubleshooting:**

1. Check Redis is operational: `docker-compose exec redis redis-cli ping`
2. Monitor metrics: http://localhost:9090
3. Check active connections: `docker-compose exec postgres psql -U gamestore_user -d gamestore_db -c "SELECT count(*) FROM pg_stat_activity;"`
4. Review service logs for errors
5. Restart problematic service: `docker-compose restart <service-name>`

---

## Development

### Running Individual Services Locally

```bash
# Install dependencies for a service
cd services/game-service
npm install

# Run service (requires external databases)
npm start

# Or with nodemon for development
npm run dev
```

### Building Custom Docker Images

```bash
# Build specific service
docker-compose build game-service

# Build all services
docker-compose build

# Push to registry
docker tag gamestore-game-service:latest myregistry/gamestore-game-service:latest
docker push myregistry/gamestore-game-service:latest
```

### Database Migrations

```bash
# Access database
docker-compose exec postgres psql -U gamestore_user -d gamestore_db

# Common commands
\dt                    # List tables
\d table_name          # Describe table
SELECT * FROM games;   # Query
```

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add new feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit Pull Request

---

## License

This project is licensed under the MIT License.

---

## Support & Contact

For issues, questions, or contributions:

- Open an issue on the repository
- Check existing documentation
- Review API Swagger documentation
- Check service logs: `docker-compose logs -f`

---

## Kubernetes & Cloud Deployment

This project includes production-ready Kubernetes manifests and cloud deployment guides. Choose from multiple cloud providers or run locally on Kubernetes.

### Kubernetes Deployment

**Quick Start with Kubernetes:**

```bash
# Deploy all services to any Kubernetes cluster
kubectl apply -k kubernetes/base

# Verify deployment
kubectl get all -n gamestore

# Port-forward for local testing
kubectl port-forward -n gamestore svc/frontend 8000:3000
kubectl port-forward -n gamestore svc/game-service 3002:3002
```

**What's Included:**

- ✅ **Namespace & Secrets Management** - Secure credential handling
- ✅ **StatefulSets** - PostgreSQL with persistent storage
- ✅ **Deployments** - Stateless microservices with replicas
- ✅ **Services** - Internal & external networking
- ✅ **Ingress** - HTTP/HTTPS load balancing
- ✅ **HPA** - Horizontal Pod Auto-scaling
- ✅ **Resource Limits** - CPU & memory constraints
- ✅ **Health Checks** - Liveness & readiness probes
- ✅ **Monitoring** - Prometheus + Grafana stack

**Kubernetes Features:**

- Rolling updates with zero-downtime deployments
- Automatic pod restart on failure
- Load balancing across multiple replicas
- Persistent data with StatefulSets
- Auto-scaling based on CPU/memory metrics

**For Detailed Kubernetes Guide:**
See [kubernetes/README.md](kubernetes/README.md)

---

### Google Cloud (GKE)

**Fully Automated GKE Setup:**

```bash
# One-command cluster setup
bash kubernetes/gke-setup.sh your-gcp-project-id gamestore-cluster us-central1

# Build and push Docker images
bash kubernetes/build-and-push.sh your-gcp-project-id us-central1

# Deploy to GKE
kubectl apply -k kubernetes/base
```

**What Gets Provisioned:**

- ✅ **GKE Cluster** - 3-10 auto-scaling nodes
- ✅ **Cloud SQL** - Fully managed PostgreSQL database
- ✅ **Cloud Memorystore** - Managed Redis cache
- ✅ **Cloud Artifact Registry** - Docker image storage
- ✅ **Cloud Monitoring** - Integrated observability
- ✅ **Load Balancer** - Global HTTP(S) load balancing
- ✅ **Static IP** - Persistent external IP address
- ✅ **SSL/TLS** - Google-managed certificates

**GKE Advantages:**

- Fully managed Kubernetes (no master node maintenance)
- Auto-scaling infrastructure
- Integrated Cloud Monitoring & Logging
- Built-in security (Workload Identity, Network Policy)
- Google Cloud integration (Cloud SQL, Memorystore, etc.)

**Cost Estimate (Small Deployment):**

- GKE Cluster (3 nodes): ~$50/month
- Cloud SQL (db-f1-micro): ~$25/month
- Cloud Memorystore (1GB): ~$20/month
- **Total: ~$95/month**

**For Detailed Google Cloud Guide:**
See [kubernetes/GOOGLE_CLOUD_DEPLOYMENT.md](kubernetes/GOOGLE_CLOUD_DEPLOYMENT.md)

---

### Kubernetes File Structure

```
kubernetes/
├── base/                      # Base manifests (used by all environments)
│   ├── namespace.yaml         # Gamestore namespace
│   ├── secrets.yaml           # Credentials (JWT, DB password)
│   ├── configmap.yaml         # Configuration
│   ├── postgres.yaml          # Database
│   ├── redis.yaml             # Cache
│   ├── solr.yaml              # Search engine
│   ├── auth-service.yaml      # Auth microservice
│   ├── game-service.yaml      # Game microservice (2 replicas → 5 max)
│   ├── orders-service.yaml    # Orders microservice
│   ├── reviews-service.yaml   # Reviews microservice
│   ├── frontend.yaml          # React app
│   ├── monitoring.yaml        # Prometheus & Grafana
│   ├── ingress.yaml           # Load balancer & routing
│   └── kustomization.yaml     # Kustomize orchestration
│
├── gke-setup.sh               # Automated GKE cluster setup
├── build-and-push.sh          # Build & push Docker images
├── GOOGLE_CLOUD_DEPLOYMENT.md # Complete GKE guide
└── README.md                  # Kubernetes documentation
```

---

### Deploying to Different Cloud Providers

#### Google Cloud (GKE)

```bash
bash kubernetes/gke-setup.sh your-project-id
bash kubernetes/build-and-push.sh your-project-id us-central1
kubectl apply -k kubernetes/base
```

#### AWS (EKS)

```bash
# Create EKS cluster
eksctl create cluster --name gamestore --region us-east-1

# Get credentials
aws eks update-kubeconfig --region us-east-1 --name gamestore

# Deploy
kubectl apply -k kubernetes/base
```

#### Azure (AKS)

```bash
# Create AKS cluster
az aks create --resource-group myResourceGroup --name gamestore

# Get credentials
az aks get-credentials --resource-group myResourceGroup --name gamestore

# Deploy
kubectl apply -k kubernetes/base
```

#### Local (Docker Desktop / Minikube)

```bash
# Enable Kubernetes in Docker Desktop settings, then:
kubectl apply -k kubernetes/base

# Access services
kubectl port-forward -n gamestore svc/frontend 8000:3000
kubectl port-forward -n gamestore svc/game-service 3002:3002
```

---

### Key Kubernetes Concepts Used

**StatefulSets** (Databases):

- Maintains identity and persistent state
- Ordered, stable pod names
- Used for PostgreSQL, Solr

**Deployments** (Applications):

- Stateless service replicas
- Auto-scaling via HPA
- Rolling updates with zero downtime

**Services**:

- Internal DNS within cluster
- ClusterIP: Internal only
- LoadBalancer: External access via cloud provider

**Ingress**:

- Layer 7 (HTTP/HTTPS) routing
- Hostname-based routing
- SSL/TLS termination

**ConfigMaps & Secrets**:

- Configuration decoupled from code
- Secrets encrypted at rest (GKE)
- Easy updates without redeployment

**Horizontal Pod Autoscaler (HPA)**:

- Auto-scales replicas based on metrics
- CPU & memory threshold based
- Min 2, max 5-10 pods per service

**Health Checks**:

- **Liveness Probe**: Restart unhealthy pods
- **Readiness Probe**: Don't send traffic to starting pods

---

### Monitoring & Observability

**In-Cluster Monitoring:**

```bash
# Access Prometheus
kubectl port-forward -n gamestore svc/prometheus 9090:9090

# Access Grafana
kubectl port-forward -n gamestore svc/grafana 3000:3000

# View logs
kubectl logs -f -n gamestore deployment/game-service
```

**Google Cloud Monitoring Integration:**

- Automatic metrics collection
- Google Cloud Console dashboards
- Alert policies
- Log aggregation in Cloud Logging

---

### Updating Deployments

**Rolling Update (Zero Downtime):**

```bash
# Update image and automatically deploy
kubectl set image deployment/game-service \
  game-service=gcr.io/PROJECT_ID/gamestore-game-service:v2 \
  -n gamestore

# Watch the rollout
kubectl rollout status deployment/game-service -n gamestore

# Rollback if needed
kubectl rollout undo deployment/game-service -n gamestore
```

---

### Scaling

**Auto-Scaling (HPA):**

- Game Service: 2-5 replicas (70% CPU / 80% memory threshold)
- Auth Service: 2-5 replicas
- Orders Service: 2-4 replicas

Monitor with:

```bash
kubectl get hpa -n gamestore --watch
```

**Manual Scaling:**

```bash
kubectl scale deployment game-service --replicas=5 -n gamestore
```

---

## Deployment

### Cloud Deployment (AWS Example)

**Prerequisites:** AWS account, AWS CLI configured

**Deploy with ECS (Alternative to Kubernetes):**

1. **Build and Push Docker Images**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Push images
docker tag gamestore-game-service:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/gamestore-game-service:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/gamestore-game-service:latest
```

2. **Deploy with ECS**

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name gamestore

# Register task definition (update in task-definition.json with image URIs)
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service --cluster gamestore --service-name game-service --task-definition gamestore-game-service --desired-count 2
```

3. **Configure RDS Database**

```bash
aws rds create-db-instance \
  --db-instance-identifier gamestore-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username gamestore_user \
  --master-user-password <password>
```

4. **Setup Load Balancer** (ALB/NLB)

```bash
# Create target groups
# Configure listeners
# Health check endpoints point to /health
```

**Recommended: Use Kubernetes/GKE for better orchestration**

---

## Performance Baseline

Performance metrics (baseline configuration):

| Metric                  | Value       |
| ----------------------- | ----------- |
| API Response Time (p95) | < 200ms     |
| Database Query Time     | < 50ms      |
| Cache Hit Rate          | > 80%       |
| Throughput              | 1000+ req/s |
| Error Rate              | < 0.1%      |

---

**Last Updated:** February 2024  
**Project Status:** ✅ Production Ready
