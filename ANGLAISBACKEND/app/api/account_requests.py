from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.account_request import AccountRequest, RequestStatus
from app.models.user import User, UserRole
from app.schemas.account_request import AccountRequestCreate, AccountRequestResponse
from app.services.auth_utils import get_current_user, hash_password

router = APIRouter(prefix="/account-requests", tags=["Demandes de compte"])


def _require_admin_or_cm(current_user: User):
    if current_user.role not in [UserRole.ADMIN, UserRole.COMMUNITY_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les Admins et Community Managers peuvent gérer les demandes de compte.",
        )


# Route publique : n'importe quel visiteur peut soumettre une demande (aucun compte créé ici)
@router.post("/", response_model=AccountRequestResponse, status_code=status.HTTP_201_CREATED)
def create_account_request(data: AccountRequestCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email.",
        )

    existing_request = (
        db.query(AccountRequest)
        .filter(AccountRequest.email == data.email, AccountRequest.status == RequestStatus.PENDING)
        .first()
    )
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une demande est déjà en attente pour cet email.",
        )

    new_request = AccountRequest(
        full_name=data.full_name,
        email=data.email,
        hashed_password=hash_password(data.password),
        message=data.message,
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request


# Liste des demandes — réservée aux Admins/Community Managers
@router.get("/", response_model=List[AccountRequestResponse])
def list_account_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_or_cm(current_user)
    return db.query(AccountRequest).order_by(AccountRequest.created_at.desc()).all()


@router.post("/{request_id}/approve", status_code=status.HTTP_201_CREATED)
def approve_account_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_or_cm(current_user)

    req = db.query(AccountRequest).filter(AccountRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable.")
    if req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cette demande a déjà été traitée.")

    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Un compte existe déjà avec cet email.")

    new_user = User(
        full_name=req.full_name,
        email=req.email,
        hashed_password=req.hashed_password,  # déjà haché à la demande
        role=UserRole.MEMBER,
        english_level="A1",
        is_active=True,
    )
    db.add(new_user)

    req.status = RequestStatus.APPROVED
    from datetime import datetime
    req.reviewed_at = datetime.now()

    db.commit()
    db.refresh(new_user)
    return {"message": f"Compte créé pour {new_user.full_name}.", "user_id": new_user.id}


@router.post("/{request_id}/reject")
def reject_account_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_or_cm(current_user)

    req = db.query(AccountRequest).filter(AccountRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable.")
    if req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cette demande a déjà été traitée.")

    req.status = RequestStatus.REJECTED
    from datetime import datetime
    req.reviewed_at = datetime.now()
    db.commit()
    return {"message": "Demande refusée."}