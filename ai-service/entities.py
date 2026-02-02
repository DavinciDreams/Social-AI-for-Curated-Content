"""
Entity extraction module using spaCy for named entity recognition.
"""
import re
import time
from typing import List, Dict, Optional, Set
from pydantic import BaseModel

# Try to import spaCy, fallback to regex-based extraction
try:
    import spacy
    SPACY_AVAILABLE = True
    # Load English model
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        # Model not installed, try to download it
        import subprocess
        subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"], check=True)
        nlp = spacy.load("en_core_web_sm")
except ImportError:
    SPACY_AVAILABLE = False
    nlp = None
    print("Warning: spaCy not available, using regex-based entity extraction")

# Entity type mapping from spaCy to our types
SPACY_TO_ENTITY_TYPE = {
    "PERSON": "PERSON",
    "ORG": "ORGANIZATION",
    "GPE": "LOCATION",  # Geopolitical Entity
    "LOC": "LOCATION",  # Location
    "PRODUCT": "PRODUCT",
    "EVENT": "EVENT",
    "NORP": "ORGANIZATION",  # Nationalities, religious or political groups
    "FAC": "LOCATION",  # Facility
}

# Technology keywords for detection
TECHNOLOGY_KEYWORDS = {
    "ai", "artificial intelligence", "machine learning", "ml", "deep learning",
    "neural network", "nlp", "natural language processing", "computer vision",
    "blockchain", "cryptocurrency", "bitcoin", "ethereum", "nft",
    "cloud", "aws", "azure", "gcp", "kubernetes", "docker",
    "python", "javascript", "typescript", "rust", "go", "java",
    "react", "vue", "angular", "node", "django", "flask",
    "database", "sql", "nosql", "mongodb", "postgresql", "redis",
    "api", "rest", "graphql", "microservices", "serverless",
    "cybersecurity", "devops", "ci/cd", "git", "github",
    "mobile", "ios", "android", "flutter", "react native",
    "vr", "ar", "virtual reality", "augmented reality", "metaverse",
    "iot", "internet of things", "5g", "edge computing",
    "data science", "analytics", "big data", "data engineering",
    "llm", "gpt", "chatgpt", "claude", "openai", "anthropic",
    "gemini", "llama", "hugging face", "transformers",
    "web3", "defi", "smart contract", "solidity",
}

# Topic keywords for detection
TOPIC_KEYWORDS = {
    "startup", "entrepreneurship", "venture capital", "funding", "ipo",
    "innovation", "disruption", "digital transformation",
    "sustainability", "climate", "environment", "esg",
    "healthcare", "biotech", "fintech", "edtech",
    "remote work", "future of work", "hybrid work",
    "privacy", "security", "regulation", "compliance",
    "ethics", "ai ethics", "responsible ai",
    "open source", "community", "collaboration",
    "diversity", "inclusion", "equity",
    "productivity", "efficiency", "automation",
    "customer experience", "user experience", "ux", "ui",
}

# Common company suffixes to normalize
COMPANY_SUFFIXES = [
    "inc", "llc", "corp", "corporation", "ltd", "limited",
    "co", "company", "gmbh", "ag", "sa", "sarl", "pty",
    "plc", "group", "holdings", "industries", "technologies",
]

# Common person titles to filter
PERSON_TITLES = {
    "mr", "mrs", "ms", "dr", "prof", "ceo", "cto", "cfo", "coo",
    "president", "vice president", "director", "manager", "founder",
    "chief executive officer", "chief technology officer", "chief financial officer",
}


class ExtractedEntity(BaseModel):
    """Model for an extracted entity."""
    name: str
    type: str
    confidence: float
    normalized_name: str
    start: Optional[int] = None
    end: Optional[int] = None


class EntityExtractionRequest(BaseModel):
    """Request model for entity extraction."""
    text: str
    max_entities: int = 50
    min_confidence: float = 0.5


class EntityExtractionResponse(BaseModel):
    """Response model for entity extraction."""
    entities: List[ExtractedEntity]
    total_entities: int
    processing_time_ms: float


def normalize_entity_name(name: str) -> str:
    """
    Normalize an entity name for matching and deduplication.
    """
    name = name.lower().strip()
    
    # Remove common company suffixes
    for suffix in COMPANY_SUFFIXES:
        if name.endswith(f" {suffix}") or name.endswith(f".{suffix}"):
            name = name[:-len(suffix) - 1].strip()
            break
    
    # Remove extra whitespace
    name = re.sub(r'\s+', ' ', name)
    
    return name


def is_technology(text: str) -> bool:
    """Check if text refers to a technology."""
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in TECHNOLOGY_KEYWORDS)


def is_topic(text: str) -> bool:
    """Check if text refers to a topic."""
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in TOPIC_KEYWORDS)


def extract_entities_spacy(text: str, max_entities: int, min_confidence: float) -> List[ExtractedEntity]:
    """
    Extract entities using spaCy NER.
    """
    if nlp is None:
        return []
    
    doc = nlp(text)
    entities = []
    seen = set()
    
    for ent in doc.ents:
        if len(entities) >= max_entities:
            break
        
        # Skip short entities
        if len(ent.text.strip()) < 2:
            continue
        
        # Map spaCy entity type to our types
        entity_type = SPACY_TO_ENTITY_TYPE.get(ent.label_, "OTHER")
        
        # Check if it's a technology
        if entity_type == "OTHER":
            if is_technology(ent.text):
                entity_type = "TECHNOLOGY"
            elif is_topic(ent.text):
                entity_type = "TOPIC"
        
        # Normalize name
        normalized_name = normalize_entity_name(ent.text)
        
        # Skip duplicates
        if normalized_name in seen:
            continue
        seen.add(normalized_name)
        
        # Calculate confidence based on entity type and length
        confidence = min(0.9, 0.5 + (len(ent.text) * 0.02))
        
        if confidence >= min_confidence:
            entities.append(ExtractedEntity(
                name=ent.text,
                type=entity_type,
                confidence=confidence,
                normalized_name=normalized_name,
                start=ent.start_char,
                end=ent.end_char
            ))
    
    return entities


def extract_entities_regex(text: str, max_entities: int, min_confidence: float) -> List[ExtractedEntity]:
    """
    Extract entities using regex-based approach (fallback).
    """
    entities = []
    seen = set()
    
    # Extract capitalized words/phrases (potential organizations/people)
    # Pattern for capitalized phrases
    capitalized_pattern = r'\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b'
    matches = re.finditer(capitalized_pattern, text)
    
    for match in matches:
        if len(entities) >= max_entities:
            break
        
        name = match.group()
        
        # Skip common words
        if name.lower() in {"the", "and", "or", "but", "for", "with", "from", "this", "that"}:
            continue
        
        normalized_name = normalize_entity_name(name)
        
        if normalized_name in seen:
            continue
        seen.add(normalized_name)
        
        # Determine entity type
        entity_type = "OTHER"
        if is_technology(name):
            entity_type = "TECHNOLOGY"
        elif is_topic(name):
            entity_type = "TOPIC"
        elif any(word in name.lower() for word in PERSON_TITLES):
            entity_type = "PERSON"
        else:
            # Default to ORGANIZATION for capitalized phrases
            entity_type = "ORGANIZATION"
        
        confidence = 0.6  # Lower confidence for regex-based extraction
        
        if confidence >= min_confidence:
            entities.append(ExtractedEntity(
                name=name,
                type=entity_type,
                confidence=confidence,
                normalized_name=normalized_name,
                start=match.start(),
                end=match.end()
            ))
    
    return entities


def extract_entities(request: EntityExtractionRequest) -> EntityExtractionResponse:
    """
    Extract entities from text using spaCy or regex fallback.
    """
    start_time = time.time()
    
    # Choose extraction method
    if SPACY_AVAILABLE:
        entities = extract_entities_spacy(
            request.text,
            request.max_entities,
            request.min_confidence
        )
    else:
        entities = extract_entities_regex(
            request.text,
            request.max_entities,
            request.min_confidence
        )
    
    # Sort by confidence
    entities.sort(key=lambda e: e.confidence, reverse=True)
    
    processing_time = (time.time() - start_time) * 1000
    
    return EntityExtractionResponse(
        entities=entities,
        total_entities=len(entities),
        processing_time_ms=processing_time
    )


def get_available_models() -> Dict[str, bool]:
    """
    Get information about available entity extraction models.
    """
    return {
        "spacy_available": SPACY_AVAILABLE,
        "spacy_model_loaded": nlp is not None,
        "fallback_available": True
    }
