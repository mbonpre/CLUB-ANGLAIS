from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.database import Base


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Identifiant unique fourni par le navigateur pour ce couple (appareil, navigateur).
    # Un même utilisateur peut avoir plusieurs abonnements (téléphone + PC, etc.).
    endpoint = Column(String, unique=True, nullable=False)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.now)