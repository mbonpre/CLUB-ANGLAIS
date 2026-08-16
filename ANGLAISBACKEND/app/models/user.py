from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    MEMBER = "MEMBER"
    COACH = "COACH"
    COMMUNITY_MANAGER = "COMMUNITY_MANAGER"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.MEMBER, nullable=False)
    is_active = Column(Boolean, default=True)
    bio = Column(String, nullable=True)
    skills = Column(String, nullable=True)  # Ex: "Python, Marketing"
    english_level = Column(String, default="A1") # Niveau d'anglais par défaut au plus bas à l'inscription
    created_at = Column(DateTime, default=datetime.now)

    # Relation inverse vers la table des publications
    posts = relationship("Post", back_populates="author")
    # Dans app/models/user.py
profile_image = Column(String, nullable=True, default="default.png")