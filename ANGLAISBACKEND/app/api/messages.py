from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.message import Message
from app.services.websocket import manager

router = APIRouter(prefix="/messages", tags=["Messagerie Privée"])

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Le format attendu depuis le client est: "receiver_id:message"
            if ":" in data:
                receiver_id_str, msg_content = data.split(":", 1)
                receiver_id = int(receiver_id_str)
                await manager.send_personal_message(f"De {user_id}: {msg_content}", receiver_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)