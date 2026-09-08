from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.level_history import LevelHistory
from app.models.room import Room, RoomMessage
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/stats", tags=["Statistiques"])


def _require_admin_or_cm(current_user: User):
    if current_user.role not in [UserRole.ADMIN, UserRole.COMMUNITY_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Réservé aux Admins et Community Managers.",
        )


LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]


@router.get("/level-distribution")
def level_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_or_cm(current_user)

    users = db.query(User).all()
    total = len(users)
    counts = {lvl: 0 for lvl in LEVEL_ORDER}
    for u in users:
        if u.english_level in counts:
            counts[u.english_level] += 1

    return {
        "total_members": total,
        "distribution": [
            {"level": lvl, "count": counts[lvl], "percentage": round((counts[lvl] / total) * 100, 1) if total else 0}
            for lvl in LEVEL_ORDER
        ],
    }


@router.get("/engagement")
def engagement_rate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_or_cm(current_user)

    total = db.query(User).count()
    one_week_ago = datetime.now() - timedelta(days=7)
    active_this_week = db.query(User).filter(User.last_login_at >= one_week_ago).count()

    return {
        "total_members": total,
        "active_this_week": active_this_week,
        "engagement_rate": round((active_this_week / total) * 100, 1) if total else 0,
    }


@router.get("/average-progress")
def average_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_or_cm(current_user)

    history = db.query(LevelHistory).order_by(LevelHistory.user_id, LevelHistory.changed_at).all()

    by_user = {}
    for h in history:
        by_user.setdefault(h.user_id, []).append(h)

    durations_days = []
    for user_id, events in by_user.items():
        prev_time = None
        for ev in events:
            if prev_time is not None and ev.previous_level in LEVEL_ORDER and ev.new_level in LEVEL_ORDER:
                if LEVEL_ORDER.index(ev.new_level) > LEVEL_ORDER.index(ev.previous_level):
                    delta_days = (ev.changed_at - prev_time).total_seconds() / 86400
                    durations_days.append(delta_days)
            prev_time = ev.changed_at

    if not durations_days:
        return {
            "average_days_per_level": None,
            "sample_size": 0,
            "message": "Pas encore assez de données — le suivi vient de commencer, les chiffres apparaîtront avec le temps.",
        }

    avg = sum(durations_days) / len(durations_days)
    return {"average_days_per_level": round(avg, 1), "sample_size": len(durations_days)}


# NOUVEAU — activité réelle par salon de discussion
@router.get("/room-activity")
def room_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_or_cm(current_user)

    rooms = db.query(Room).all()
    results = []
    for r in rooms:
        count = db.query(RoomMessage).filter(RoomMessage.room_id == r.id).count()
        results.append({"room_name": r.name, "message_count": count, "is_closed": r.is_closed})

    results.sort(key=lambda x: x["message_count"], reverse=True)
    return results