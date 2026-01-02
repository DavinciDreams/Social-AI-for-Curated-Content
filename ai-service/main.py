from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="Brain Rot AI Service")

class FilterRequest(BaseModel):
    text: str
    context: Optional[str] = None

class FilterResponse(BaseModel):
    score: float
    is_brain_rot: bool
    reasoning: str

@app.get("/")
async def root():
    return {"status": "AI Service Operational", "model": "llama3"}

@app.post("/filter", response_model=FilterResponse)
async def filter_content(request: FilterRequest):
    # Placeholder for actual Llama 3 logic
    # In a real implementation this would call Ollama
    return {
        "score": 0.95,
        "is_brain_rot": False,
        "reasoning": "Placeholder: Content seems high quality."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
