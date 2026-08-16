from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class PostType(str, enum.Enum):
    OFFICIAL = "official"    # Flux 1: À la Une du Club (CM / Admin)
    COMMUNITY = "community"  # Flux 2: Fil de la Communauté (Membres)

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    post_type = Column(Enum(PostType), default=PostType.COMMUNITY, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    # Relation vers l'utilisateur
    author = relationship("User", back_populates="posts")