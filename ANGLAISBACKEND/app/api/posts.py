from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.post import Post, PostType
from app.models.user import User, UserRole
from app.schemas.post import PostCreate, PostResponse
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/posts", tags=["Publications (double flux)"])

@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    post_data: PostCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Restreindre le flux officiel aux Community Managers et Admin uniquement
    if post_data.post_type == PostType.OFFICIAL and current_user.role not in [UserRole.COMMUNITY_MANAGER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les Community Managers et Admins peuvent publier dans le flux officiel."
        )

    new_post = Post(
        title=post_data.title,
        content=post_data.content,
        image_url=post_data.image_url,
        post_type=post_data.post_type,
        author_id=current_user.id
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.get("/", response_model=List[PostResponse])
def get_posts(
    post_type: Optional[PostType] = Query(None, description="Filtrer par 'official' ou 'community'"),
    db: Session = Depends(get_db)
):
    query = db.query(Post)
    if post_type:
        query = query.filter(Post.post_type == post_type)
    return query.order_by(Post.created_at.desc()).all()