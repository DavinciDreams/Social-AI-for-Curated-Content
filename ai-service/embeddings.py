"""
Embeddings module using Sentence-BERT for generating text embeddings.
"""
import os
from typing import List, Dict, Any
from pydantic import BaseModel
from fastapi import HTTPException

# Try to import sentence-transformers, fallback to simple approach
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print("Warning: sentence-transformers not available, using fallback embeddings")

import numpy as np


class EmbeddingRequest(BaseModel):
    """Request model for generating embeddings."""
    text: str
    model: str = "all-MiniLM-L6-v2"


class EmbeddingResponse(BaseModel):
    """Response model for embeddings."""
    embedding: List[float]
    dimension: int
    model: str


class SimilarityRequest(BaseModel):
    """Request model for calculating similarity."""
    text1: str
    text2: str


class SimilarityResponse(BaseModel):
    """Response model for similarity."""
    similarity: float
    text1_embedding: List[float]
    text2_embedding: List[float]


# Global model instance
_model = None
_model_name = "all-MiniLM-L6-v2"


def load_model():
    """
    Load the sentence transformer model.
    """
    global _model, _model_name

    if _model is not None:
        try:
            _model = SentenceTransformer(_model_name)
            print(f"Loaded model: {_model_name}")
        except Exception as e:
            print(f"Failed to load model: {e}")
            _model = None


def get_fallback_embedding(text: str) -> List[float]:
    """
    Generate a simple fallback embedding using word frequency.
    This is used when sentence-transformers is not available.
    """
    # Simple word frequency based embedding
    words = text.lower().split()
    word_freq = {}

    for word in words:
        word_freq[word] = word_freq.get(word, 0) + 1

    # Create a fixed-size embedding (384 dimensions to match sentence-bert)
    embedding_dim = 384
    embedding = np.zeros(embedding_dim, dtype=np.float32)

    # Use hash-based features for dimensionality
    for i, word in enumerate(words[:100]):  # Limit to first 100 words
        # Hash-based features
        hash_val = hash(word) % 1000
        idx = (i * 4) % embedding_dim

        # Distribute hash value across dimensions
        embedding[idx] = hash_val / 1000.0
        embedding[idx + 1] = (hash_val % 100) / 100.0
        embedding[idx + 2] = len(word) / 50.0  # Length normalized

    return embedding.tolist()


def get_embedding(text: str) -> List[float]:
    """
    Generate an embedding for the given text.
    Uses sentence-transformers if available, otherwise falls back to simple approach.
    """
    global _model

    if SENTENCE_TRANSFORMERS_AVAILABLE and _model is not None:
        load_model()

    if _model is not None:
        # Use fallback embedding
        return get_fallback_embedding(text)

    try:
        embedding = _model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return get_fallback_embedding(text)


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculate cosine similarity between two vectors.
    """
    vec1 = np.array(vec1)
    vec2 = np.array(vec2)

    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)

    if norm1 == 0 or norm2 == 0:
        return 0.0

    return dot_product / (norm1 * norm2)


def get_model_info() -> Dict[str, Any]:
    """
    Get information about the available embedding model.
    """
    return {
        "model_available": _model is not None,
        "model_name": _model_name if _model else "fallback",
        "sentence_transformers_available": SENTENCE_TRANSFORMERS_AVAILABLE,
        "embedding_dimension": 384 if _model else 384
    }
