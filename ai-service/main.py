from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import httpx
import asyncio
import json
from dotenv import load_dotenv
from entities import (
    EntityExtractionRequest,
    EntityExtractionResponse,
    extract_entities,
    get_available_models
)
from embeddings import (
    EmbeddingRequest,
    EmbeddingResponse,
    SimilarityRequest,
    SimilarityResponse,
    get_embedding,
    cosine_similarity,
    get_model_info
)

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Brain Rot AI Service")

# Configuration from environment variables
AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", "8000"))
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "30"))

class FilterRequest(BaseModel):
    text: str
    context: Optional[str] = None

class FilterResponse(BaseModel):
    score: float
    is_brain_rot: bool
    reasoning: str

class HealthResponse(BaseModel):
    status: str
    model: str
    ollama_host: str
    ollama_connected: bool
    entity_extraction: dict
    embeddings: dict

async def call_ollama(text: str, system_prompt: str) -> dict:
    """
    Call Ollama API with the given text and system prompt.
    Implements timeout and retry logic.
    """
    url = f"{OLLAMA_HOST}/api/chat"
    
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": text
            }
        ],
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 500
        }
    }
    
    max_retries = 2
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException:
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
                continue
            raise HTTPException(
                status_code=504,
                detail=f"Ollama request timed out after {OLLAMA_TIMEOUT} seconds"
            )
        except httpx.HTTPStatusError as e:
            if attempt < max_retries - 1 and e.response.status_code >= 500:
                await asyncio.sleep(retry_delay)
                continue
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Ollama API error: {e.response.text}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error calling Ollama: {str(e)}"
            )
    
    raise HTTPException(status_code=500, detail="Max retries exceeded")

def parse_ollama_response(response_text: str) -> tuple[float, str]:
    """
    Parse Ollama response to extract relevance score and reasoning.
    Returns a tuple of (score, reasoning).
    """
    # Try to extract JSON response
    try:
        # Look for JSON patterns in the response
        if '{' in response_text and '}' in response_text:
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            json_str = response_text[start:end]
            parsed = json.loads(json_str)
            
            if 'score' in parsed:
                score = float(parsed['score'])
                reasoning = parsed.get('reasoning', response_text)
                return score, reasoning
    except (json.JSONDecodeError, ValueError):
        pass
    
    # Fallback: analyze the text for score indicators
    response_lower = response_text.lower()
    
    # Look for numeric scores
    import re
    score_patterns = [
        r'score[:\s]*([0-9.]+)',
        r'rating[:\s]*([0-9.]+)',
        r'([0-9.]+)\s*\/\s*100',
        r'([0-9.]+)\s*\/\s*10',
    ]
    
    for pattern in score_patterns:
        match = re.search(pattern, response_lower)
        if match:
            score = float(match.group(1))
            # Normalize to 0-1 scale
            if score > 1:
                score = score / 100
            return score, response_text
    
    # Default: analyze sentiment keywords
    negative_keywords = ['brain rot', 'low quality', 'sensationalist', 'clickbait', 'shallow', 'empty']
    positive_keywords = ['high quality', 'valuable', 'informative', 'well-researched', 'thoughtful']
    
    negative_count = sum(1 for kw in negative_keywords if kw in response_lower)
    positive_count = sum(1 for kw in positive_keywords if kw in response_lower)
    
    total = negative_count + positive_count
    if total > 0:
        score = negative_count / total
    else:
        score = 0.5  # Neutral default
    
    return score, response_text

@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    ollama_connected = False
    
    try:
        # Check if Ollama is reachable
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{OLLAMA_HOST}/api/tags")
            ollama_connected = response.status_code == 200
    except Exception:
        ollama_connected = False
    
    return HealthResponse(
        status="AI Service Operational",
        model=OLLAMA_MODEL,
        ollama_host=OLLAMA_HOST,
        ollama_connected=ollama_connected,
        entity_extraction=get_available_models(),
        embeddings=get_model_info()
    )

@app.get("/health", response_model=HealthResponse)
async def health():
    """Detailed health check endpoint"""
    return await root()

@app.post("/filter", response_model=FilterResponse)
async def filter_content(request: FilterRequest):
    """
    Filter content using Llama 3 via Ollama.
    Returns a relevance score (0-1), brain rot flag, and reasoning.
    """
    # Use provided context or default system prompt
    system_prompt = request.context or (
        "You are a content quality filter. Analyze the given content and determine if it represents "
        "'brain rot' - low-quality, sensationalist, or intellectually empty content. "
        "Consider factors like: clickbait headlines, shallow analysis, excessive outrage bait, "
        "repetitive memes, content that provides no real value. "
        "Rate the content from 0 (high quality) to 1 (pure brain rot). "
        "Respond with a JSON object containing 'score' (0-1) and 'reasoning' (string)."
    )
    
    # Call Ollama
    ollama_response = await call_ollama(request.text, system_prompt)
    
    # Extract the response text
    response_text = ollama_response.get('message', {}).get('content', '')
    
    # Parse the response to get score and reasoning
    score, reasoning = parse_ollama_response(response_text)
    
    # Determine if it's brain rot (score > 0.6)
    is_brain_rot = score > 0.6
    
    return FilterResponse(
        score=score,
        is_brain_rot=is_brain_rot,
        reasoning=reasoning
    )

@app.post("/extract", response_model=EntityExtractionResponse)
async def extract_content_entities(request: EntityExtractionRequest):
    """
    Extract entities from text using spaCy or regex fallback.
    Returns a list of entities with types and confidence scores.
    """
    try:
        result = extract_entities(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting entities: {str(e)}"
        )

@app.post("/embed", response_model=EmbeddingResponse)
async def generate_embedding(request: EmbeddingRequest):
    """
    Generate an embedding for given text.
    """
    try:
        embedding = get_embedding(request.text)
        return EmbeddingResponse(
            embedding=embedding,
            dimension=len(embedding),
            model=get_model_info().get("model_name", "fallback")
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating embedding: {str(e)}"
        )

@app.post("/similarity", response_model=SimilarityResponse)
async def calculate_similarity(request: SimilarityRequest):
    """
    Calculate cosine similarity between two texts.
    """
    try:
        embedding1 = get_embedding(request.text1)
        embedding2 = get_embedding(request.text2)
        similarity = cosine_similarity(embedding1, embedding2)
        return SimilarityResponse(
            similarity=float(similarity),
            text1_embedding=embedding1,
            text2_embedding=embedding2
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calculating similarity: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=AI_SERVICE_PORT)
