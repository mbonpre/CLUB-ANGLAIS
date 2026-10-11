import os

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
from alembic.config import Config
from alembic import command

from app.database import engine, Base, SessionLocal, get_db
from app.api import auth, posts, users, messages, upload, projects, translate, account_requests, admin, stats, rooms, assessment
from app.models.user import User, UserRole
from app.models.assessment_question import AssessmentQuestion
from app.services.auth_utils import get_password_hash, get_current_user
from app.models import user, post, message, project, account_request, level_history, room, level_assessment, assessment_question, push_subscription

app = FastAPI(
    title="Club d'Anglais API",
    description="API Backend de la plateforme communautaire et réseau",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
def run_migrations():
    """Applique les migrations Alembic en attente au démarrage.
    On log l'erreur au lieu de planter, pour ne pas couper l'API."""
    try:
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        print(">>> Migrations Alembic appliquées avec succès.")
    except Exception as e:
        print(f">>> ERREUR lors des migrations Alembic : {type(e).__name__}: {e}")


@app.on_event("startup")
def create_initial_admin():
    db = SessionLocal()
    try:
        admin_exists = db.query(User).filter(User.email == "admin@clubanglais.com").first()
        if not admin_exists:
            initial_admin = User(
                full_name="Super Admin", email="admin@clubanglais.com",
                hashed_password=get_password_hash("AdminPass123!"),
                role=UserRole.ADMIN, is_super_admin=True,
                english_level="C2", is_active=True,
                bio="Administrateur principal de la plateforme Club Anglais."
            )
            db.add(initial_admin)
            db.commit()
            print(">>> Compte Administrateur par défaut créé avec succès !")
    finally:
        db.close()


app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(users.router)
app.include_router(messages.router)
app.include_router(upload.router)
app.include_router(projects.router)
app.include_router(translate.router)
app.include_router(account_requests.router)
app.include_router(admin.router)
app.include_router(stats.router)
app.include_router(rooms.router)
app.include_router(assessment.router)


class PasswordReset(BaseModel):
    new_password: str


@app.post("/admin/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    data: PasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Réservé aux administrateurs.")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 8 caractères.")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    target.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": f"Mot de passe de {target.full_name} réinitialisé."}


@app.get("/")
def read_root():
    return {"status": "online", "message": "API Club d'Anglais opérationnelle !"}