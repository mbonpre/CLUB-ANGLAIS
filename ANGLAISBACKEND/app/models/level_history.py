from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.database import Base


class LevelHistory(Base):
    __tablename__ = "level_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    previous_level = Column(String, nullable=False)
    new_level = Column(String, nullable=False)
    changed_at = Column(DateTime, default=datetime.now)