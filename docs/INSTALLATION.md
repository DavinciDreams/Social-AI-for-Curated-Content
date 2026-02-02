# Installation Guide

This guide will help you set up the Social AI for Curated Content application for development.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Environment Setup](#development-environment-setup)
- [Docker Setup](#docker-setup)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

- **Node.js** (v18 or higher)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`

- **Python** (v3.9 or higher)
  - Download from [python.org](https://www.python.org/downloads/)
  - Verify installation: `python --version`

- **Docker** (v20.10 or higher)
  - Download from [docker.com](https://www.docker.com/get-started/)
  - Verify installation: `docker --version`

- **Docker Compose** (v2.20 or higher)
  - Verify installation: `docker-compose --version`

- **Git** (v2.30 or higher)
  - Verify installation: `git --version`

### Required Services

- **Elasticsearch** (v8.x)
  - For search functionality
  - Can be run via Docker or installed locally

- **Redis** (v7.x)
  - For caching and session management
  - Can be run via Docker or installed locally

- **Neo4j** (v5.x)
  - For knowledge graph functionality
  - Can be run via Docker or installed locally

### Optional Services

- **PostgreSQL** (v15 or higher)
  - For persistent data storage
  - Can be run via Docker or installed locally

## Development Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/Social-AI-for-Curated-Content.git
cd Social-AI-for-Curated-Content
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 4. Install AI Service Dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

### 5. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
# For backend
cp backend/.env.example backend/.env

# For frontend
cp frontend/.env.example frontend/.env

# For Docker
cp .env.docker .env
```

Edit the `.env` files with your actual values:

```env
# Backend (.env)
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/socialai
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
NEO4J_URI=bolt://localhost:7687
JWT_SECRET=your-secret-key-here
OAUTH_TWITTER_CLIENT_ID=your-twitter-client-id
OAUTH_TWITTER_CLIENT_SECRET=your-twitter-client-secret
OAUTH_REDDIT_CLIENT_ID=your-reddit-client-id
OAUTH_REDDIT_CLIENT_SECRET=your-reddit-client-secret

# Frontend (.env)
VITE_API_URL=http://localhost:3001
VITE_APP_URL=http://localhost:5173
```

### 6. Start Services

#### Option A: Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option B: Manual Setup

Start each service individually:

```bash
# Terminal 1: Start Elasticsearch
docker run -d -p 9200:9200 -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.13.0

# Terminal 2: Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Terminal 3: Start Neo4j
docker run -d -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/secret \
  -e NEO4J_PLUGINS=["apoc"] \
  neo4j:5.15.0

# Terminal 4: Start Backend
cd backend
npm run dev

# Terminal 5: Start Frontend
cd frontend
npm run dev

# Terminal 6: Start AI Service
cd ai-service
python main.py
```

## Docker Setup

### Quick Start with Docker Compose

The project includes a `docker-compose.yml` file for easy setup:

```bash
# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs for a specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs ai-service
```

### Docker Services

| Service | Port | Description |
|----------|-------|-------------|
| Backend | 3001 | Express API server |
| Frontend | 5173 | Vite dev server |
| AI Service | 8000 | FastAPI server |
| Elasticsearch | 9200 | Search engine |
| Redis | 6379 | Cache server |
| Neo4j | 7474, 7687 | Graph database |

### Docker Volumes

The following volumes are created for data persistence:

- `es_data` - Elasticsearch data
- `redis_data` - Redis data
- `neo4j_data` - Neo4j data
- `pg_data` - PostgreSQL data (if used)

## Environment Configuration

### Backend Configuration

| Variable | Required | Description | Default |
|----------|-----------|-------------|---------|
| `NODE_ENV` | Yes | Environment (development/staging/production) | `development` |
| `PORT` | Yes | Server port | `3001` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | - |
| `REDIS_URL` | Yes | Redis connection string | - |
| `ELASTICSEARCH_URL` | Yes | Elasticsearch URL | - |
| `NEO4J_URI` | Yes | Neo4j connection string | - |
| `JWT_SECRET` | Yes | JWT signing secret | - |
| `OAUTH_TWITTER_CLIENT_ID` | Yes | Twitter OAuth client ID | - |
| `OAUTH_TWITTER_CLIENT_SECRET` | Yes | Twitter OAuth secret | - |
| `OAUTH_REDDIT_CLIENT_ID` | Yes | Reddit OAuth client ID | - |
| `OAUTH_REDDIT_CLIENT_SECRET` | Yes | Reddit OAuth secret | - |

### Frontend Configuration

| Variable | Required | Description | Default |
|----------|-----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API URL | `http://localhost:3001` |
| `VITE_APP_URL` | Yes | Frontend application URL | `http://localhost:5173` |

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use`

**Solution**: 
```bash
# Find process using the port
lsof -i :3001  # On Linux/Mac
netstat -ano | findstr :3001  # On Windows

# Kill the process
kill -9 <PID>
```

#### 2. Database Connection Failed

**Problem**: `Error: connect ECONNREFUSED` or `Connection refused`

**Solution**:
- Ensure database services are running: `docker-compose ps`
- Check connection strings in `.env` file
- Verify firewall settings
- Check database logs: `docker-compose logs postgres`

#### 3. Elasticsearch Connection Failed

**Problem**: `Error: Connection refused` or `No Living connections`

**Solution**:
- Ensure Elasticsearch is running: `docker-compose ps`
- Check Elasticsearch is ready: `curl http://localhost:9200/_cluster/health`
- Wait for Elasticsearch to fully start (can take 30-60 seconds)
- Check Elasticsearch logs: `docker-compose logs elasticsearch`

#### 4. Redis Connection Failed

**Problem**: `Error: Redis connection failed`

**Solution**:
- Ensure Redis is running: `docker-compose ps`
- Test Redis connection: `redis-cli ping`
- Check Redis logs: `docker-compose logs redis`

#### 5. Neo4j Connection Failed

**Problem**: `Error: Neo4j connection failed`

**Solution**:
- Ensure Neo4j is running: `docker-compose ps`
- Check Neo4j browser: http://localhost:7474
- Verify Neo4j URI in `.env` matches container settings
- Check Neo4j logs: `docker-compose logs neo4j`

#### 6. Module Not Found

**Problem**: `Error: Cannot find module 'xxx'`

**Solution**:
```bash
# Clear node_modules and reinstall
cd backend
rm -rf node_modules package-lock.json
npm install

# Or for frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 7. Build Errors

**Problem**: TypeScript compilation errors

**Solution**:
```bash
# Check TypeScript version
npx tsc --version

# Run TypeScript in watch mode for development
npm run dev

# Or check specific file
npx tsc --noEmit
```

#### 8. Docker Build Fails

**Problem**: Docker build fails with error

**Solution**:
```bash
# Clean Docker build cache
docker-compose build --no-cache

# Rebuild specific service
docker-compose up -d --build backend

# Check Docker logs
docker-compose logs backend
```

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/your-org/Social-AI-for-Curated-Content/issues)
2. Review the [API Documentation](./API.md)
3. Check service logs in Docker: `docker-compose logs -f`
4. Enable debug mode by setting `NODE_ENV=development`

### Verification

After installation, verify everything is working:

```bash
# Check backend health
curl http://localhost:3001/api/health

# Check frontend
curl http://localhost:5173

# Check AI service
curl http://localhost:8000/health

# Check Elasticsearch
curl http://localhost:9200/_cluster/health

# Check Redis
redis-cli ping
```

## Next Steps

After successful installation:

1. Read the [User Guide](./USER_GUIDE.md) to learn how to use the application
2. Review the [API Documentation](./API.md) for integration details
3. Check the [Deployment Guide](./DEPLOYMENT.md) for production setup
