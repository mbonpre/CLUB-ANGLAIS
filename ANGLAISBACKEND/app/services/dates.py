from datetime import datetime, timezone


def utc_now() -> datetime:
    """À utiliser comme default des colonnes DateTime (remplace datetime.utcnow)."""
    return datetime.now(timezone.utc)


def utc_iso(dt: datetime | None) -> str | None:
    """Sérialise une date en ISO 8601 avec fuseau explicite (+00:00).
    Les anciennes lignes 'naïves' en base sont considérées comme UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()