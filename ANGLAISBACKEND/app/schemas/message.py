from pydantic import BaseModel
from typing import Optional
from datetime import datetime


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

    class Config:
        from_attributes = True


class ConversationPreview(BaseModel):
    user: AuthorPublic
    last_message: Optional[str] = None
    last_message_at: datetime
    unread_count: int

    class Config:
        from_attributes = True