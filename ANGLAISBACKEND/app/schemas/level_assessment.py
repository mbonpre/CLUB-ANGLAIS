from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime

class AuthorPublic(BaseModel):
    id: int
    full_name: str
    class Config:
        from_attributes = True

class SubmitAnswers(BaseModel):
    answers: Dict[int, int]

class AssessmentResult(BaseModel):
    id: int
    score: int
    total_questions: int
    suggested_level: str
    is_validated: bool
    final_level: Optional[str] = None

class PendingAssessmentResponse(BaseModel):
    id: int
    user: AuthorPublic
    score: int
    total_questions: int
    suggested_level: str
    created_at: datetime
    class Config:
        from_attributes = True

class ValidateAssessment(BaseModel):
    final_level: str

class QuestionPublic(BaseModel):
    id: int
    text: str
    options: List[str]

class QuestionAdmin(BaseModel):
    id: int
    text: str
    options: List[str]
    correct_index: int
    level: str
    is_active: bool
    class Config:
        from_attributes = True

class QuestionCreate(BaseModel):
    text: str
    options: List[str]
    correct_index: int
    level: str
    is_active: bool = True

class QuestionUpdate(BaseModel):
    text: str
    options: List[str]
    correct_index: int
    level: str
    is_active: bool