from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.post import PostType

# Schéma simplifié de l'auteur pour éviter d'exposer des données sensibles
class AuthorOut(BaseModel):
    id: int
    full_name: str
    email: str

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
    author: AuthorOut  # Inclut les détails de l'auteur dans la réponse

    class Config:
        from_attributes = True