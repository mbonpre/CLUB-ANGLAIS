from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base
from app.services.dates import utc_now


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=True)
    media_url = Column(String, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    reactions = Column(String, nullable=True)  # JSON ex: {"❤️": [1, 4], "👍": [2]} (emoji -> ids utilisateurs)

    # Réponse à un message (façon WhatsApp).
    # ondelete="SET NULL" : si le message cité est supprimé, la réponse reste
    # mais perd simplement sa citation.
    reply_to_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    # remote_side=[id] : indispensable pour une relation vers la même table.
    reply_to = relationship("Message", remote_side=[id], uselist=False, foreign_keys=[reply_to_id])

    created_at = Column(DateTime, default=utc_now)