import os
import json
import logging
from typing import Optional

from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException

from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)

# À définir en variables d'environnement (générées une fois avec
# generate_vapid_keys.py, voir le script fourni séparément).
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY")
VAPID_CLAIMS_EMAIL = os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:contact@clubanglais.com")


def send_push_to_user(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    url: str = "/",
    tag: Optional[str] = None,
) -> None:
    """Envoie une notification push à tous les appareils abonnés d'un utilisateur.

    Best-effort : n'importe quelle erreur réseau/HTTP sur un abonnement donné
    n'empêche pas les autres d'être notifiés. Un abonnement expiré ou révoqué
    par le navigateur (404/410) est automatiquement supprimé de la base.
    """
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("VAPID_PRIVATE_KEY / VAPID_PUBLIC_KEY non configurées : notification push ignorée.")
        return

    subscriptions = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    if not subscriptions:
        return

    payload = json.dumps({"title": title, "body": body, "url": url, "tag": tag})

    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_CLAIMS_EMAIL},
            )
        except WebPushException as e:
            status_code = getattr(e.response, "status_code", None)
            if status_code in (404, 410):
                # L'abonnement n'existe plus côté navigateur (désinstallé, cache
                # vidé, etc.) : on le retire pour ne plus essayer de l'utiliser.
                db.delete(sub)
                db.commit()
            else:
                logger.warning(f"Échec envoi push (abonnement {sub.id}) : {e}")
        except Exception as e:
            logger.warning(f"Erreur inattendue lors de l'envoi push (abonnement {sub.id}) : {e}")