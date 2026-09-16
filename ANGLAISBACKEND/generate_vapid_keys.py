"""
À exécuter UNE SEULE FOIS, en local (pas besoin de le déployer) :

    pip install py_vapid cryptography
    python generate_vapid_keys.py

Copie ensuite les deux valeurs affichées dans les variables d'environnement
de ton backend (Render > Environment) :

    VAPID_PRIVATE_KEY=...
    VAPID_PUBLIC_KEY=...
    VAPID_CLAIMS_EMAIL=mailto:tonadresse@example.com   (optionnel, valeur par défaut fournie)

Ne partage jamais VAPID_PRIVATE_KEY publiquement (ne pas la committer sur GitHub).
"""
import base64
from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid02 as Vapid

v = Vapid()
v.generate_keys()

private_raw = v.private_key.private_numbers().private_value.to_bytes(32, "big")
private_b64 = base64.urlsafe_b64encode(private_raw).rstrip(b"=").decode()

public_raw = v.public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint,
)
public_b64 = base64.urlsafe_b64encode(public_raw).rstrip(b"=").decode()

print("VAPID_PRIVATE_KEY =", private_b64)
print("VAPID_PUBLIC_KEY  =", public_b64)