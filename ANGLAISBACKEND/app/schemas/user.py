from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import UserRole

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Optional[UserRole] = UserRole.MEMBER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    bio: Optional[str] = None
    skills: Optional[str] = None
    profile_image: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    skills: Optional[str] = None

class ProfileImageUpdate(BaseModel):
    profile_image: str