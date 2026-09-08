from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AuthorPublic(BaseModel):
    id: int
    full_name: str
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
    class Config:
        from_attributes = True

class RoomMessageResponse(BaseModel):
    id: int
    room_id: int
    sender: AuthorPublic
    content: Optional[str] = None
    media_url: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True