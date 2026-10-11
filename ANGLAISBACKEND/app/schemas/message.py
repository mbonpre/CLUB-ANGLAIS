from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_serializer

from app.services.dates import utc_iso


class AuthorPublic(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True


class ReplyPreview(BaseModel):
    """Aperçu léger du message cité par une réponse (façon WhatsApp)."""
    id: int
    content: Optional[str] = None
    sender_id: int

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: Optional[str] = None
    media_url: Optional[str] = None
    is_read: bool
    created_at: datetime
    reply_to_id: Optional[int] = None
    reply_to: Optional[ReplyPreview] = None
    # JSON texte {emoji: [ids utilisateurs]} — le frontend (parseReactions) accepte une chaîne
    reactions: Optional[str] = None

    @field_serializer("created_at")
    def _ser_created_at(self, v: datetime):
        return utc_iso(v)

    class Config:
        from_attributes = True


class ConversationPreview(BaseModel):
    user: AuthorPublic
    last_message: Optional[str] = None
    last_message_at: datetime
    unread_count: int

    @field_serializer("last_message_at")
    def _ser_last_message_at(self, v: datetime):
        return utc_iso(v)

    class Config:
        from_attributes = True