from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole
from app.models.level_history import LevelHistory
from app.services.auth_utils import get_current_user
from app.models.section import Section
from app.models.section_history import SectionHistory

router = APIRouter(prefix="/admin", tags=["Administration"])


def _require_admin_or_cm(current_user: User):
    if current_user.role not in [UserRole.ADMIN, UserRole.COMMUNITY_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Réservé aux Admins et Community Managers.",
        )


class LevelUpdate(BaseModel):
    english_level: str


VALID_LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}


@router.patch("/users/{user_id}/level")
def update_member_level(
    user_id: int,
    data: LevelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_or_cm(current_user)

    if data.english_level not in VALID_LEVELS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Niveau invalide (A1 à C2 attendu).")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membre introuvable.")

    old_level = user.english_level
    user.english_level = data.english_level

    # NOUVEAU — trace l'historique pour pouvoir calculer le progrès moyen plus tard
    if old_level != data.english_level:
        db.add(LevelHistory(user_id=user.id, previous_level=old_level, new_level=data.english_level))

    db.commit()
    db.refresh(user)
    return {"message": f"Niveau de {user.full_name} mis à jour : {user.english_level}", "user_id": user.id}


@router.patch("/users/{user_id}/toggle-active")
def toggle_member_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_or_cm(current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membre introuvable.")
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vous ne pouvez pas désactiver votre propre compte.")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return {"message": f"{user.full_name} est maintenant {'actif' if user.is_active else 'désactivé'}.", "is_active": user.is_active}

class SectionUpdate(BaseModel):
    section: str


@router.patch("/users/{user_id}/section")
def update_user_section(
    user_id: int,
    data: SectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_super_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul le Super Admin peut changer la section d'un utilisateur.")

    if data.section not in [s.value for s in Section]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Section invalide.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")

    previous_section = user.section.value if user.section else None
    if previous_section == data.section:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cet utilisateur est déjà dans cette section.")

    user.section = data.section
    db.add(SectionHistory(
        user_id=user.id, changed_by_id=current_user.id,
        previous_section=previous_section, new_section=data.section,
    ))
    db.commit()
    db.refresh(user)
    return {
        "message": f"{user.full_name} est maintenant dans la section {data.section}.",
        "user_id": user.id, "section": user.section.value,
    }
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_super_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul le Super Admin peut supprimer un compte.")
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vous ne pouvez pas supprimer votre propre compte.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")

    full_name = user.full_name
    try:
        db.delete(user)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de supprimer {full_name} : il a des données liées (publications, messages...). Bannissez-le plutôt si vous ne pouvez pas le supprimer.",
        )
    return {"message": f"{full_name} a été supprimé définitivement."}