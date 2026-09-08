from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, ProfileUpdate
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/users", tags=["Gestion du Profil & Annuaire"])

@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_user_me(
    profile_data: ProfileUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if profile_data.bio is not None:
        current_user.bio = profile_data.bio
    if profile_data.skills is not None:
        current_user.skills = profile_data.skills
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/{user_id}/promote")
def promote_user(
    user_id: int, 
    new_role: str, # Le rôle envoyé dans la requête (ex: "COACH", "COMMUNITY_MANAGER", "ADMIN")
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérification manuelle de la règle métier
    if current_user.role == UserRole.COMMUNITY_MANAGER and new_role in [UserRole.ADMIN, UserRole.COACH]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Un Community Manager ne peut pas nommer un Admin ou un Coach."
        )
    if current_user.role not in [UserRole.ADMIN, UserRole.COMMUNITY_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Accès refusé."
        )

    # Recherche et mise à jour de l'utilisateur cible
    user_to_update = db.query(User).filter(User.id == user_id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    try:
        user_to_update.role = UserRole(new_role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Rôle invalide.")

    db.commit()
    db.refresh(user_to_update)

    return {
        "message": f"Utilisateur {user_to_update.full_name} promu avec succès au rang de {user_to_update.role}", 
        "user": user_to_update
    }

# Route : Annuaire public des membres
@router.get("/", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    return db.query(User).filter(User.is_active == True).all()

# Nouvelle route : Modifier le niveau d'anglais d'un membre (Réservé Admin & Coach)
@router.put("/{user_id}/level")
def update_user_level(
    user_id: int, 
    new_level: str, # Ex: "A1", "A2", "B1", "B2", "C1", "C2"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Seul l'Admin ou un Coach peut modifier le niveau d'un utilisateur
    if current_user.role not in [UserRole.ADMIN, UserRole.COACH]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Seuls les administrateurs et les coachs peuvent attribuer un niveau."
        )

    user_to_update = db.query(User).filter(User.id == user_id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    user_to_update.english_level = new_level
    db.commit()
    db.refresh(user_to_update)

    return {"message": f"Niveau de {user_to_update.full_name} mis à jour à {new_level}", "user": user_to_update}