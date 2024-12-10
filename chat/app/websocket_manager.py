from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.active_users: Dict[str, List[int]] = {}

    async def connect(self, websocket: WebSocket, room_name: str, user_id: int):
        if room_name not in self.active_connections:
            self.active_connections[room_name] = []
        if room_name not in self.active_users:
            self.active_users[room_name] = []

        self.active_connections[room_name].append(websocket)
        if user_id not in self.active_users[room_name]:
            self.active_users[room_name].append(user_id)

    def disconnect(self, websocket: WebSocket, room_name: str, user_id: int):
        if room_name in self.active_connections:
            self.active_connections[room_name].remove(websocket)
            if not self.active_connections[room_name]:
                del self.active_connections[room_name]

        if room_name in self.active_users:
            self.active_users[room_name].remove(user_id)
            if not self.active_users[room_name]:
                del self.active_users[room_name]

    async def broadcast(self, message: str, room_name: str):
        if room_name in self.active_connections:
            for connection in self.active_connections[room_name]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    print(f"Error sending message: {e}")

    def get_active_users(self, room_name: str) -> List[int]:
        return self.active_users.get(room_name, [])



