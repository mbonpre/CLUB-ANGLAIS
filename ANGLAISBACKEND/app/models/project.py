from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class ProjectType(str, enum.Enum):
    COLLABORATIVE = "collaborative"  # Projet collaboratif long terme
    MISSION = "mission"              # Mission / étape ponctuelle


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    project_type = Column(Enum(ProjectType), default=ProjectType.COLLABORATIVE, nullable=False)
    required_level = Column(String, default="A1", nullable=False)  # même convention que User.english_level
    tags = Column(String, nullable=True)  # ex: "#React, #CSS" — même convention que User.skills
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    author = relationship("User", back_populates="projects")
    applications = relationship("ProjectApplication", back_populates="project", cascade="all, delete-orphan")


class ProjectApplication(Base):
    __tablename__ = "project_applications"
    __table_args__ = (
        UniqueConstraint("project_id", "applicant_id", name="uq_project_applicant"),
    )

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    applicant_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    project = relationship("Project", back_populates="applications")
    applicant = relationship("User")