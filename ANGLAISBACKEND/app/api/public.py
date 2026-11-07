import os
import time
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
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


# Les numéros sont dans les variables d'environnement Render, jamais dans le code.
WA_CONTACTS = {
    "yee": "WA_YEE",
    "fidele": "WA_FIDELE",
    "immaculee": "WA_IMMACULEE",
    "marcellin": "WA_MARCELLIN",
}


@router.get("/wa/{contact}")
def whatsapp_redirect(contact: str, m: str = Query("", max_length=300)):
    """Redirige vers WhatsApp sans exposer le numéro dans le code du site."""
    var = WA_CONTACTS.get(contact)
    number = "".join(c for c in os.getenv(var, "") if c.isdigit()) if var else ""
    if not number:
        raise HTTPException(status_code=404, detail="Contact introuvable")
    url = "https://wa.me/" + number
    if m:
        url += "?text=" + quote(m, safe="")
    return RedirectResponse(url, status_code=302)
