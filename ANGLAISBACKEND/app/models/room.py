from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, UniqueConstraint, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class MembershipStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    color = Column(String, nullable=True, default="#DC2626")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_closed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    memberships = relationship("RoomMembership", back_populates="room", cascade="all, delete-orphan")
    messages = relationship("RoomMessage", back_populates="room", cascade="all, delete-orphan")


class RoomMembership(Base):
    __tablename__ = "room_memberships"
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_room_member"),)

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(MembershipStatus), default=MembershipStatus.PENDING, nullable=False)
    joined_at = Column(DateTime, default=datetime.now)

    room = relationship("Room", back_populates="memberships")
    user = relationship("User")


class RoomMessage(Base):
    __tablename__ = "room_messages"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=True)
    media_url = Column(String, nullable=True)

    # --- Réponse à un message de salon (façon WhatsApp) ---
    # ondelete="SET NULL" : si le message cité est supprimé, la réponse reste
    # mais perd simplement sa citation, au lieu de bloquer la suppression.
    reply_to_id = Column(Integer, ForeignKey("room_messages.id", ondelete="SET NULL"), nullable=True)
    # remote_side=[id] : indispensable pour une relation vers la même table,
    # sinon SQLAlchemy ne sait pas quel côté est le message cité.
    reply_to = relationship("RoomMessage", remote_side=[id], uselist=False, foreign_keys=[reply_to_id])

    created_at = Column(DateTime, default=datetime.now)

    room = relationship("Room", back_populates="messages")
    sender = relationship("User")