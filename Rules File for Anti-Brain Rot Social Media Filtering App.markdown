# Rules File for Anti-Brain Rot Social Media Filtering App

## Purpose
Define coding standards, best practices, and constraints for the social media filtering app, ensuring consistency, privacy, scalability, and robust support for RSS feeds, graph navigation, recommendations, and anti-brain rot content curation.

## Coding Standards
1. **Languages**: TypeScript (React, Node.js), Python (FastAPI, AI).
2. **Structure**: Monorepo with `frontend`, `backend`, `ai` as per file structure.
3. **Naming**: CamelCase (TypeScript, e.g., `fetchFeed`), snake_case (Python, e.g., `parse_rss`).
4. **Documentation**: JSDoc (TypeScript), docstrings (Python), Swagger/OpenAPI in `docs/api.md`.

## Best Practices
1. **Modularity**: Independent microservices (e.g., `graph/graphService.ts`), dependency injection.
2. **Error Handling**: Try-catch for APIs, handle rate limits for Twitter/X, Reddit, and RSS, log with `utils/logger.ts`.
3. **Performance**: <1s feed load, <500ms graph rendering, <2s page load, <2s entity extraction.
4. **Testing**: Jest (TypeScript), Pytest (Python), >80% coverage in `tests/unit`, load testing for 100 users in `tests/performance`.
5. **Version Control**: Git, feature branches (e.g., `feature/rss-integration`), conventional commits.

## Constraints
1. **Privacy**: Only OAuth and Hacker News RSS for external APIs. End-to-end encryption.
2. **Self-Hosting**: Docker/Kubernetes, Linux (Ubuntu 22.04+).
3. **Scalability**: Support 100+ users, horizontal scaling via Kubernetes.
4. **Cross-Platform**: Mobile-friendly, test on Chrome, Firefox, Safari, iOS/Android.
5. **Resources**: GPU (12GB+ VRAM), CPU fallback.

## AI Model Integration
1. **Llama (Ollama)**: Local deployment in `ai/models/llama.py` for filtering and summarization.
2. **Sentence-BERT**: Local deployment in `ai/models/sentence_bert.py` for recommendation embeddings.
3. **NER**: Hugging Face NER in `ai/models/ner.py` for entity extraction.
4. **TensorFlow**: Collaborative filtering in `ai/pipelines/recommendation.py`.

## Specific Features
1. **RSS Feed Integration**:
   - Parse Hacker News RSS in `ai/utils/rss_parser.py`, extract metadata and entities, process in <2s.
   - Store in PostgreSQL (`models/Feed.ts`) and Neo4j.
2. **Graph Navigation**:
   - Store relationships in Neo4j via `graph/graphService.ts`, render in `GraphView.tsx` with D3.js, <500ms for 1,000 nodes.
3. **Recommender System**:
   - Implement hybrid recommender in `recommendation/recommendationService.ts` and `pipelines/recommendation.py`, <1s response.
   - Display in `RecommendationList.tsx`.
4. **Content Filtering**:
   - Use Llama in `endpoints/filter.py` to prioritize anti-brain rot content, >80% relevance.
5. **Integration**:
   - Save items to main app via API in `feed/feedService.ts`.

## Deployment
1. **Development**: `docker-compose.yml` for local setup.
2. **Production**: Kubernetes manifests in `docker/kubernetes`.
3. **CI/CD**: GitHub Actions, ESLint/Pylint in CI pipeline.

## Quality Assurance
1. **Code Quality**: ESLint, Pylint, code reviews.
2. **Performance**: <2s page load, <1s feed load, <500ms graph, <2s entity extraction.
3. **UX**: Intuitive Flipboard-like UI, tooltips for graph/recommendations, usability testing with 10+ users.

## Notes for AI IDE
- Adhere to file structure and rules.
- Prioritize RSS parsing, graph navigation, recommendations, and anti-brain rot filtering.
- Include setup scripts in `scripts`.
- Provide sample data in `tests` for feeds, graph, and recommendations.