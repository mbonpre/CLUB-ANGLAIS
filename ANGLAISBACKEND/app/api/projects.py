from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.project import Project, ProjectType, ProjectApplication
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    ApplicationCreate,
    ApplicationResponse,
)
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/projects", tags=["Projets & Missions"])


@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    project_type: Optional[ProjectType] = Query(None, description="Filtrer par 'collaborative' ou 'mission'"),
    db: Session = Depends(get_db),
):
    query = db.query(Project)
    if project_type:
        query = query.filter(Project.project_type == project_type)
    return query.order_by(Project.created_at.desc()).all()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_project = Project(
        title=project_data.title,
        description=project_data.description,
        project_type=project_data.project_type,
        required_level=project_data.required_level,
        tags=project_data.tags,
        author_id=current_user.id,
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project


@router.post("/{project_id}/apply", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_to_project(
    project_id: int,
    application_data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet introuvable.")

    if project.author_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas postuler à votre propre projet.",
        )

    existing = (
        db.query(ProjectApplication)
        .filter(
            ProjectApplication.project_id == project_id,
            ProjectApplication.applicant_id == current_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous avez déjà postulé à ce projet.",
        )

    new_application = ProjectApplication(
        project_id=project_id,
        applicant_id=current_user.id,
        message=application_data.message,
    )
    db.add(new_application)
    db.commit()
    db.refresh(new_application)
    return new_application


@router.get("/{project_id}/applications", response_model=List[ApplicationResponse])
def get_project_applications(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet introuvable.")

    # Seul l'auteur du projet peut voir qui a postulé
    if project.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul l'auteur du projet peut voir les candidatures.",
        )

    return project.applications