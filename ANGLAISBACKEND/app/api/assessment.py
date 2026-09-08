from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.level_assessment import LevelAssessment
from app.models.level_history import LevelHistory
from app.schemas.level_assessment import SubmitAnswers, AssessmentResult, PendingAssessmentResponse, ValidateAssessment
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/assessment", tags=["Évaluation de niveau"])

# Banque de questions : (texte, options[4], index_reponse_correcte, niveau_cible)
QUESTIONS = [
    {"id": 1, "text": "She ___ to school every day.", "options": ["go", "goes", "going", "gone"], "correct": 1, "level": "A1"},
    {"id": 2, "text": "What is the plural of 'child'?", "options": ["childs", "childes", "children", "childrens"], "correct": 2, "level": "A1"},
    {"id": 3, "text": "I ___ my homework yesterday.", "options": ["do", "did", "done", "does"], "correct": 1, "level": "A2"},
    {"id": 4, "text": "There ___ many people at the party.", "options": ["was", "were", "is", "be"], "correct": 1, "level": "A2"},
    {"id": 5, "text": "If it rains, I ___ stay home.", "options": ["will", "would", "was", "did"], "correct": 0, "level": "B1"},
    {"id": 6, "text": "She has been living here ___ 2015.", "options": ["for", "since", "during", "at"], "correct": 1, "level": "B1"},
    {"id": 7, "text": "By next year, I ___ my degree.", "options": ["will finish", "will have finished", "finish", "finished"], "correct": 1, "level": "B2"},
    {"id": 8, "text": "He speaks English as if he ___ British.", "options": ["is", "was", "were", "be"], "correct": 2, "level": "B2"},
    {"id": 9, "text": "Choose the correct sentence:", "options": ["Despite of the rain, we went out.", "Despite the rain, we went out.", "Despite it rained, we went out.", "Despite raining, we went out."], "correct": 1, "level": "C1"},
    {"id": 10, "text": "'To take something for granted' means:", "options": ["To be very grateful", "To not appreciate something's value", "To take an exam", "To grant permission"], "correct": 1, "level": "C1"},
    {"id": 11, "text": "Choose the most nuanced synonym for 'ubiquitous':", "options": ["Rare", "Omnipresent", "Ancient", "Fragile"], "correct": 1, "level": "C2"},
    {"id": 12, "text": "Identify the correct use of the subjunctive:", "options": ["I suggest he goes now.", "I suggest he go now.", "I suggest he going now.", "I suggest him to go now."], "correct": 1, "level": "C2"},
]

LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]


def _score_to_level(score: int, total: int) -> str:
    ratio = score / total
    if ratio < 0.20: return "A1"
    if ratio < 0.35: return "A2"
    if ratio < 0.55: return "B1"
    if ratio < 0.70: return "B2"
    if ratio < 0.90: return "C1"
    return "C2"


@router.get("/questions")
def get_questions(current_user: User = Depends(get_current_user)):
    # On ne renvoie jamais l'index de la bonne réponse au client
    return [{"id": q["id"], "text": q["text"], "options": q["options"]} for q in QUESTIONS]


@router.post("/submit", response_model=AssessmentResult)
def submit_assessment(
    data: SubmitAnswers,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    score = 0
    for q in QUESTIONS:
        chosen = data.answers.get(q["id"])
        if chosen is not None and chosen == q["correct"]:
            score += 1

    suggested = _score_to_level(score, len(QUESTIONS))

    assessment = LevelAssessment(
        user_id=current_user.id,
        score=score,
        total_questions=len(QUESTIONS),
        suggested_level=suggested,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    return AssessmentResult(
        id=assessment.id, score=score, total_questions=len(QUESTIONS),
        suggested_level=suggested, is_validated=False, final_level=None,
    )


def _require_admin_or_cm(u: User):
    if u.role not in [UserRole.ADMIN, UserRole.COMMUNITY_MANAGER]:
        raise HTTPException(status_code=403, detail="Réservé aux Admins et Community Managers.")


@router.get("/pending", response_model=List[PendingAssessmentResponse])
def list_pending(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin_or_cm(current_user)
    return db.query(LevelAssessment).filter(LevelAssessment.is_validated == False).order_by(LevelAssessment.created_at.desc()).all()


@router.post("/{assessment_id}/validate")
def validate_assessment(
    assessment_id: int,
    data: ValidateAssessment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_or_cm(current_user)
    if data.final_level not in LEVEL_ORDER:
        raise HTTPException(status_code=400, detail="Niveau invalide.")

    assessment = db.query(LevelAssessment).filter(LevelAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Évaluation introuvable.")
    if assessment.is_validated:
        raise HTTPException(status_code=400, detail="Déjà validée.")

    user = db.query(User).filter(User.id == assessment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Membre introuvable.")

    old_level = user.english_level
    user.english_level = data.final_level
    if old_level != data.final_level:
        db.add(LevelHistory(user_id=user.id, previous_level=old_level, new_level=data.final_level))

    assessment.final_level = data.final_level
    assessment.is_validated = True
    assessment.reviewed_by = current_user.id
    assessment.reviewed_at = datetime.now()

    db.commit()
    return {"message": f"Niveau de {user.full_name} validé : {data.final_level}"}