from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.database import Base


class SectionHistory(Base):
    __tablename__ = "section_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    previous_section = Column(String, nullable=True)
    new_section = Column(String, nullable=False)
    changed_at = Column(DateTime, default=datetime.now)