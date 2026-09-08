from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.project import ProjectType


# Auteur public — sans email, même logique que pour les posts (endpoint public)
class AuthorPublic(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    title: str
    description: str
    project_type: ProjectType = ProjectType.COLLABORATIVE
    required_level: str = "A1"
    tags: Optional[str] = None  # ex: "#React, #CSS" séparés par des virgules


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    id: int
    author_id: int
    created_at: datetime
    author: AuthorPublic

    class Config:
        from_attributes = True


class ApplicationCreate(BaseModel):
    message: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int
    project_id: int
    applicant: AuthorPublic
    message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True