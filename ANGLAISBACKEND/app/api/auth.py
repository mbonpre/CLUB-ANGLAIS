from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth_utils import (
    hash_password, 
    verify_password, 
    create_access_token, 
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentification"])

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    english_level: str = "B1"

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un utilisateur avec cet email existe déjà."
        )
    
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=UserRole.MEMBER,
        english_level=user_data.english_level,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "Utilisateur créé avec succès", "user_id": new_user.id}

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.put("/users/{user_id}/promote")
def promote_user(
    user_id: int, 
    new_role: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.COMMUNITY_MANAGER:
        if new_role != UserRole.COMMUNITY_MANAGER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Un Community Manager peut uniquement promouvoir un autre Community Manager."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Vous n'avez pas les droits pour promouvoir un utilisateur."
        )

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
        "user_id": user_to_update.id,
        "new_role": user_to_update.role
    }