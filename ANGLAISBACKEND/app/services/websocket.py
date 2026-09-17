from fastapi import WebSocket
from typing import Dict, List


class ConnectionManager:
    def __init__(self):
        # Un utilisateur peut désormais avoir plusieurs connexions actives
        # (plusieurs onglets, plusieurs appareils) — façon WhatsApp Web.
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket = None):
        if user_id not in self.active_connections:
            return
        if websocket is not None:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws is not websocket
            ]
        else:
            # Compatibilité : si on appelle disconnect() sans préciser la
            # connexion exacte, on vide tout pour cet utilisateur.
            self.active_connections[user_id] = []

        if not self.active_connections.get(user_id):
            self.active_connections.pop(user_id, None)

    async def send_personal_message(self, payload: dict, receiver_id: int):
        connections = self.active_connections.get(receiver_id, [])
        dead_connections = []

        for ws in connections:
            try:
                await ws.send_json(payload)
            except Exception:
                # Connexion morte (fermée sans que le serveur l'ait détecté) :
                # on la marque pour nettoyage après la boucle.
                dead_connections.append(ws)

        for ws in dead_connections:
            self.disconnect(receiver_id, ws)


manager = ConnectionManager()