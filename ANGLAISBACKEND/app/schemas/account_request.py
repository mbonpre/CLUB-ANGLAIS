from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.account_request import RequestStatus


class AccountRequestCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    message: Optional[str] = None


class AccountRequestResponse(BaseModel):
    id: int
    full_name: str
    email: str
    message: Optional[str] = None
    status: RequestStatus
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True