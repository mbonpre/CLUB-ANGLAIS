import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base, SessionLocal
from app.api import auth, posts, users, messages, upload, projects, translate, account_requests, admin, stats, rooms, assessment
from app.models.user import User, UserRole
from app.models.assessment_question import AssessmentQuestion
from app.services.auth_utils import get_password_hash
from app.models import user, post, message, project, account_request, level_history, room, level_assessment, assessment_question

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
            db.add(initial_admin); db.commit()
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


@app.get("/")
def read_root():
    return {"status": "online", "message": "API Club d'Anglais opérationnelle !"}