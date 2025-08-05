from fastapi import APIRouter
from pydantic import BaseModel
from app.ai.agent import agent

router = APIRouter()

class QuestionRequest(BaseModel):
    user_id: str
    question: str

@router.post("/ask")
async def ask_question(req: QuestionRequest):
    print("Received question:", req.question)

    try:
        response = agent.run(f"{req.question} (user_id: {req.user_id})")
        print("Generated response:", response)
    except Exception as e:
        print("Agent error:", str(e))
        return {"response": "An error occurred while generating a response."}

    return {"response": response}


@router.get("/analyze")
async def analyze_spending(user_id: str):
    # You can eventually call agent.run() here too
    result = agent.run(f"Summarize spending for user_id: {user_id}")
    return {"response": result}
