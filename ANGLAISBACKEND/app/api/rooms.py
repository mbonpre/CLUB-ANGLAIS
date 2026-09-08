from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.room import Room, RoomMembership, RoomMessage, MembershipStatus
from app.models.user import User, UserRole
from app.schemas.room import RoomCreate, RoomResponse, RoomMessageResponse
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/rooms", tags=["Salons de discussion"])
PALETTE = ["#DC2626", "#0EA5E9", "#16A34A", "#D97706", "#7C3AED", "#DB2777", "#0D9488", "#EA580C", "#4F46E5", "#65A30D"]

def _require_admin(u: User):
    if u.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Seuls les Admins peuvent créer/fermer un salon.")

def _pick_unique_color(db: Session):
    used = {r.color for r in db.query(Room).all() if r.color}
    for c in PALETTE:
        if c not in used:
            return c
    return PALETTE[db.query(Room).count() % len(PALETTE)]

def _to_response(room, db, current_user):
    member_count = db.query(RoomMembership).filter(RoomMembership.room_id == room.id, RoomMembership.status == MembershipStatus.APPROVED).count()
    message_count = db.query(RoomMessage).filter(RoomMessage.room_id == room.id).count()
    m = db.query(RoomMembership).filter(RoomMembership.room_id == room.id, RoomMembership.user_id == current_user.id).first()
    pending_count = db.query(RoomMembership).filter(RoomMembership.room_id == room.id, RoomMembership.status == MembershipStatus.PENDING).count()
    return RoomResponse(
        id=room.id, name=room.name, description=room.description, color=room.color, is_closed=room.is_closed,
        created_at=room.created_at, member_count=member_count, message_count=message_count,
        is_member=bool(m and m.status == MembershipStatus.APPROVED),
        is_pending=bool(m and m.status == MembershipStatus.PENDING),
        is_creator=(room.created_by == current_user.id),
        pending_count=pending_count if (room.created_by == current_user.id or current_user.role == UserRole.ADMIN) else 0,
    )

@router.post("/", response_model=RoomResponse, status_code=201)
def create_room(data: RoomCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    if db.query(Room).filter(Room.name == data.name).first():
        raise HTTPException(status_code=400, detail="Un salon avec ce nom existe déjà.")
    room = Room(name=data.name, description=data.description, created_by=current_user.id, color=_pick_unique_color(db))
    db.add(room); db.commit(); db.refresh(room)
    db.add(RoomMembership(room_id=room.id, user_id=current_user.id, status=MembershipStatus.APPROVED))
    db.commit()
    return _to_response(room, db, current_user)

@router.get("/", response_model=List[RoomResponse])
def list_rooms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [_to_response(r, db, current_user) for r in db.query(Room).order_by(Room.created_at.desc()).all()]

@router.post("/{room_id}/join")
def join_room(room_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room: raise HTTPException(status_code=404, detail="Salon introuvable.")
    if room.is_closed: raise HTTPException(status_code=400, detail="Ce salon est fermé.")
    existing = db.query(RoomMembership).filter(RoomMembership.room_id == room_id, RoomMembership.user_id == current_user.id).first()
    if existing:
        return {"message": "Déjà membre ou en attente.", "status": existing.status}
    db.add(RoomMembership(room_id=room_id, user_id=current_user.id, status=MembershipStatus.PENDING))
    db.commit()
    return {"message": f"Demande envoyée pour {room.name}.", "status": "pending"}

@router.post("/{room_id}/leave")
def leave_room(room_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = db.query(RoomMembership).filter(RoomMembership.room_id == room_id, RoomMembership.user_id == current_user.id).first()
    if m: db.delete(m); db.commit()
    return {"message": "Vous avez quitté le salon."}

def _check_owner(room, current_user):
    if room.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Seul le créateur du salon (ou un Admin) peut gérer les demandes.")

@router.get("/{room_id}/pending")
def list_pending(room_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room: raise HTTPException(status_code=404, detail="Salon introuvable.")
    _check_owner(room, current_user)
    pending = db.query(RoomMembership).filter(RoomMembership.room_id == room_id, RoomMembership.status == MembershipStatus.PENDING).all()
    return [{"membership_id": p.id, "user_id": p.user_id, "full_name": p.user.full_name} for p in pending]

@router.post("/{room_id}/approve/{membership_id}")
def approve_member(room_id: int, membership_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room: raise HTTPException(status_code=404, detail="Salon introuvable.")
    _check_owner(room, current_user)
    m = db.query(RoomMembership).filter(RoomMembership.id == membership_id, RoomMembership.room_id == room_id).first()
    if not m: raise HTTPException(status_code=404, detail="Demande introuvable.")
    m.status = MembershipStatus.APPROVED
    db.commit()
    return {"message": "Membre approuvé."}

@router.post("/{room_id}/approve-all")
def approve_all(room_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room: raise HTTPException(status_code=404, detail="Salon introuvable.")
    _check_owner(room, current_user)
    pending = db.query(RoomMembership).filter(RoomMembership.room_id == room_id, RoomMembership.status == MembershipStatus.PENDING).all()
    for m in pending:
        m.status = MembershipStatus.APPROVED
    db.commit()
    return {"message": f"{len(pending)} membre(s) approuvé(s)."}

@router.patch("/{room_id}/close")
def close_room(room_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room: raise HTTPException(status_code=404, detail="Salon introuvable.")
    room.is_closed = True; db.commit()
    return {"message": f"Salon {room.name} fermé."}

@router.get("/{room_id}/messages", response_model=List[RoomMessageResponse])
def get_room_messages(room_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = db.query(RoomMembership).filter(RoomMembership.room_id == room_id, RoomMembership.user_id == current_user.id, RoomMembership.status == MembershipStatus.APPROVED).first()
    if not m: raise HTTPException(status_code=403, detail="Vous devez être approuvé dans ce salon.")
    return db.query(RoomMessage).filter(RoomMessage.room_id == room_id).order_by(RoomMessage.created_at.asc()).all()
@router.delete("/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room: raise HTTPException(status_code=404, detail="Salon introuvable.")
    db.delete(room)
    db.commit()
    return {"message": f"Salon {room.name} supprimé définitivement."}