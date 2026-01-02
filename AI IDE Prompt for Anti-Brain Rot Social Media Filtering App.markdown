# AI IDE Prompt for Anti-Brain Rot Social Media Filtering App

## Objective
Generate a self-hosted, Flipboard-like web application from scratch to aggregate and filter social media feeds (Twitter/X, Reddit) and RSS feeds (Hacker News) using an LLM, preventing doomscrolling and brain rot by curating high-quality, intellectually stimulating content. Include an interactive knowledge graph for content navigation, a recommender system for relevant suggestions, and integration with a main knowledge management app for saving content. Ensure privacy, scalability, and cross-platform compatibility, using Llama for filtering and minimal external dependencies.

## Requirements
- **Core Features**:
  - **Feed Aggregation**:
    - Aggregate posts from Twitter/X and Reddit via APIs.
    - Ingest Hacker News RSS feed (https://news.ycombinator.com/rss), parsing metadata (title, link, date, comments) and content.
  - **Content Filtering**:
    - Use Llama to filter content (>80% relevance to user interests), prioritizing high-value, anti-brain rot content (e.g., in-depth articles, technical discussions) over low-value posts (e.g., clickbait, memes).
    - Extract entities (e.g., authors, topics, dates) from feeds for graph navigation and integration.
  - **UI**:
    - Flipboard-like interface for paging through curated content, with cards showing title, source, summary, and save button.
    - Interactive knowledge graph view (Neo4j-based, D3.js-visualized) to navigate connections (e.g., Hacker News post to tweet).
    - Sidebar for feed sources, graph toggle, and recommendations.
  - **Graph Navigation**:
    - Visualize relationships between curated content (e.g., Hacker News article → Reddit thread → tweet) in an interactive graph.
    - Support zoom, pan, and node clicks to view details or related items.
  - **Recommender System**:
    - Suggest relevant content (e.g., Hacker News articles, tweets) using a hybrid approach (TensorFlow collaborative filtering, Sentence-BERT content-based).
    - Prioritize anti-brain rot criteria (depth, credibility, user interests).
    - Display suggestions in a dedicated UI section.
  - **Integration**:
    - Save curated items (tweets, Reddit posts, Hacker News articles) to the main knowledge management app’s knowledge base via API, including entities and relationships.
  - **Authentication**:
    - OAuth-based single source of truth for Twitter/X, Reddit accounts.
- **Non-Functional Requirements**:
  - Self-hosted with end-to-end encryption.
  - Scalable for 100+ users.
  - Cross-platform (web, mobile-friendly, <2s page load).
  - Privacy-focused: only OAuth and Hacker News RSS for external dependencies.
  - Modular microservices architecture.
  - GPU acceleration for AI (12GB+ VRAM).

## Tech Stack
- **Frontend**: React (v18), TypeScript, Tailwind CSS, D3.js (graph visualization).
- **Backend**: Node.js (v20), Express, FastAPI (AI), Python (AI processing).
- **Database**: PostgreSQL (metadata), Elasticsearch (search), Neo4j (knowledge graph), FAISS (vector search for recommendations).
- **AI/ML**:
  - Llama (Ollama) for content filtering and summarization.
  - Hugging Face: Sentence-BERT (embeddings for recommendations), NER (entity extraction).
  - TensorFlow (collaborative filtering for recommendations).
- **Deployment**: Docker, Kubernetes, Nginx, Let’s Encrypt.

## File Structure
```plaintext
social-media-filtering-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Feed/FeedCard.tsx, FeedPager.tsx
│   │   │   ├── Graph/GraphView.tsx, GraphControls.tsx
│   │   │   ├── Auth/Login.tsx
│   │   │   ├── Sidebar/Sidebar.tsx
│   │   │   ├── Recommendations/RecommendationList.tsx
│   │   ├── hooks/useFeed.ts, useGraph.ts, useRecommendations.ts
│   │   ├── pages/Home.tsx, GraphPage.tsx
│   │   ├── styles/tailwind.css
│   │   ├── utils/d3Utils.ts
│   │   ├── App.tsx, index.tsx
│   ├── public/
│   ├── package.json, tsconfig.json, webpack.config.js
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── feed/feedController.ts, feedService.ts, feedRouter.ts
│   │   │   ├── filter/filterController.ts, filterService.ts
│   │   │   ├── auth/authController.ts, authService.ts
│   │   │   ├── graph/graphController.ts, graphService.ts
│   │   │   ├── recommendation/recommendationController.ts, recommendationService.ts
│   │   ├── middleware/auth.ts, errorHandler.ts
│   │   ├── models/Feed.ts, Entity.ts
│   │   ├── utils/logger.ts
│   │   ├── server.ts
│   ├── package.json, tsconfig.json
├── ai/
│   ├── src/
│   │   ├── endpoints/filter.py, entity.py, recommend.py
│   │   ├── models/llama.py, sentence_bert.py
│   │   ├── pipelines/recommendation.py
│   │   ├── utils/feed_parser.py, rss_parser.py
│   │   ├── main.py
│   ├── requirements.txt, Dockerfile
├── docker/
│   ├── docker-compose.yml
│   ├── kubernetes/deployment.yml, service.yml
│   ├── nginx.conf
├── scripts/setup_models.sh, setup_db.sh
├── tests/unit/frontend/, backend/, ai/
├── tests/integration/, performance/
├── docs/installation.md, user_guide.md, api.md
├── .gitignore, README.md, package.json, tsconfig.json
```

## Architecture
- **Frontend**: React SPA with Flipboard-like feed (`FeedCard.tsx`), graph view (`GraphView.tsx`), and recommendation list (`RecommendationList.tsx`).
- **Backend**: Microservices for feed aggregation (`feedService.ts`), filtering (`filterService.ts`), graph management (`graphService.ts`), recommendations (`recommendationService.ts`), and authentication (`authService.ts`).
- **AI**: FastAPI endpoints for filtering (`filter.py`), entity extraction (`entity.py`), and recommendations (`recommend.py`).
- **Data Flow**:
  - Fetch Twitter/X, Reddit, and Hacker News RSS feeds via `feedService.ts`.
  - Filter with Llama in `filter.py`, extract entities with NER in `entity.py`.
  - Store metadata in PostgreSQL, index in Elasticsearch, relationships in Neo4j, vectors in FAISS.
  - Generate recommendations with `recommendation.py` using TensorFlow and Sentence-BERT.
  - Save items to main app via API.
- **Security**: OAuth 2.0, HTTPS, encryption at rest.

## Implementation Instructions
1. **Initialize Project**:
   - Create monorepo with file structure above.
   - Setup `package.json` for frontend, backend, ai.
   - Configure TypeScript, Tailwind CSS, Webpack in `frontend`.
   - Initialize FastAPI in `ai` with `requirements.txt`.
   - Create Docker Compose for PostgreSQL, Elasticsearch, Neo4j, FAISS.
   - Generate Kubernetes manifests in `docker/kubernetes`.
2. **Frontend**:
   - Implement `Feed/FeedCard.tsx` for feed items (title, source, summary, save button), `FeedPager.tsx` for pagination.
   - Build `Graph/GraphView.tsx` with D3.js for interactive graph, `GraphControls.tsx` for zoom/pan.
   - Create `Recommendations/RecommendationList.tsx` for suggested content.
   - Develop `Auth/Login.tsx` for OAuth login.
   - Design `Sidebar/Sidebar.tsx` for navigation (feed, graph, recommendations).
3. **Backend**:
   - Implement `feed/feedService.ts` to fetch Twitter/X, Reddit, and Hacker News RSS feeds.
   - Build `filter/filterService.ts` to call Llama for filtering.
   - Create `graph/graphService.ts` for Neo4j queries and relationship management.
   - Develop `recommendation/recommendationService.ts` for TensorFlow/Sentence-BERT recommendations.
   - Add `auth/authService.ts` for OAuth.
4. **AI**:
   - Implement `endpoints/filter.py` for Llama-based filtering.
   - Build `endpoints/entity.py` for NER-based entity extraction (authors, topics, dates).
   - Create `endpoints/recommend.py` for recommendation generation.
   - Develop `utils/rss_parser.py` for Hacker News RSS parsing.
   - Add `pipelines/recommendation.py` for TensorFlow recommender.
5. **Deployment**:
   - Configure `docker-compose.yml` for development.
   - Setup `kubernetes/deployment.yml` for production.
   - Add `nginx.conf` for reverse proxy.
6. **Scripts**:
   - Write `setup_models.sh` for Llama, Sentence-BERT downloads.
   - Create `setup_db.sh` for database initialization.
7. **Tests**:
   - Write unit tests in `tests/unit` for frontend, backend, ai.
   - Add integration tests in `tests/integration`.
   - Include performance tests in `tests/performance`.
8. **Documentation**:
   - Generate `docs/installation.md`, `user_guide.md`, `api.md`.

## Deliverables
- **Codebase**: Monorepo with frontend, backend, ai.
- **Configuration**: Docker/Kubernetes manifests, AI model setup scripts.
- **Documentation**: Installation, user, API guides.
- **Tests**: Unit, integration, performance tests.

## Constraints
- Use Llama, Sentence-BERT, TensorFlow; only OAuth and Hacker News RSS for external APIs.
- GPU acceleration (12GB+ VRAM).
- Target 6–9 months for MVP with 1–2 developers, 1 AI specialist.
- Follow rules file.

## Success Criteria
- Curated feed with >80% relevance, prioritizing anti-brain rot content.
- Interactive graph navigation with <500ms rendering.
- Recommender system with >80% user satisfaction.
- Seamless saving to main app.
- Self-hosted, no data leaks.
- Mobile-friendly, <2s page load.

## Notes for AI IDE
- Follow file structure exactly.
- Generate modular microservices.
- Include error handling for API rate limits and RSS parsing.
- Provide sample data for feeds, graph, and recommendations in `tests`.
- Comment code extensively.