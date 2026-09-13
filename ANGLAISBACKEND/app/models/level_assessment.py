from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean 
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class LevelAssessment(Base):
    __tablename__ = "level_assessments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", foreign_keys=[user_id])
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    suggested_level = Column(String, nullable=False)
    final_level = Column(String, nullable=True)
    is_validated = Column(Boolean, default=False, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    reviewed_at = Column(DateTime, nullable=True)