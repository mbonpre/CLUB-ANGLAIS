import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User

load_dotenv()

# Configuration stricte sur pbkdf2_sha256 uniquement
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    default="pbkdf2_sha256",
    deprecated="auto",
)

# La clé JWT DOIT venir de l'environnement : aucune valeur de secours dans le code,
# sinon n'importe qui lisant le dépôt pourrait fabriquer de faux tokens (même admin).
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY manquante. Génère-en une avec : "
        "python -c \"import secrets; print(secrets.token_urlsafe(48))\" "
        "puis ajoute-la dans le .env local et dans les variables d'environnement Render."
    )
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# Schéma d'authentification OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# Fonction d'extraction et vérification du Token JWT
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        active_section = payload.get("active_section")
    except Exception:
        raise credentials_exception
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte a été suspendu par un administrateur.",
        )

    # Section de travail pour cette connexion (permet au Super Admin de changer
    # de contexte de section à chaque connexion, sans que ce soit persisté en base)
    user.active_section = active_section or (user.section.value if user.section else None)

    return user


# Alias pour assurer la compatibilité avec le reste du code
get_password_hash = hash_password