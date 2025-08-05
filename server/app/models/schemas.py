from pydantic import BaseModel

class QuestionRequest(BaseModel):
    user_id: str
    question: str
