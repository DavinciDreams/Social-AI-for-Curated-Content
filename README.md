# Brain Rot Filter / Social Media Home Base

A self-hosted, Flipboard-like web application that aggregates social media feeds and filters out "brain rot" using local AI.

## Architecture

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, PostgreSQL
- **AI Service:** Python, FastAPI, Ollama (Llama 3)
- **Database:** PostgreSQL (Metadata), Neo4j (Graph), Redis (Queues)

## Getting Started

1.  **Prerequisites:**
    - Docker & Docker Compose
    - Node.js v18+
    - Python 3.10+
    - NVIDIA GPU (Recommended for local LLM)

2.  **Start Infrastructure:**
    ```bash
    docker-compose up -d
    ```

3.  **Run Services:**
    - See `backend/README.md` and `frontend/README.md` (coming soon).
