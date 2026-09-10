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

SEED_QUESTIONS = [
    {"text": "She ___ to school every day.", "options": ["go", "goes", "going", "gone"], "correct_index": 1, "level": "A1"},
    {"text": "What is the plural of 'child'?", "options": ["childs", "childes", "children", "childrens"], "correct_index": 2, "level": "A1"},
    {"text": "I ___ my homework yesterday.", "options": ["do", "did", "done", "does"], "correct_index": 1, "level": "A2"},
    {"text": "There ___ many people at the party.", "options": ["was", "were", "is", "be"], "correct_index": 1, "level": "A2"},
    {"text": "If it rains, I ___ stay home.", "options": ["will", "would", "was", "did"], "correct_index": 0, "level": "B1"},
    {"text": "She has been living here ___ 2015.", "options": ["for", "since", "during", "at"], "correct_index": 1, "level": "B1"},
    {"text": "By next year, I ___ my degree.", "options": ["will finish", "will have finished", "finish", "finished"], "correct_index": 1, "level": "B2"},
    {"text": "He speaks English as if he ___ British.", "options": ["is", "was", "were", "be"], "correct_index": 2, "level": "B2"},
    {"text": "Choose the correct sentence:", "options": ["Despite of the rain, we went out.", "Despite the rain, we went out.", "Despite it rained, we went out.", "Despite raining, we went out."], "correct_index": 1, "level": "C1"},
    {"text": "'To take something for granted' means:", "options": ["To be very grateful", "To not appreciate something's value", "To take an exam", "To grant permission"], "correct_index": 1, "level": "C1"},
    {"text": "Choose the most nuanced synonym for 'ubiquitous':", "options": ["Rare", "Omnipresent", "Ancient", "Fragile"], "correct_index": 1, "level": "C2"},
    {"text": "Identify the correct use of the subjunctive:", "options": ["I suggest he goes now.", "I suggest he go now.", "I suggest he going now.", "I suggest him to go now."], "correct_index": 1, "level": "C2"},
]

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

        # Ne seed les questions qu'une seule fois, si la banque est vide
        if db.query(AssessmentQuestion).count() == 0:
            for q in SEED_QUESTIONS:
                db.add(AssessmentQuestion(text=q["text"], options=json.dumps(q["options"]), correct_index=q["correct_index"], level=q["level"], is_active=True))
            db.commit()
            print(">>> Banque de questions du test de niveau initialisée.")
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