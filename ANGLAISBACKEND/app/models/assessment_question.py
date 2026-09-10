from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base

class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    options = Column(String, nullable=False)  # JSON: liste de 4 chaînes
    correct_index = Column(Integer, nullable=False)
    level = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)