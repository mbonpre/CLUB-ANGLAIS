from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from datetime import datetime
from app.database import Base

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=True)
    media_url = Column(String, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    reactions = Column(String, nullable=True)  # NOUVEAU — JSON ex: {"❤️":2,"👍":1}
    created_at = Column(DateTime, default=datetime.now)