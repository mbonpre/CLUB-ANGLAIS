import json

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List
from jose import jwt, JWTError
from pydantic import BaseModel

from app.database import get_db, SessionLocal
from app.models.message import Message
from app.models.user import User
from app.models.room import Room, RoomMembership, RoomMessage
from app.schemas.message import MessageResponse, ConversationPreview
from app.services.auth_utils import get_current_user, SECRET_KEY, ALGORITHM
from app.services.websocket import manager

router = APIRouter(prefix="/messages", tags=["Messagerie Privée"])


def _get_user_id_from_token(token: str) -> int:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload.get("sub")
    if user_id is None:
        raise ValueError("Token sans identifiant utilisateur")
    return int(user_id)


def _reply_preview(replied_message) -> dict | None:
    """Construit un aperçu léger du message cité (façon WhatsApp), sans dupliquer
    de données : juste de quoi afficher la citation dans la bulle."""
    if not replied_message:
        return None
    return {
        "id": replied_message.id,
        "content": replied_message.content,
        "sender_id": replied_message.sender_id if hasattr(replied_message, "sender_id") else None,
    }


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        user_id = _get_user_id_from_token(token)
    except (JWTError, ValueError):
        await websocket.accept()
        await websocket.close(code=4001)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            room_id = data.get("room_id")

            # --- Message de SALON (diffusion à tous les membres du salon) ---
            if room_id is not None:
                content = (data.get("content") or "").strip()
                media_url = data.get("media_url")
                reply_to_id = data.get("reply_to_id")
                if not content and not media_url:
                    continue

                db = SessionLocal()
                try:
                    membership = db.query(RoomMembership).filter(
                        RoomMembership.room_id == room_id, RoomMembership.user_id == user_id
                    ).first()
                    room = db.query(Room).filter(Room.id == room_id).first()
                    if not membership or not room or room.is_closed:
                        continue

                    new_msg = RoomMessage(
                        room_id=room_id,
                        sender_id=user_id,
                        content=content or None,
                        media_url=media_url,
                        reply_to_id=reply_to_id,
                    )
                    db.add(new_msg)
                    db.commit()
                    db.refresh(new_msg)

                    sender = db.query(User).filter(User.id == user_id).first()
                    member_ids = [m.user_id for m in db.query(RoomMembership).filter(RoomMembership.room_id == room_id).all()]

                    payload = {
                        "type": "room_message",
                        "id": new_msg.id,
                        "room_id": room_id,
                        "sender": {"id": sender.id, "full_name": sender.full_name},
                        "content": new_msg.content,
                        "media_url": new_msg.media_url,
                        "created_at": new_msg.created_at.isoformat(),
                        "reply_to_id": new_msg.reply_to_id,
                        "reply_to": _reply_preview(getattr(new_msg, "reply_to", None)),
                    }
                finally:
                    db.close()

                for member_id in member_ids:
                    await manager.send_personal_message(payload, member_id)
                continue

            # --- Message PRIVÉ (1-à-1, comportement existant inchangé) ---
            receiver_id = data.get("receiver_id")
            content = (data.get("content") or "").strip()
            media_url = data.get("media_url")
            reply_to_id = data.get("reply_to_id")

            if receiver_id is None or (not content and not media_url):
                continue

            db = SessionLocal()
            try:
                new_message = Message(
                    sender_id=user_id,
                    receiver_id=int(receiver_id),
                    content=content or None,
                    media_url=media_url,
                    reply_to_id=reply_to_id,
                )
                db.add(new_message)
                db.commit()
                db.refresh(new_message)
                payload = {
                    "type": "private_message",
                    "id": new_message.id,
                    "sender_id": new_message.sender_id,
                    "receiver_id": new_message.receiver_id,
                    "content": new_message.content,
                    "media_url": new_message.media_url,
                    "is_read": new_message.is_read,
                    "created_at": new_message.created_at.isoformat(),
                    "reply_to_id": new_message.reply_to_id,
                    "reply_to": _reply_preview(getattr(new_message, "reply_to", None)),
                }
            finally:
                db.close()

            await manager.send_personal_message(payload, int(receiver_id))
            await manager.send_personal_message(payload, user_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)


@router.get("/conversations", response_model=List[ConversationPreview])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msgs = (
        db.query(Message)
        .filter(or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id))
        .order_by(Message.created_at.desc())
        .all()
    )

    last_by_contact = {}
    unread_counts = {}
    for m in msgs:
        other_id = m.receiver_id if m.sender_id == current_user.id else m.sender_id
        if other_id not in last_by_contact:
            last_by_contact[other_id] = m
        if m.receiver_id == current_user.id and not m.is_read:
            unread_counts[other_id] = unread_counts.get(other_id, 0) + 1

    results = []
    for other_id, last_msg in last_by_contact.items():
        other_user = db.query(User).filter(User.id == other_id).first()
        if not other_user:
            continue
        results.append(ConversationPreview(
            user=other_user,
            last_message=last_msg.content or "📎 Pièce jointe",
            last_message_at=last_msg.created_at,
            unread_count=unread_counts.get(other_id, 0),
        ))

    results.sort(key=lambda r: r.last_message_at, reverse=True)
    return results


class MessageEdit(BaseModel):
    content: str


@router.patch("/{message_id}", response_model=MessageResponse)
async def edit_message(
    message_id: int,
    data: MessageEdit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message introuvable.")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez modifier que vos propres messages.")

    msg.content = data.content.strip()
    db.commit()
    db.refresh(msg)

    payload = {
        "type": "private_message", "id": msg.id, "sender_id": msg.sender_id, "receiver_id": msg.receiver_id,
        "content": msg.content, "media_url": msg.media_url, "is_read": msg.is_read,
        "created_at": msg.created_at.isoformat(), "edited": True,
        "reply_to_id": msg.reply_to_id, "reply_to": _reply_preview(getattr(msg, "reply_to", None)),
    }
    await manager.send_personal_message(payload, msg.receiver_id)
    await manager.send_personal_message(payload, msg.sender_id)
    return msg


@router.delete("/{message_id}")
async def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message introuvable.")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez supprimer que vos propres messages.")

    receiver_id, sender_id, msg_id = msg.receiver_id, msg.sender_id, msg.id
    db.delete(msg)
    db.commit()

    await manager.send_personal_message({"deleted_id": msg_id}, receiver_id)
    await manager.send_personal_message({"deleted_id": msg_id}, sender_id)
    return {"message": "Message supprimé.", "id": msg_id}


@router.get("/{other_user_id}", response_model=List[MessageResponse])
def get_conversation_history(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.created_at.asc())
        .all()
    )

    updated = False
    for m in messages:
        if m.receiver_id == current_user.id and not m.is_read:
            m.is_read = True
            updated = True
    if updated:
        db.commit()

    return messages


class ReactionIn(BaseModel):
    emoji: str


@router.post("/{message_id}/react")
async def react_to_message(message_id: int, data: ReactionIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message introuvable.")
    reactions = json.loads(msg.reactions) if msg.reactions else {}
    reactions[data.emoji] = reactions.get(data.emoji, 0) + 1
    msg.reactions = json.dumps(reactions)
    db.commit()
    payload = {"type": "reaction_update", "id": msg.id, "reactions": reactions}
    await manager.send_personal_message(payload, msg.sender_id)
    await manager.send_personal_message(payload, msg.receiver_id)
    return {"reactions": reactions}


# --- Notifications de validation de compte (nouveau) ---------------------
# Hook prêt à l'emploi : appelez cette fonction depuis votre route
# d'approbation de compte (probablement dans app/api/auth.py ou un routeur
# admin que je n'ai pas reçu) pour déclencher la notification "façon
# WhatsApp" côté client dès qu'un compte est validé.
#
# Exemple d'utilisation dans la route qui valide un compte :
#
#   from app.api.messages import notify_account_validated
#   await notify_account_validated(user.id)
#
async def notify_account_validated(user_id: int, message: str = "Votre compte a été validé. Bienvenue !"):
    await manager.send_personal_message({"type": "account_validated", "message": message}, user_id)