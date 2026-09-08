from app.database import SessionLocal
from app.models import user, post, message, project, account_request, level_history, room
from app.models.user import User

db = SessionLocal()
u = db.query(User).filter(User.email == "admin@clubanglais.com").first()
if u:
    u.is_super_admin = True
    db.commit()
    print(f">>> {u.full_name} ({u.email}) est maintenant Super Admin.")
else:
    print("Compte admin@clubanglais.com introuvable.")
db.close()