from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_serializer

from app.services.dates import utc_iso


class AuthorPublic(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True


class RoomReplyPreview(BaseModel):
    """Aperçu léger du message de salon cité par une réponse (façon WhatsApp)."""
    id: int
    content: Optional[str] = None
    sender_id: int

    class Config:
        from_attributes = True


class RoomCreate(BaseModel):
    name: str
    description: Optional[str] = None


class RoomResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#DC2626"
    is_closed: bool
    created_at: datetime
    member_count: int = 0
    message_count: int = 0
    is_member: bool = False
    is_pending: bool = False
    is_creator: bool = False
    pending_count: int = 0

    @field_serializer("created_at")
    def _ser_created_at(self, v: datetime):
        return utc_iso(v)

    class Config:
        from_attributes = True


class RoomMessageResponse(BaseModel):
    id: int
    room_id: int
    sender: AuthorPublic
    content: Optional[str] = None
    media_url: Optional[str] = None
    created_at: datetime
    reply_to_id: Optional[int] = None
    reply_to: Optional[RoomReplyPreview] = None

    @field_serializer("created_at")
    def _ser_created_at(self, v: datetime):
        return utc_iso(v)

    class Config:
        from_attributes = True