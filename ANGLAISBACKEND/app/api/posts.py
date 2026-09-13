from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.post import Post, PostType, PostLike, PostComment
from app.models.user import User, UserRole
from app.schemas.post import PostCreate, PostResponse, CommentCreate, CommentResponse
from app.services.auth_utils import get_current_user
from pydantic import BaseModel

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


# --- Likes ---

@router.post("/{post_id}/like")
def toggle_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publication introuvable.")

    existing = (
        db.query(PostLike)
        .filter(PostLike.post_id == post_id, PostLike.user_id == current_user.id)
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        liked = False
    else:
        db.add(PostLike(post_id=post_id, user_id=current_user.id))
        db.commit()
        liked = True

    db.refresh(post)
    return {"liked": liked, "likes_count": post.likes_count}


@router.get("/my-likes")
def get_my_likes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Renvoie la liste des ids de posts likés par l'utilisateur connecté,
    # pour que le frontend sache lesquels afficher comme "déjà aimés" au chargement.
    rows = db.query(PostLike.post_id).filter(PostLike.user_id == current_user.id).all()
    return [r[0] for r in rows]


# --- Commentaires ---

@router.post("/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    post_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publication introuvable.")

    if not comment_data.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le commentaire ne peut pas être vide.")

    new_comment = PostComment(
        post_id=post_id,
        author_id=current_user.id,
        text=comment_data.text.strip(),
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment
# À AJOUTER dans app/api/posts.py (après add_comment) :
@router.post("/comments/{comment_id}/like")
def like_comment(comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comment = db.query(PostComment).filter(PostComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Commentaire introuvable.")
    comment.likes_count += 1
    db.commit()
    return {"likes_count": comment.likes_count}
class PostUpdate(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None


@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publication introuvable.")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez modifier que vos propres publications.")

    post.title = data.title
    post.content = data.content
    post.image_url = data.image_url
    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publication introuvable.")
    if post.author_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.COMMUNITY_MANAGER]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez supprimer que vos propres publications.")

    db.delete(post)
    db.commit()
    return {"message": "Publication supprimée."}