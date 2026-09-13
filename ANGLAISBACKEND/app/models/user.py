from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base
from app.models.section import Section

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
    is_super_admin = Column(Boolean, default=False, nullable=False) 
    section = Column(Enum(Section), nullable=True)
    bio = Column(String, nullable=True)
    skills = Column(String, nullable=True)
    english_level = Column(String, default="A1")
    created_at = Column(DateTime, default=datetime.now)
    profile_image = Column(String, nullable=True, default="default.png")
    last_login_at = Column(DateTime, nullable=True)
    posts = relationship("Post", back_populates="author")
    projects = relationship("Project", back_populates="author")