from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.models.section import Section

from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth_utils import (
    hash_password, verify_password, create_access_token, get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentification"])


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    english_level: str = "B1"


class PasswordResetRequest(BaseModel):
    email: EmailStr
    new_password: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/reset-password")
def reset_password(data: PasswordResetRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.COMMUNITY_MANAGER]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seuls les Admins et Community Managers peuvent réinitialiser un mot de passe.")
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aucun compte associé à cet e-mail.")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Mot de passe réinitialisé avec succès."}


@router.post("/change-password")
def change_password(data: PasswordChangeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Mot de passe actuel incorrect.")
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Mot de passe mis à jour avec succès."}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.COMMUNITY_MANAGER]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seuls les Admins et Community Managers peuvent créer un compte membre.")
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Un utilisateur avec cet email existe déjà.")
    new_user = User(
        full_name=user_data.full_name, email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=UserRole.MEMBER, english_level=user_data.english_level, is_active=True
    )
    db.add(new_user); db.commit(); db.refresh(new_user)
    return {"message": "Utilisateur créé avec succès", "user_id": new_user.id}


@router.post("/login")
def login(
    username: str = Form(...),
    password: str = Form(...),
    section: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou mot de passe incorrect")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce compte a été suspendu par un administrateur.")

    if user.is_super_admin:
        if section not in [s.value for s in Section]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Section invalide.")
        active_section = section
    else:
        if not user.section or section != user.section.value:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Section incorrecte. Vérifiez votre section actuelle ou contactez un administrateur si elle a changé.",
            )
        active_section = section

    user.last_login_at = datetime.now()
    db.commit()
    access_token = create_access_token(data={"sub": str(user.id), "active_section": active_section})
    return {"access_token": access_token, "token_type": "bearer", "active_section": active_section}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id, "full_name": current_user.full_name, "email": current_user.email,
        "role": current_user.role, "english_level": current_user.english_level,
        "is_super_admin": current_user.is_super_admin,
        "section": current_user.section.value if current_user.section else None,
        "active_section": getattr(current_user, "active_section", None),
    }


@router.put("/users/{user_id}/promote")
def promote_user(user_id: int, new_role: str, section: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if new_role == UserRole.ADMIN.value:
        if not current_user.is_super_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul le Super Admin peut créer d'autres Admins.")
        if not section or section not in [s.value for s in Section]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Une section valide est requise pour promouvoir un Admin.")

    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.COMMUNITY_MANAGER:
        if new_role != UserRole.COMMUNITY_MANAGER.value:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Un Community Manager peut uniquement promouvoir un autre Community Manager.")
    elif not current_user.is_super_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous n'avez pas les droits pour promouvoir un utilisateur.")

    user_to_update = db.query(User).filter(User.id == user_id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    try:
        user_to_update.role = UserRole(new_role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Rôle invalide.")

    if new_role == UserRole.ADMIN.value:
        user_to_update.section = Section(section)

    db.commit(); db.refresh(user_to_update)
    return {
        "message": f"{user_to_update.full_name} promu {user_to_update.role}",
        "user_id": user_to_update.id, "new_role": user_to_update.role,
        "section": user_to_update.section.value if user_to_update.section else None,
    }
class SuperAdminCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str


@router.post("/create-super-admin", status_code=status.HTTP_201_CREATED)
def create_super_admin(
    data: SuperAdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_super_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul un Super Admin peut créer un autre Super Admin.")

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Un compte existe déjà avec cet email.")

    new_admin = User(
        full_name=data.full_name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.ADMIN,
        is_super_admin=True,
        english_level="C2",
        is_active=True,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return {"message": f"{new_admin.full_name} est maintenant Super Admin.", "user_id": new_admin.id}