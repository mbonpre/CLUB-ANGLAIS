import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.level_assessment import LevelAssessment
from app.models.level_history import LevelHistory
from app.models.assessment_question import AssessmentQuestion
from app.schemas.level_assessment import (
    SubmitAnswers, AssessmentResult, PendingAssessmentResponse, ValidateAssessment,
    QuestionPublic, QuestionAdmin, QuestionCreate, QuestionUpdate,
)
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/assessment", tags=["Évaluation de niveau"])
LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]


def _require_admin_or_cm(u: User):
    if u.role not in [UserRole.ADMIN, UserRole.COMMUNITY_MANAGER]:
        raise HTTPException(status_code=403, detail="Réservé aux Admins et Community Managers.")


def _score_to_level(score: int, total: int) -> str:
    if total == 0:
        return "A1"
    ratio = score / total
    if ratio < 0.20: return "A1"
    if ratio < 0.35: return "A2"
    if ratio < 0.55: return "B1"
    if ratio < 0.70: return "B2"
    if ratio < 0.90: return "C1"
    return "C2"


# --- Passage du test (membre) ---

@router.get("/questions", response_model=List[QuestionPublic])
def get_questions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    questions = db.query(AssessmentQuestion).filter(AssessmentQuestion.is_active == True).all()
    return [QuestionPublic(id=q.id, text=q.text, options=json.loads(q.options)) for q in questions]


@router.post("/submit", response_model=AssessmentResult)
def submit_assessment(
    data: SubmitAnswers,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    questions = db.query(AssessmentQuestion).filter(AssessmentQuestion.is_active == True).all()
    if not questions:
        raise HTTPException(status_code=400, detail="Aucune question disponible pour le moment.")

    score = sum(1 for q in questions if data.answers.get(q.id) == q.correct_index)
    suggested = _score_to_level(score, len(questions))

    # NOUVEAU — le niveau est appliqué immédiatement (autonomie machine),
    # l'admin pourra ensuite confirmer ou corriger via /validate
    old_level = current_user.english_level
    current_user.english_level = suggested
    if old_level != suggested:
        db.add(LevelHistory(user_id=current_user.id, previous_level=old_level, new_level=suggested))

    assessment = LevelAssessment(
        user_id=current_user.id, score=score, total_questions=len(questions), suggested_level=suggested,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    return AssessmentResult(
        id=assessment.id, score=score, total_questions=len(questions),
        suggested_level=suggested, is_validated=False, final_level=None,
    )


# --- Revue admin (confirmer ou corriger un résultat déjà appliqué) ---

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
        raise HTTPException(status_code=400, detail="Déjà traitée.")

    user = db.query(User).filter(User.id == assessment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Membre introuvable.")

    # Si l'admin corrige (niveau différent de celui déjà appliqué), on retrace le changement
    if user.english_level != data.final_level:
        old_level = user.english_level
        user.english_level = data.final_level
        db.add(LevelHistory(user_id=user.id, previous_level=old_level, new_level=data.final_level))

    assessment.final_level = data.final_level
    assessment.is_validated = True
    assessment.reviewed_by = current_user.id
    assessment.reviewed_at = datetime.now()

    db.commit()
    return {"message": f"Niveau de {user.full_name} confirmé : {data.final_level}"}


# --- Gestion des questions (admin uniquement, modifiable à tout moment) ---

@router.get("/admin/questions", response_model=List[QuestionAdmin])
def admin_list_questions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin_or_cm(current_user)
    questions = db.query(AssessmentQuestion).order_by(AssessmentQuestion.id).all()
    return [QuestionAdmin(id=q.id, text=q.text, options=json.loads(q.options), correct_index=q.correct_index, level=q.level, is_active=q.is_active) for q in questions]


@router.post("/admin/questions", response_model=QuestionAdmin, status_code=201)
def admin_create_question(data: QuestionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin_or_cm(current_user)
    if len(data.options) != 4:
        raise HTTPException(status_code=400, detail="Il faut exactement 4 options.")
    q = AssessmentQuestion(text=data.text, options=json.dumps(data.options), correct_index=data.correct_index, level=data.level, is_active=data.is_active)
    db.add(q); db.commit(); db.refresh(q)
    return QuestionAdmin(id=q.id, text=q.text, options=data.options, correct_index=q.correct_index, level=q.level, is_active=q.is_active)


@router.put("/admin/questions/{question_id}", response_model=QuestionAdmin)
def admin_update_question(question_id: int, data: QuestionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin_or_cm(current_user)
    q = db.query(AssessmentQuestion).filter(AssessmentQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question introuvable.")
    if len(data.options) != 4:
        raise HTTPException(status_code=400, detail="Il faut exactement 4 options.")
    q.text = data.text; q.options = json.dumps(data.options); q.correct_index = data.correct_index
    q.level = data.level; q.is_active = data.is_active
    db.commit()
    return QuestionAdmin(id=q.id, text=q.text, options=data.options, correct_index=q.correct_index, level=q.level, is_active=q.is_active)


@router.delete("/admin/questions/{question_id}")
def admin_delete_question(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin_or_cm(current_user)
    q = db.query(AssessmentQuestion).filter(AssessmentQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question introuvable.")
    db.delete(q); db.commit()
    return {"message": "Question supprimée."}