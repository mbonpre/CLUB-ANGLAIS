from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.api import auth, posts, users, messages
from app.models.user import User, UserRole
from app.services.auth_utils import get_password_hash
from app.api import auth, posts, users, messages, upload
# Importation des modèles pour la création des tables SQLite/PostgreSQL
from app.models import user, post, message

Base.metadata.create_all(bind=engine)

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

# Création automatique de l'administrateur par défaut au démarrage
@app.on_event("startup")
def create_initial_admin():
    db = SessionLocal()
    try:
        # Vérifie si un administrateur existe déjà dans la base
        admin_exists = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin_exists:
            initial_admin = User(
                full_name="Super Admin",
                email="admin@clubanglais.com",
                hashed_password=get_password_hash("AdminPass123!"),
                role=UserRole.ADMIN,
                english_level="C2",
                is_active=True,
                bio="Administrateur principal de la plateforme Club Anglais."
            )
            db.add(initial_admin)
            db.commit()
            print(">>> Compte Administrateur par défaut créé avec succès (Email: admin@clubanglais.com / MDP: AdminPass123!)")
    finally:
        db.close()

# Enregistrement des routes
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(users.router)
app.include_router(messages.router)
app.include_router(upload.router)

@app.get("/")
def read_root():
    return {"status": "online", "message": "API Club d'Anglais opérationnelle !"}
from fastapi.staticfiles import StaticFiles
import os

# Création automatique du dossier s'il n'existe pas
os.makedirs("uploads", exist_ok=True)

# Montage du dossier statique
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")