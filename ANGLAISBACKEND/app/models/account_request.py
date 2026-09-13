from sqlalchemy import Column, Integer, String, DateTime, Enum
from datetime import datetime
import enum
from app.database import Base
from app.models.section import Section

class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class AccountRequest(Base):
    __tablename__ = "account_requests"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    # Le mot de passe est choisi par le demandeur dès la demande (déjà haché) :
    # à l'approbation, le compte est activé avec ce mot de passe, sans avoir besoin
    # d'un service d'envoi d'email pour transmettre un mot de passe temporaire.
    hashed_password = Column(String, nullable=False)
    section = Column(Enum(Section), nullable=True)
    message = Column(String, nullable=True)  # motivation / message libre du demandeur
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    reviewed_at = Column(DateTime, nullable=True)