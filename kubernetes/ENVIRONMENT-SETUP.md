# Environment Setup Guide - Quick Reference

This guide explains how the GameStore application is isolated across different environments and what you need to know about each.

## TL;DR - Quick Start

### Local Development (Docker Compose)

```bash
docker-compose up -d
# Access: http://localhost:8000
# Requires: 6GB+ RAM
```

### Local Development (Kubernetes)

```bash
kubectl apply -k kubernetes/overlays/development
# Requires: 6GB+ RAM, kubectl configured
```

### Staging (Testing)

```bash
kubectl apply -k kubernetes/overlays/staging
# Requires: 12GB+ RAM, multiple replicas enabled
```

### Production (Live)

```bash
kubectl apply -k kubernetes/overlays/production
# Requires: 16GB+ RAM (per node), auto-scaling enabled
```

---

## Environment Comparison Matrix

### Deployment Options

| Metric                   | Docker Compose | Kubernetes Dev | Kubernetes Staging | Kubernetes Prod  |
| ------------------------ | -------------- | -------------- | ------------------ | ---------------- |
| **Setup Time**           | 5 minutes      | 10-15 minutes  | 15-20 minutes      | 30+ minutes      |
| **Complexity**           | Simple         | Medium         | Medium             | Advanced         |
| **Min RAM**              | 6GB            | 6GB            | 12GB               | 16GB+ per node   |
| **Service Replicas**     | 1 each         | 1 each         | 2-3 each           | 4+ each          |
| **Auto-scaling**         | No             | No             | Yes (1-3)          | Yes (1-10+)      |
| **Database Replication** | No             | No             | Optional           | Yes (HA)         |
| **Best For**             | Development    | Testing        | QA/Staging         | Users/Production |
| **Scaling**              | Manual         | Manual         | Semi-auto          | Fully Auto       |

---

## 1. Development Environment (gamestore-dev)

### Use Case

- Local machine development
- Testing code changes
- Debugging issues
- Experimenting with features

### Resource Profile

```
Total Namespace Quota: 8Gi memory, 4 CPU cores
Per-Service: 1 replica
Container Memory Usage: ~2.5GB
Host RAM Required: 6GB (minimum)
Disk Space: 15GB
```

### Key Characteristics

- ✅ Minimal resource usage (1 replica per service)
- ✅ Fast iteration (no waiting for multiple pods)
- ✅ Easy debugging (single pod to observe)
- ❌ No high availability
- ❌ No auto-scaling
- ❌ Single point of failure

### Network Configuration

```
Namespace: gamestore-dev
Services: Used via headless DNS
Example: http://game-service.gamestore-dev.svc.cluster.local:3002
Frontend: http://localhost:3000 (port-forward)
```

### How to Deploy

```bash
# Deploy development environment
kubectl apply -k kubernetes/overlays/development

# Verify
kubectl get all -n gamestore-dev

# Port forward for access
kubectl port-forward -n gamestore-dev svc/frontend 3000:3000

# Access at http://localhost:3000
```

### Single Service Update

```bash
# Modify code in services/game-service/

# Rebuild
docker build -t gamestore-game-service:latest services/game-service

# Load into Minikube
minikube image load gamestore-game-service:latest

# Restart pod
kubectl rollout restart deployment/game-service -n gamestore-dev

# Watch rollout
kubectl get pods -n gamestore-dev --watch

# Check logs
kubectl logs -f deployment/game-service -n gamestore-dev
```

### Data Persistence

```
PostgreSQL: Single instance, 10GB PVC
Redis: Single instance, 5GB PVC (optional)
Solr: Single instance, 10GB PVC (optional)
Data survives pod restarts
```

### When to Use Dev Environment

- ✅ Local development on your machine
- ✅ Quick testing of changes
- ✅ Learning Kubernetes basics
- ✅ Running locally with Docker Desktop
- ❌ Performance testing
- ❌ Load testing
- ❌ Team/QA testing

---

## 2. Staging Environment (gamestore-staging)

### Use Case

- Pre-production testing
- Quality assurance validation
- Performance testing
- Release candidate verification
- Team testing before production

### Resource Profile

```
Total Namespace Quota: 16Gi memory, 8 CPU cores
Per-Service: 2-3 replicas (HPA manages 1-3)
Container Memory Usage: ~5-7GB typical
Host RAM Required: 12GB (minimum)
Disk Space: 30GB
Target Node Count: 2-3
```

### Key Characteristics

- ✅ Multiple replicas (tests scalability)
- ✅ HPA enabled (auto-scaling 1-3 replicas)
- ✅ More realistic load testing
- ✅ Closer to production behavior
- ✅ Better fault tolerance
- ⚠️ Uses more resources than dev
- ⚠️ Slower pod startup/shutdown

### Network Configuration

```
Namespace: gamestore-staging
Ingress: Enabled with path-based routing
External Access: http://staging.example.com
TLS: Self-signed or staging CA certificate
Rate Limiting: Moderate (allows testing)
```

### How to Deploy

```bash
# Deploy staging environment
kubectl apply -k kubernetes/overlays/staging

# Verify with multiple replicas
kubectl get pods -n gamestore-staging

# Check HPA status
kubectl get hpa -n gamestore-staging

# Monitor auto-scaling
kubectl get hpa -n gamestore-staging --watch

# View metrics
kubectl get pods -n gamestore-staging -o custom-columns=\
  NAME:.metadata.name,CPU:.usage.cpu,MEMORY:.usage.memory
```

### Load Testing in Staging

```bash
# Test with load generator
# This triggers HPA to scale up to 3 replicas (if using staging)
for i in {1..1000}; do
  curl http://staging.example.com/api/games &
done

# Monitor scaling
kubectl get pods -n gamestore-staging --watch

# Check HPA decisions
kubectl describe hpa game-service-hpa -n gamestore-staging
```

### Database Configuration

```
PostgreSQL:
  - Single primary instance
  - Optional read replica
  - Daily backups
  - 20GB PVC

Redis:
  - Potentially replicated for HA testing
  - 10GB PVC

Solr:
  - Single instance or cluster mode
  - 20GB PVC
```

### When to Use Staging

- ✅ QA/UAT testing
- ✅ Performance validation
- ✅ Scaling testing
- ✅ Release candidate verification
- ✅ Team/Business testing
- ✅ Load testing (moderate)
- ❌ Production traffic
- ❌ User-facing deployment
- ❌ Real payments/transactions

### Pre-Production Checklist

```
☐ All code changes reviewed and merged
☐ Automated tests passing
☐ Staging deployed and stable for 30+ minutes
☐ Performance meets SLA targets
☐ No memory leaks or resource issues
☐ Backup/restore tested
☐ Logs aggregated and searchable
☐ Monitoring/alerting validated
☐ Security scan completed
☐ QA sign-off obtained
```

---

## 3. Production Environment (gamestore-prod)

### Use Case

- Live user traffic
- Real transactions
- Critical operations
- Maximum reliability required

### Resource Profile

```
Total Namespace: UNLIMITED (auto-scales as needed)
Per-Service: 4+ replicas (HPA manages 1-10+)
Container Memory Usage: 10GB+ (scales dynamically)
Host RAM Required: 16GB+ per node (typically 3+ nodes)
Disk Space: 100GB+ (across multiple nodes)
Target Node Count: 3-5+ (multi-zone for HA)
```

### Key Characteristics

- ✅ High availability (4+ replicas per service)
- ✅ Aggressive auto-scaling (1-10+ replicas based on load)
- ✅ Distributed across multiple nodes
- ✅ VPA enabled for continuous optimization
- ✅ No resource quotas (unlimited scaling)
- ✅ Real-time backups and PITR capability
- ⚠️ Complex multi-node setup
- ⚠️ Continuous cost implications
- ⚠️ Requires operability/monitoring expertise

### Network Configuration

```
Namespace: gamestore-prod
Ingress: Production-grade with WAF
External Access: http://gamestore.com
TLS: Production CA certificate (e.g., LetsEncrypt)
Rate Limiting: Strict per-user/IP
Load Balancer: Cloud provider's LB (AWS/GCP/Azure)
CDN: Optional for static assets
DDoS Protection: Enabled
```

### How to Deploy

```bash
# Deploy production environment
kubectl apply -k kubernetes/overlays/production

# Verify high availability
kubectl get pods -n gamestore-prod
# Should show 4+ replicas per service

# Check HPA aggressive scaling
kubectl get hpa -n gamestore-prod
kubectl describe hpa game-service-hpa -n gamestore-prod

# Monitor with Prometheus
kubectl port-forward -n gamestore-prod svc/prometheus 9090:9090
# Open http://localhost:9090

# View Grafana dashboards
kubectl port-forward -n gamestore-prod svc/grafana 3000:3000
# Open http://localhost:3000
```

### Database Configuration

```
PostgreSQL:
  - Primary + 1+ Read Replicas (HA setup)
  - Synchronous replication
  - Multi-AZ deployment (if on cloud)
  - Real-time backups (PITR enabled)
  - 100GB+ PVC (distributed storage)

Redis:
  - Master + Replica (or Redis Cluster)
  - Persistent AOF enabled
  - 20GB+ PVC

Solr:
  - SolrCloud mode (distributed)
  - Replication factor: 2+
  - 50GB+ PVC (across nodes)
```

### Scaling Behavior

```
GET /api/games (load increases):
  Replicas: 2 → 4 → 6 → 8 → 10
  Trigger: CPU > 70% or Memory > 80%

Cooldown: 300 seconds (5 min)
Scale-up delay: 0 (immediate)
Scale-down delay: 300 seconds (conservative)
Min replicas: 2 (never go below)
Max replicas: 10 (cost control)
```

### Deployment Process (Production)

```bash
# 1. Build and test
docker build -t gamestore-game-service:v1.2.3 services/game-service
docker push gcr.io/my-project/gamestore-game-service:v1.2.3

# 2. Blue-Green Deployment (manual)
# Deploy new version alongside old:
kubectl set image deployment/game-service \
  game-service=gcr.io/my-project/gamestore-game-service:v1.2.3 \
  -n gamestore-prod

# 3. Monitor rollout
kubectl rollout status deployment/game-service -n gamestore-prod -w

# 4. If issues, instant rollback available
kubectl rollout undo deployment/game-service -n gamestore-prod
```

### Monitoring & Alerting

```
Prometheus: 90-day retention
Grafana: Real-time dashboards
Alerts: PagerDuty, Slack, Email
Log Aggregation: ELK or Loki
APM: Datadog or similar (optional)

Key Metrics:
- Request latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- Pod restart count
- Memory usage trends
- Database connection pool
- Cache hit ratio
```

### When to Use Production

- ✅ User-facing applications
- ✅ Real transactions/payments
- ✅ Need 99.9%+ uptime
- ✅ Scaling requirements unpredictable
- ✅ Data loss is unacceptable
- ❌ Testing/development
- ❌ Cost-sensitive operations
- ❌ First-time Kubernetes users

### Production Checklist

```
☐ All staging checks passed
☐ Production secrets configured
☐ Backups tested and verified
☐ Monitoring and alerting active
☐ On-call team ready
☐ Disaster recovery plan documented
☐ Team trained on incident response
☐ Database HA configured
☐ SSL certificates valid
☐ DNS records updated
☐ CDN configured (if applicable)
☐ Rate limiting configured
☐ WAF rules enabled
☐ DDoS protection active
☐ Audit logging enabled
```

---

## Resource Requirements Summary

### Host Machine Sizing

```
4GB RAM: ❌ NOT RECOMMENDED (containers crash frequently)
6GB RAM: ✅ For Docker Compose or Kubernetes Dev
8GB RAM: ✅ Safe for local development
12GB RAM: ✅ For staging on local machine
16GB+ RAM: ✅ For production-like testing

Disk Space:
- 10GB: Minimum (with aggressive cleanup)
- 20GB: Comfortable for dev/staging
- 50GB+: Production installations
```

### Container Memory Breakdown

```
PostgreSQL:        256-512 MB
Redis:             100-256 MB
Solr:              512 MB (Java)
4 Microservices:   600-800 MB total
Frontend:          100-150 MB
Nginx:             64-128 MB
Prometheus:        256-512 MB
Grafana:           200-300 MB
─────────────────────────────
Subtotal:          ~2.5-3.5 GB

System Overhead:
Docker daemon:     300-500 MB
OS/Kubelet:        1.5-2.0 GB
Buffers/Cache:     500-1000 MB
─────────────────────────────
System Total:      ~2-3 GB

TOTAL REQUIRED:    ~5-6+ GB (6GB minimum recommended)
```

---

## Switching Between Environments

### From Dev to Staging

```bash
# Switch namespace context
kubectl config set-context --current --namespace=gamestore-staging

# Or specify namespace explicitly
kubectl get pods -n gamestore-staging

# New kubeconfig for easy switching
kubectl config rename-context docker-desktop dev
kubectl config rename-context staging-context staging
kubectl config rename-context prod-context prod

# Switch
kubectl config use-context staging
```

### Comparing Environment Configs

```bash
# Show dev resources
kubectl get deployments -n gamestore-dev -o wide

# Show staging (higher replicas)
kubectl get deployments -n gamestore-staging -o wide

# Show prod (even higher replicas, auto-scaling)
kubectl get deployments -n gamestore-prod -o wide
```

---

## Environment Isolation: How It Works

### Namespace Isolation

```
gamestore-dev/
  ├─ Separate from other envs
  ├─ Own database (postgres-dev)
  ├─ Own Redis cache
  └─ Resource quota: 8Gi

gamestore-staging/
  ├─ Separate from other envs
  ├─ Own database (postgres-staging)
  ├─ Own Redis cache
  └─ Resource quota: 16Gi

gamestore-prod/
  ├─ Separate from other envs
  ├─ Own database (postgres-prod)
  ├─ Own Redis cache
  └─ Resource quota: Unlimited
```

### ConfigMap/Secrets by Environment

```
dev:
  - LOG_LEVEL: debug
  - NODE_ENV: development
  - DB_HOST: postgres.gamestore-dev.svc.cluster.local

staging:
  - LOG_LEVEL: info
  - NODE_ENV: staging
  - DB_HOST: postgres.gamestore-staging.svc.cluster.local

prod:
  - LOG_LEVEL: warn
  - NODE_ENV: production
  - DB_HOST: postgres.gamestore-prod.svc.cluster.local
```

### Kustomize Magic

```
kubernetes/base/               # Shared configuration
├─ auth-service.yaml
├─ game-service.yaml
├─ postgres.yaml
└─ kustomization.yaml          # References base

kubernetes/overlays/development/
├─ kustomization.yaml          # Patches base for dev
├─ Reduces replicas to 1
├─ Sets imagePolicy: IfNotPresent
├─ Limits resources
└─ Namespace: gamestore-dev

kubernetes/overlays/staging/
├─ kustomization.yaml          # Patches base for staging
├─ Increases replicas to 2-3
├─ Enables HPA
├─ Moderate resource limits
└─ Namespace: gamestore-staging

kubernetes/overlays/production/
├─ kustomization.yaml          # Patches base for prod
├─ Increases replicas to 4+
├─ Enables aggressive auto-scaling
├─ High resource limits
└─ Namespace: gamestore-prod
```

---

## Troubleshooting: 4GB RAM Issue

### Problem: "Out of Memory" crashes

**Symptoms:**

- Pods restart frequently
- `kubectl describe pod` shows `OOMKilled`
- Services unreachable intermittently
- Application logs show memory errors

**Root Cause:**

- Host has only 4GB RAM
- Containers (2.5GB) + System overhead (2.5GB) = 5GB total
- No buffer for spikes → OOMKilled

**Solutions (in order of preference):**

1. **Upgrade to 6GB+ RAM** (recommended)
   - Most reliable solution
   - Eliminates memory contention
   - Supports all features

2. **Use Docker Compose instead**

   ```bash
   docker-compose up -d
   # Lighter than Kubernetes (~500MB less overhead)
   ```

3. **Disable monitoring**

   ```yaml
   # Edit kubernetes/base/kustomization.yaml
   # Comment out:
   # - monitoring.yaml     # Saves ~450MB
   ```

4. **Disable Solr search**

   ```yaml
   # Comment:
   # - solr.yaml          # Saves ~512MB
   # Not needed for basic testing
   ```

5. **Reduce resource limits** (last resort)
   ```yaml
   # Edit services, change:
   requests:
     memory: "64Mi" # (was 128Mi)
     cpu: "50m" # (was 100m)
   limits:
     memory: "128Mi" # (was 256Mi)
     cpu: "100m" # (was 200m)
   ```

### Verify Current Memory Usage

```bash
# Using Docker
docker stats --no-stream

# Using Kubernetes
kubectl top nodes              # Node memory usage
kubectl top pods -n gamestore-dev   # Pod memory usage
```

---

## Additional Resources

- 📖 [Full Architecture Guide](ARCHITECTURE.md)
- 📊 [Component Diagram](COMPONENT-DIAGRAM.md)
- 📘 [Kubernetes README](README.md)
- 🔗 [Kustomize Documentation](https://kustomize.io/)
- ⚙️ [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

---

**Last Updated:** February 2024  
**Status:** Complete & Tested
