# Architecture Documentation

This document describes the system architecture, technology stack, database schemas, and data flow for Social AI for Curated Content.

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Database Schemas](#database-schemas)
- [Service Interactions](#service-interactions)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Caching Strategy](#caching-strategy)
- [Monitoring and Logging](#monitoring-and-logging)

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                      │
│                    (React + Vite + Tailwind)              │
└────────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway                        │
│                   (Express + Compression)                   │
└────────────────────────────┬────────────────────────────────┘
                         │
         ┌──────────────┼──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Feed     │  │ Search   │  │ Graph    │  │ AI       │
    │ Service  │  │ Service  │  │ Service  │  │ Service  │
    └──────────┘  └──────────┘  └──────────┘  └──────────┘
         │              │              │              │
         ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Auth     │  │ Saved    │  │ Recom-   │
    │ Service  │  │ Service  │  │ mendation │
    └──────────┘  └──────────┘  └──────────┘
         │              │              │
         ▼              ▼              ▼
    ┌────────────────────────────────────────────────────┐
    │         External Services                    │
    │  Twitter API  │ Reddit API  │ OAuth     │
    └─────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────────────┐
    │              Data Layer                        │
    │  PostgreSQL │ Elasticsearch │ Redis │ Neo4j  │
    └─────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| Frontend | User interface, state management, API client |
| API Gateway | Request routing, authentication, rate limiting |
| Feed Service | Content aggregation, filtering, pagination |
| Search Service | Full-text search, autocomplete, filtering |
| Graph Service | Knowledge graph management, entity relationships |
| AI Service | Content analysis, scoring, recommendations |
| Auth Service | OAuth authentication, token management |
| Saved Service | User content bookmarking |
| Recommendation Service | Personalized content suggestions |
| PostgreSQL | Persistent data storage, user data |
| Elasticsearch | Search index, content metadata |
| Redis | Response caching, session management |
| Neo4j | Graph data storage, entity relationships |

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool and dev server |
| Tailwind CSS | 3.x | Styling framework |
| React Query | 4.x | Data fetching and caching |
| Axios | 1.x | HTTP client |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20.x | Runtime environment |
| TypeScript | 5.x | Type safety |
| Express | 4.x | Web framework |
| Compression | 1.7.x | Response compression |
| JWT | 9.x | Authentication tokens |
| Passport.js | 0.6.x | OAuth strategies |

### AI Service

| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11+ | Runtime environment |
| FastAPI | 0.100+ | Web framework |
| OpenAI | Latest | AI models and embeddings |
| scikit-learn | 1.x | Machine learning |
| NumPy | 1.x | Numerical computing |

### Data Layer

| Technology | Version | Purpose |
|-----------|---------|---------|
| PostgreSQL | 15+ | Primary database |
| Elasticsearch | 8.x | Search engine |
| Redis | 7.x | Caching layer |
| Neo4j | 5.x | Graph database |

### Infrastructure

| Technology | Version | Purpose |
|-----------|---------|---------|
| Docker | 24.x | Containerization |
| Docker Compose | 2.x | Multi-container orchestration |
| Kubernetes | 1.28+ | Container orchestration (production) |
| Prometheus | 2.45+ | Metrics collection |
| Grafana | 10.x | Visualization |
| Nginx | 1.25+ | Reverse proxy, load balancing |

## Database Schemas

### PostgreSQL Schema

#### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    oauth_provider VARCHAR(50) NOT NULL,
    oauth_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
```

#### Feeds Table

```sql
CREATE TABLE feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    link VARCHAR(2048) NOT NULL,
    source VARCHAR(50) NOT NULL,
    pub_date TIMESTAMP WITH TIME ZONE,
    ai_score DECIMAL(3,2) DEFAULT 0.5,
    keywords TEXT[],
    entities JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feeds_source ON feeds(source);
CREATE INDEX idx_feeds_pub_date ON feeds(pub_date DESC);
CREATE INDEX idx_feeds_ai_score ON feeds(ai_score DESC);
CREATE INDEX idx_feeds_keywords ON feeds USING GIN(keywords);
```

#### Saved Items Table

```sql
CREATE TABLE saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, feed_id)
);

CREATE INDEX idx_saved_items_user ON saved_items(user_id);
CREATE INDEX idx_saved_items_created ON saved_items(created_at DESC);
```

### Elasticsearch Index

#### Feeds Index Mapping

```json
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "english"
      },
      "content": {
        "type": "text",
        "analyzer": "english"
      },
      "source": {
        "type": "keyword"
      },
      "pubDate": {
        "type": "date",
        "format": "strict_date_optional_time||epoch_millis"
      },
      "aiScore": {
        "type": "float"
      },
      "keywords": {
        "type": "keyword"
      },
      "entities": {
        "type": "keyword"
      }
    }
  },
  "settings": {
    "index": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "refresh_interval": "30s"
    }
  }
}
```

### Neo4j Schema

#### Node Labels

```cypher
// Person node
(:Person {
  id: string,
  name: string,
  email: string,
  avatarUrl: string,
  createdAt: datetime
})

// Topic node
(:Topic {
  id: string,
  name: string,
  description: string,
  score: float,
  createdAt: datetime
})

// Organization node
(:Organization {
  id: string,
  name: string,
  website: string,
  createdAt: datetime
})

// Event node
(:Event {
  id: string,
  name: string,
  description: string,
  date: datetime,
  createdAt: datetime
})
```

#### Relationship Types

```cypher
// MENTIONS relationship
(:Person)-[:MENTIONS]->(:Topic)
(:Person)-[:MENTIONS]->(:Organization)
(:Person)-[:MENTIONS]->(:Event)

// RELATED_TO relationship
(:Topic)-[:RELATED_TO]->(:Topic)
(:Topic)-[:RELATED_TO]->(:Organization)

// CONTAINS relationship
(:Feed)-[:CONTAINS]->(:Person)
(:Feed)-[:CONTAINS]->(:Topic)
(:Feed)-[:CONTAINS]->(:Organization)

// PARTICIPATED_IN relationship
(:Person)-[:PARTICIPATED_IN]->(:Event)
(:Organization)-[:PARTICIPATED_IN]->(:Event)

// AUTHORED_BY relationship
(:Feed)-[:AUTHORED_BY]->(:Person)
(:Feed)-[:AUTHORED_BY]->(:Organization)
```

## Service Interactions

### Request Flow

```
1. User makes request from frontend
2. Frontend sends request to API gateway
3. API gateway validates JWT token
4. API gateway routes to appropriate service
5. Service processes request
6. Service queries data layer as needed
7. Service returns response
8. Response flows back through API gateway
9. Frontend receives and displays response
```

### Service Communication

| Service | Communicates With | Protocol |
|----------|------------------|----------|
| Frontend | API Gateway | HTTP/REST |
| API Gateway | All Services | HTTP/REST |
| Feed Service | PostgreSQL, Elasticsearch | SQL, HTTP |
| Search Service | Elasticsearch | HTTP |
| Graph Service | Neo4j | Bolt Protocol |
| AI Service | OpenAI API | HTTPS |
| Auth Service | External OAuth APIs | OAuth 2.0 |
| Saved Service | PostgreSQL | SQL |
| Recommendation Service | PostgreSQL, Elasticsearch | SQL, HTTP |
| All Services | Redis | RESP |

### Caching Layer

```
┌─────────────────────────────────────────────────────────┐
│                    Redis Cache Layer                      │
│  - Response caching (TTL: 5-10 min)           │
│  - Session storage (TTL: 24 hours)               │
│  - Rate limiting (TTL: 1 minute)                │
│  - Request deduplication (TTL: 30 seconds)        │
└─────────────────────────────────────────────────────────┘
         │
         ┌──────────────┼──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Feed     │  │ Search   │  │ Graph    │  │ AI       │
    │ Service  │  │ Service  │  │ Service  │  │ Service  │
    └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

## Data Flow

### Feed Aggregation Flow

```
1. Twitter API → Feed Service
2. Feed Service → Process content (AI scoring)
3. Feed Service → Store in PostgreSQL
4. Feed Service → Index in Elasticsearch
5. Feed Service → Cache in Redis

6. Reddit API → Feed Service
7. Feed Service → Process content (AI scoring)
8. Feed Service → Store in PostgreSQL
9. Feed Service → Index in Elasticsearch
10. Feed Service → Cache in Redis

11. Frontend → Feed Service (GET /feeds)
12. Feed Service → Check Redis cache
13. If cache hit → Return cached data
14. If cache miss → Query PostgreSQL
15. Return data to frontend
```

### Search Flow

```
1. Frontend → Search Service (GET /search?query=xxx)
2. Search Service → Check Redis cache
3. If cache hit → Return cached results
4. If cache miss → Query Elasticsearch
5. Elasticsearch → Return matching documents
6. Search Service → Cache results in Redis
7. Return data to frontend
```

### Authentication Flow

```
1. Frontend → Auth Service (GET /auth/twitter/login)
2. Auth Service → Redirect to Twitter OAuth
3. User → Authorize application on Twitter
4. Twitter → Redirect back with OAuth code
5. Auth Service → Exchange code for access token
6. Auth Service → Fetch user profile from Twitter
7. Auth Service → Create user in PostgreSQL
8. Auth Service → Generate JWT token
9. Auth Service → Return token to frontend
10. Frontend → Store token in localStorage
11. Frontend → Include token in subsequent requests
```

### Graph Flow

```
1. Frontend → Graph Service (GET /graph)
2. Graph Service → Check Redis cache
3. If cache hit → Return cached graph data
4. If cache miss → Query Neo4j
5. Neo4j → Return nodes and relationships
6. Graph Service → Cache in Redis
7. Return data to frontend
8. Frontend → Render graph visualization
```

### Recommendation Flow

```
1. Recommendation Service → Query PostgreSQL for user history
2. Recommendation Service → Query Elasticsearch for trending content
3. Recommendation Service → Call AI Service for scoring
4. AI Service → Score and rank content
5. Recommendation Service → Return recommendations to frontend
```

## Security Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend                             │
│  - Stores JWT token in localStorage                │
│  - Includes token in Authorization header            │
└────────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  API Gateway                          │
│  - Validates JWT on each request                 │
│  - Extracts user context from token               │
│  - Rate limiting per user/IP                   │
└────────────────────────────┬────────────────────────────┘
                         │
                         ▼
         ┌──────────────┼──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Feed     │  │ Search   │  │ Graph    │
    │ Service  │  │ Service  │  │ Service  │
    └──────────┘  └──────────┘  └──────────┘
```

### Data Protection

| Protection | Implementation |
|-----------|----------------|
| SQL Injection | Parameterized queries, input validation |
| XSS | Content sanitization, CSP headers |
| CSRF | JWT tokens, SameSite cookies |
| Rate Limiting | Redis-based rate limiting |
| Input Validation | Zod schemas on all inputs |
| Encryption | TLS in transit, at-rest encryption for secrets |

## Caching Strategy

### Cache Tiers

| Tier | Storage | TTL | Purpose |
|-------|---------|-----|---------|
| L1 | In-memory (service) | 30 seconds | Request deduplication |
| L2 | Redis | 5 minutes | Hot API responses |
| L3 | Redis | 10 minutes | Warm API responses |
| L4 | Redis | 1 hour | Cold API responses |

### Cache Keys

```
Pattern: {service}:{operation}:{identifier}:{version}

Examples:
- feeds:fetch:all:v1
- search:query:ai:v1
- graph:nodes:all:v1
- auth:validate:token:user_123:v1
```

### Cache Invalidation

| Trigger | Invalidation Strategy |
|---------|----------------------|
| Content update | Invalidate specific feed item cache |
| User action | Invalidate user-specific caches |
| Time-based | Automatic expiration by TTL |
| Manual | Admin endpoint for cache clearing |

### Cache Performance

- **Hit Rate Target**: > 80% for hot data
- **Memory Usage**: < 256MB for Redis instance
- **Latency**: < 5ms for cache operations

## Monitoring and Logging

### Metrics Collected

| Metric | Type | Source | Frequency |
|---------|------|--------|-----------|
| HTTP Request Duration | Histogram | API Gateway | Every request |
| Request Rate | Gauge | API Gateway | Every 10s |
| Error Rate | Counter | API Gateway | Every error |
| Cache Hit Rate | Gauge | All Services | Every cache operation |
| Database Query Time | Histogram | All Services | Every query |
| Active Users | Gauge | API Gateway | Every minute |
| CPU Usage | Gauge | All Services | Every 10s |
| Memory Usage | Gauge | All Services | Every 10s |

### Logging Levels

| Level | Use Cases |
|-------|-----------|
| ERROR | Critical errors, exceptions |
| WARN | Warnings, degraded performance |
| INFO | Normal operations, state changes |
| DEBUG | Detailed debugging information |

### Alert Rules

| Alert | Condition | Severity |
|--------|-----------|----------|
| High Error Rate | error_rate > 5% for 5 min | Critical |
| High Latency | p95_latency > 2s | Warning |
| Database Down | db_connection_failed > 0 | Critical |
| Cache Failure | cache_hit_rate < 50% | Warning |
| Pod Not Ready | pod_ready = 0 | Critical |

---

For deployment details, see [Deployment Guide](./DEPLOYMENT.md).
For API details, see [API Documentation](./API.md).
