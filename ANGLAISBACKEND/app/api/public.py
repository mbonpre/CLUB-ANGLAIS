import time
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/public", tags=["Public"])

_cache = {"value": None, "at": 0.0}
TTL_SECONDS = 600  # le chiffre est recalculé au plus toutes les 10 minutes


@router.get("/stats")
def public_stats(db: Session = Depends(get_db)):
    """Renvoie uniquement le nombre de membres actifs, aucune donnée personnelle."""
    now = time.time()
    if _cache["value"] is None or now - _cache["at"] > TTL_SECONDS:
        count = (
            db.query(func.count(User.id))
            .filter(User.is_active == True)  # noqa: E712
            .scalar()
        )
        _cache["value"] = count or 0
        _cache["at"] = now
    return {"members": _cache["value"]}
