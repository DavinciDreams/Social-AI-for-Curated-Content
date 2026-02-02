# Social AI for Curated Content

A self-hosted, Flipboard-like web application that aggregates social media feeds and filters out "brain rot" using local AI.

## Features

- **🧠 AI-Powered Content Filtering**: Automatically scores and ranks content based on relevance, quality, and engagement
- **📱 Multi-Platform Support**: Aggregate feeds from Twitter, Reddit, and more
- **🕸️ Knowledge Graph**: Visualize connections between topics, people, and content
- **🔍 Smart Search**: Full-text search with autocomplete and advanced filtering
- **⭐ Personalized Recommendations**: AI-driven content suggestions based on your interests
- **🔖 Save for Later**: Bookmark important content to your personal collection
- **🎨 Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **🔒 Secure Authentication**: OAuth-based login with secure JWT tokens
- **📊 Performance Optimized**: Caching, pagination, and lazy loading for fast response times

## Architecture

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **AI Service**: Python, FastAPI, Ollama (Llama 3)
- **Database**: PostgreSQL (Metadata), Neo4j (Graph), Redis (Caching)
- **Search**: Elasticsearch
- **Infrastructure**: Docker, Docker Compose, Kubernetes

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js v18+
- Python 3.10+
- NVIDIA GPU (Recommended for local LLM)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/Social-AI-for-Curated-Content.git
cd Social-AI-for-Curated-Content

# Start all services with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:5173
```

For detailed installation instructions, see [Installation Guide](docs/INSTALLATION.md).

### Development Setup

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd frontend && npm install

# Install AI service dependencies
cd ai-service && pip install -r requirements.txt

# Start development servers
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: AI Service
cd ai-service && python main.py
```

## Documentation

- **[Installation Guide](docs/INSTALLATION.md)** - Complete setup instructions for development and production
- **[User Guide](docs/USER_GUIDE.md)** - Feature descriptions and usage instructions
- **[API Documentation](docs/API.md)** - Complete API reference for integrations
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment procedures
- **[Architecture Documentation](docs/ARCHITECTURE.md)** - System design and data flow

## Project Structure

```
Social-AI-for-Curated-Content/
├── ai-service/              # AI service for content analysis
│   ├── embeddings.py      # Text embedding generation
│   ├── entities.py        # Entity extraction
│   ├── main.py           # FastAPI application
│   └── requirements.txt    # Python dependencies
├── backend/               # Express.js backend API
│   ├── src/
│   │   ├── services/     # Business logic
│   │   │   ├── auth/     # Authentication
│   │   │   ├── feed/     # Feed aggregation
│   │   │   ├── search/   # Search functionality
│   │   │   ├── graph/     # Knowledge graph
│   │   │   ├── saved/     # Saved items
│   │   │   └── recommendation/  # AI recommendations
│   │   ├── middleware/      # Express middleware
│   │   ├── models/         # Data models
│   │   └── config/         # Configuration
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── utils/        # Utility functions
│   │   └── types/        # TypeScript types
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docs/                  # Documentation
│   ├── INSTALLATION.md
│   ├── USER_GUIDE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── ARCHITECTURE.md
├── loadtests/             # Load testing scenarios
│   ├── k6-config.js
│   └── scenarios/
│       ├── feed-load.js
│       ├── auth-load.js
│       ├── search-load.js
│       └── graph-load.js
├── docker-compose.yml       # Multi-container orchestration
├── .env.example            # Environment variable template
└── README.md              # This file
```

## Configuration

Environment variables are configured via `.env` files. See [Installation Guide](docs/INSTALLATION.md#environment-configuration) for details.

### Required Environment Variables

```env
# Backend
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/socialai
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
NEO4J_URI=bolt://localhost:7687
JWT_SECRET=your-secret-key-here

# Frontend
VITE_API_URL=http://localhost:3001
VITE_APP_URL=http://localhost:5173
```

### Optional Environment Variables

```env
# OAuth Credentials
OAUTH_TWITTER_CLIENT_ID=your-twitter-client-id
OAUTH_TWITTER_CLIENT_SECRET=your-twitter-client-secret
OAUTH_REDDIT_CLIENT_ID=your-reddit-client-id
OAUTH_REDDIT_CLIENT_SECRET=your-reddit-client-secret

# AI Service (if using external LLM)
OPENAI_API_KEY=your-openai-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
```

## Development

### Running Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Run load tests
cd loadtests && k6 run scenarios/feed-load.js
```

### Code Quality

```bash
# TypeScript check
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Lint
cd backend && npm run lint
cd frontend && npm run lint
```

## Performance

The application is optimized for production:

- **Caching**: Redis-based response caching with configurable TTL
- **Pagination**: Server-side pagination for large datasets
- **Compression**: HTTP response compression
- **Lazy Loading**: Native browser lazy loading for images
- **Request Deduplication**: Prevent duplicate API calls
- **Connection Pooling**: Optimized database connection management

### Performance Targets

| Metric | Target |
|---------|--------|
| Feed Load Time | < 1s |
| Graph Rendering (1000 nodes) | < 500ms |
| Page Load Time | < 2s |
| Search Response | < 500ms |
| API Response Time P95 | < 1s |
| Concurrent Users | 100+ |

## Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style (TypeScript for backend, camelCase for variables)
- Write meaningful commit messages
- Add tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting PR

### Code of Conduct

- Be respectful and inclusive
- Focus on what is best for the community
- Constructive feedback and collaboration

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: See [docs/](docs/) for detailed guides
- **Issues**: Report bugs via [GitHub Issues](https://github.com/your-org/Social-AI-for-Curated-Content/issues)
- **Discussions**: Join discussions at [GitHub Discussions](https://github.com/your-org/Social-AI-for-Curated-Content/discussions)

## Roadmap

- [ ] Multi-language support
- [ ] Mobile app (iOS/Android)
- [ ] Dark mode
- [ ] Advanced filtering options
- [ ] Export functionality
- [ ] Social sharing
- [ ] More AI model options

---

Built with ❤️ to help you discover high-quality content and avoid information overload.
