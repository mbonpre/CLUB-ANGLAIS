from fastapi import APIRouter, Header, HTTPException
import datetime
import enum
import json

from app.database import engine, Base
from app.models import (
    user, post, message, project, account_request, level_history, room,
    level_assessment, assessment_question, section_history
)

router = APIRouter()

EXPORT_SECRET = "change-moi-un-secret-temporaire-123"


def _default(o):
    if isinstance(o, (datetime.datetime, datetime.date)):
        return o.isoformat()
    if isinstance(o, enum.Enum):
        return o.value
    return str(o)


@router.get("/export-all-data-temp")
def export_all_data(x_export_secret: str = Header(None)):
    if x_export_secret != EXPORT_SECRET:
        raise HTTPException(status_code=403, detail="Interdit.")

    data = {}
    with engine.connect() as conn:
        for table in Base.metadata.sorted_tables:
            rows = conn.execute(table.select()).mappings().all()
            data[table.name] = [dict(row) for row in rows]

    return json.loads(json.dumps(data, default=_default))