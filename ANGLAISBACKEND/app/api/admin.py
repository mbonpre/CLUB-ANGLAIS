from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole
from app.models.level_history import LevelHistory
from app.services.auth_utils import get_current_user

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