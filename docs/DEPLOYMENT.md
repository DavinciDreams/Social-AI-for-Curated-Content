# Deployment Guide

This guide covers deploying Social AI for Curated Content to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Monitoring Setup](#monitoring-setup)
- [Backup and Recovery](#backup-and-recovery)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

Before deploying to production, ensure you have:

- All required services running (Elasticsearch, Redis, Neo4j)
- Valid SSL/TLS certificates for your domain
- Database backup strategy in place
- Monitoring and alerting configured
- Load testing completed and passed

## Environment Configuration

### Production Environment Variables

Create `.env.production` file with production values:

```env
# Backend Configuration
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@prod-db:5432/socialai
REDIS_URL=redis://prod-redis:6379
ELASTICSEARCH_URL=https://prod-es:9200
NEO4J_URI=bolt://prod-neo4j:7687
JWT_SECRET=your-production-secret-key-here

# OAuth Credentials (from provider dashboards)
OAUTH_TWITTER_CLIENT_ID=your-twitter-client-id
OAUTH_TWITTER_CLIENT_SECRET=your-twitter-client-secret
OAUTH_REDDIT_CLIENT_ID=your-reddit-client-id
OAUTH_REDDIT_CLIENT_SECRET=your-reddit-client-secret

# Frontend Configuration
VITE_API_URL=https://api.socialai.com
VITE_APP_URL=https://socialai.com

# Monitoring
SENTRY_DSN=https://sentry.io/your-project-dsn
ENABLE_ANALYTICS=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Staging Environment Variables

Create `.env.staging` file with staging values:

```env
# Backend Configuration
NODE_ENV=staging
PORT=3001
DATABASE_URL=postgresql://user:password@staging-db:5432/socialai
REDIS_URL=redis://staging-redis:6379
ELASTICSEARCH_URL=https://staging-es:9200
NEO4J_URI=bolt://staging-neo4j:7687
JWT_SECRET=your-staging-secret-key-here

# OAuth Credentials
OAUTH_TWITTER_CLIENT_ID=your-twitter-client-id
OAUTH_TWITTER_CLIENT_SECRET=your-twitter-client-secret
OAUTH_REDDIT_CLIENT_ID=your-reddit-client-id
OAUTH_REDDIT_CLIENT_SECRET=your-reddit-client-secret

# Frontend Configuration
VITE_API_URL=https://staging-api.socialai.com
VITE_APP_URL=https://staging.socialai.com

# Monitoring
SENTRY_DSN=https://sentry.io/your-staging-project-dsn
ENABLE_ANALYTICS=true

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json
```

## Docker Deployment

### Using Docker Compose

1. **Build Production Images**:
```bash
# Build all services for production
docker-compose -f docker-compose.yml build

# Tag images for version control
docker-compose -f docker-compose.yml build --tag socialai-backend:latest
docker-compose -f docker-compose.yml build --tag socialai-frontend:latest
docker-compose -f docker-compose.yml build --tag socialai-ai-service:latest
```

2. **Deploy with Docker Compose**:
```bash
# Use production environment file
cp .env.production .env

# Deploy to production server
docker-compose -f docker-compose.prod.yml up -d

# Check deployment status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Individual Service Deployment

#### Deploy Backend

```bash
# Build backend image
docker build -t socialai-backend:latest -f docker/backend.Dockerfile .

# Run backend container
docker run -d \
  --name socialai-backend \
  -p 3001:3001 \
  --env-file .env.production \
  --restart unless-stopped \
  --health-cmd "node src/health.js" \
  --health-interval 30s \
  socialai-backend:latest
```

#### Deploy Frontend

```bash
# Build frontend image
docker build -t socialai-frontend:latest -f docker/frontend.Dockerfile .

# Run frontend container
docker run -d \
  --name socialai-frontend \
  -p 80:80 \
  --env-file .env.production \
  --restart unless-stopped \
  socialai-frontend:latest
```

#### Deploy AI Service

```bash
# Build AI service image
docker build -t socialai-ai-service:latest -f docker/ai-service.Dockerfile .

# Run AI service container
docker run -d \
  --name socialai-ai-service \
  -p 8000:8000 \
  --env-file .env.production \
  --restart unless-stopped \
  --health-cmd "curl -f http://localhost:8000/health || exit 1" \
  --health-interval 30s \
  socialai-ai-service:latest
```

### Docker Health Checks

Ensure all services have proper health checks:

```bash
# Check backend health
curl http://localhost:3001/api/health

# Check frontend
curl http://localhost/

# Check AI service
curl http://localhost:8000/health

# Check Elasticsearch
curl http://localhost:9200/_cluster/health

# Check Redis
redis-cli ping

# Check Neo4j
curl http://localhost:7474
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl configured and connected to cluster
- Container registry access (Docker Hub, ECR, GCR)
- SSL certificates installed
- Ingress controller configured

### Namespace Creation

Apply the namespace manifest:

```bash
kubectl apply -f k8s/namespace.yaml
```

### Deploy Backend

```bash
# Apply backend deployment
kubectl apply -f k8s/backend-deployment.yaml

# Apply backend service
kubectl apply -f k8s/backend-service.yaml

# Apply backend HPA
kubectl apply -f k8s/backend-hpa.yaml

# Verify deployment
kubectl get pods -n socialai
kubectl get svc -n socialai
```

### Deploy Frontend

```bash
# Apply frontend deployment
kubectl apply -f k8s/frontend-deployment.yaml

# Apply frontend service
kubectl apply -f k8s/frontend-service.yaml

# Apply frontend HPA
kubectl apply -f k8s/frontend-hpa.yaml

# Verify deployment
kubectl get pods -n socialai
kubectl get svc -n socialai
```

### Deploy AI Service

```bash
# Apply AI service deployment
kubectl apply -f k8s/ai-service-deployment.yaml

# Apply AI service service
kubectl apply -f k8s/ai-service-service.yaml

# Verify deployment
kubectl get pods -n socialai
kubectl get svc -n socialai
```

### Apply Configuration

```bash
# Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# Apply Secrets (create from file)
kubectl create secret generic socialai-secrets \
  --from-env-file=.env.production \
  --namespace=socialai
```

### Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n socialai

# Check pod status
kubectl describe pod -n socialai <pod-name>

# Check logs
kubectl logs -n socialai <pod-name> --tail=100

# Check services
kubectl get svc -n socialai

# Check ingress
kubectl get ingress -n socialai
```

### Scaling

Horizontal Pod Autoscaler (HPA) automatically scales based on CPU/memory:

```bash
# View HPA status
kubectl get hpa -n socialai

# Manually scale deployment
kubectl scale deployment socialai-backend --replicas=5 -n socialai
```

## Monitoring Setup

### Prometheus Configuration

Prometheus is configured to scrape metrics from all services:

**Scrape Targets**:
- Backend: `http://backend:3001/metrics`
- Frontend: Exposed via ingress
- AI Service: `http://ai-service:8000/metrics`

**Metrics Collected**:
- HTTP request duration
- Request rate
- Error rate
- Response size
- CPU and memory usage
- Custom application metrics

### Grafana Dashboards

Import the following dashboards into Grafana:

1. **Application Overview**: Overall system health and performance
2. **API Performance**: Request latency, throughput, error rates
3. **Database Performance**: Query times, connection pool stats
4. **Cache Performance**: Hit rate, TTL, memory usage
5. **User Activity**: Active users, request patterns

### Alerting

AlertManager is configured with these rules:

| Alert | Condition | Severity | Action |
|--------|-----------|----------|--------|
| High Error Rate | > 5% errors for 5 min | Critical | PagerDuty |
| High Latency | P95 > 2s | Warning | Slack |
| Database Down | Connection failed | Critical | PagerDuty |
| Cache Miss Rate | < 80% hit rate | Warning | Slack |
| Pod Not Ready | Pod not ready for 5 min | Critical | PagerDuty |

## Backup and Recovery

### Database Backups

Automated daily backups are configured:

```bash
# Manual backup trigger
kubectl exec -n socialai <postgres-pod> -- pg_dump -U user socialai > backup.sql

# List backups
kubectl exec -n socialai <postgres-pod> -- ls /backups

# Restore from backup
kubectl exec -n socialai <postgres-pod> -- psql -U user -d socialai < backup.sql
```

### Neo4j Backups

```bash
# Manual backup
kubectl exec -n socialai <neo4j-pod> -- neo4j-admin backup

# Restore from backup
kubectl exec -n socialai <neo4j-pod> -- neo4j-admin load
```

### Elasticsearch Snapshots

Elasticsearch is configured with snapshot repository:

```bash
# Create snapshot
curl -X PUT "localhost:9200/_snapshot/backup_snapshot" \
  -H 'Content-Type: application/json'

# List snapshots
curl "localhost:9200/_snapshot/backup_snapshot"

# Restore from snapshot
curl -X POST "localhost:9200/_snapshot/backup_snapshot/_restore" \
  -H 'Content-Type: application/json'
```

### Disaster Recovery

In case of major failure:

1. **Assess Impact**: Determine affected services and data
2. **Notify Stakeholders**: Alert team and users about outage
3. **Initiate Recovery**: Restore from most recent backup
4. **Verify Recovery**: Test all services and data integrity
5. **Document Incident**: Create post-mortem and update procedures

## Rollback Procedures

### Using Deployment Scripts

The project includes rollback scripts:

```bash
# Rollback to previous version
./scripts/rollback.sh

# Rollback staging to previous version
./scripts/rollback.sh staging

# Rollback production to previous version
./scripts/rollback.sh production
```

### Manual Rollback Steps

If automated rollback fails:

1. **Identify Last Known Good Version**: Check deployment history
2. **Revert Code**: Git checkout to previous commit
3. **Redeploy**: Use deployment script for previous version
4. **Verify**: Run smoke tests to confirm functionality
5. **Monitor**: Watch logs and metrics for issues

### Database Rollback

```bash
# Restore database to previous state
kubectl exec -n socialai <postgres-pod> -- psql -U user -d socialai < /backups/pre-rollback.sql

# Restore Neo4j to previous state
kubectl exec -n socialai <neo4j-pod> -- neo4j-admin load /backups/neo4j-pre-rollback.dump
```

## Performance Tuning

### Production Optimizations

Ensure these settings are applied in production:

1. **Connection Pooling**: Database connection pools configured
2. **Caching**: Redis enabled with appropriate TTL
3. **Compression**: Response compression enabled
4. **Rate Limiting**: Per-user and per-IP limits configured
5. **CDN**: Static assets served via CDN
6. **Database Indexing**: All queries use proper indexes

### Load Testing Before Production

Run load tests before deploying:

```bash
# Run all load test scenarios
k6 run --env BASE_URL=https://staging-api.socialai.com loadtests/scenarios/feed-load.js
k6 run --env BASE_URL=https://staging-api.socialai.com loadtests/scenarios/auth-load.js
k6 run --env BASE_URL=https://staging-api.socialai.com loadtests/scenarios/search-load.js
k6 run --env BASE_URL=https://staging-api.socialai.com loadtests/scenarios/graph-load.js

# Run with summary output
k6 run --env BASE_URL=https://staging-api.socialai.com loadtests/scenarios/feed-load.js --summary-export=summary.json
```

### Performance Targets

Ensure these targets are met before production:

| Metric | Target | Acceptable Range |
|---------|--------|------------------|
| Feed Load Time | < 1s | 500ms - 1s |
| Graph Rendering (1000 nodes) | < 500ms | 200ms - 500ms |
| Page Load Time | < 2s | 1s - 2s |
| Search Response | < 500ms | 200ms - 500ms |
| API Response P95 | < 1s | 500ms - 1s |
| Concurrent Users | 100+ | 100 - 500 |
| Error Rate | < 1% | 0.1% - 1% |

## Security Checklist

Before deploying to production, ensure:

- [ ] All secrets are in environment variables, not in code
- [ ] SSL/TLS certificates are valid and not expiring soon
- [ ] Firewall rules restrict access to necessary ports only
- [ ] Database access is restricted to application users only
- [ ] API rate limiting is enabled
- [ ] Input validation is enabled on all endpoints
- [ ] SQL injection protection is in place
- [ ] XSS protection headers are set
- [ ] CORS is properly configured
- [ ] Security headers are set (CSP, X-Frame-Options, etc.)
- [ ] Logging is enabled for security events
- [ ] Monitoring is configured for security alerts

## Post-Deployment Verification

After deployment, verify:

1. **Health Checks**: All services report healthy
2. **Smoke Tests**: Basic functionality works (login, feed load, search)
3. **Metrics**: Prometheus is collecting data
4. **Dashboards**: Grafana dashboards show correct data
5. **Alerts**: AlertManager is configured and test alerts fire
6. **Logs**: No error messages in application logs
7. **Performance**: Load test targets are met

## Troubleshooting

### Common Deployment Issues

#### Pods Not Starting

**Problem**: Pods stuck in `Pending` or `ImagePullBackOff`

**Solution**:
```bash
# Check pod status
kubectl describe pod -n socialai <pod-name>

# Check events
kubectl get events -n socialai --sort-by='.lastTimestamp'

# Common causes:
# - Image pull failed (check image name and credentials)
# - Resource limits too low (increase requests/limits)
# - ConfigMap/Secret missing (apply configuration first)
```

#### Service Not Accessible

**Problem**: Service returns connection refused

**Solution**:
```bash
# Check service endpoints
kubectl get endpoints -n socialai

# Check pod logs
kubectl logs -n socialai <pod-name>

# Verify ingress
kubectl get ingress -n socialai

# Test from within cluster
kubectl run -it --rm debug --image=curlimages/curl -- curl http://backend:3001/api/health
```

#### High CPU/Memory Usage

**Problem**: Pods consuming excessive resources

**Solution**:
```bash
# Check resource usage
kubectl top pods -n socialai

# Check resource limits
kubectl describe pod -n socialai <pod-name> | grep -A 10 "Limits\|Requests"

# Solutions:
# - Increase resource limits in deployment
# - Optimize application code
# - Scale horizontally with HPA
# - Check for memory leaks
```

#### Database Connection Issues

**Problem**: Application cannot connect to database

**Solution**:
```bash
# Check database pod status
kubectl get pods -n socialai | grep postgres

# Check database logs
kubectl logs -n socialai <postgres-pod> --tail=50

# Test connection from pod
kubectl exec -n socialai <postgres-pod> -- psql -U user -d socialai -c "SELECT 1"

# Common causes:
# - Database pod not ready (wait for it to start)
# - Connection string incorrect (check secrets)
# - Network policies blocking (check NetworkPolicy)
# - Resource exhaustion (check limits)
```

## Support and Maintenance

### Monitoring Dashboard Access

- **Grafana**: https://grafana.socialai.com
- **Prometheus**: https://prometheus.socialai.com
- **AlertManager**: https://alertmanager.socialai.com

### Emergency Contacts

- **On-Call Engineer**: +1-555-0123 (24/7)
- **DevOps Team**: devops@socialai.com
- **Product Owner**: product@socialai.com

### Maintenance Windows

Scheduled maintenance windows:

- **Weekly**: Sunday 2:00 AM - 4:00 AM UTC
- **Monthly**: First Sunday of month, 2:00 AM - 6:00 AM UTC

Notify users at least 24 hours before maintenance via application banner.

---

For additional information, see [Architecture Documentation](./ARCHITECTURE.md).
