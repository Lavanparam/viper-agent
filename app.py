from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from agent import GameTheoryAgent
import uvicorn
import os

app = FastAPI(title="Game Theory Agent")

# Mount static files for the frontend
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

# Initialize Agent
try:
    agent = GameTheoryAgent()
except Exception as e:
    print(f"Failed to initialize agent: {e}")
    agent = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    if not agent:
        raise HTTPException(status_code=500, detail="Agent not initialized (check API Key)")
    
    try:
        response_text = agent.generate_response(request.message, request.history)
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def read_root():
    return {"message": "Game Theory Agent API is running. Go to /static/index.html"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
