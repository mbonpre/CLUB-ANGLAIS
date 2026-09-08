from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.post import PostType


# Auteur public — sans email, même logique que pour les projets (endpoint public)
class AuthorPublic(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    text: str


class CommentResponse(BaseModel):
    id: int
    text: str
    created_at: datetime
    author: AuthorPublic

    class Config:
        from_attributes = True


class PostBase(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None
    post_type: PostType = PostType.COMMUNITY


class PostCreate(PostBase):
    pass


class PostResponse(PostBase):
    id: int
    author_id: int
    created_at: datetime
    author: AuthorPublic
    likes_count: int = 0
    comments: List[CommentResponse] = []

    class Config:
        from_attributes = True