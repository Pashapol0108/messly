from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException
from jose import jwt
from sqlalchemy.orm import Session
from db import get_db
from models import *
from websocket_manager import ConnectionManager
from config import SECRET_KEY, ALGORITHM
from datetime import datetime
import json
from fastapi.middleware.cors import CORSMiddleware
import requests
import mimetypes
import os

BASE_WEBSITE_URL = "http://website:8000"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  # Разрешить все методы (GET, POST, DELETE и т.д.)
    allow_headers=["*"],  # Разрешить все заголовки
)

manager = ConnectionManager()

# Валидация токена и получение данных пользователя
def get_current_user_from_token(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=403, detail="Invalid token")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user
    except jwt.JWTError:
        raise HTTPException(status_code=403, detail="Invalid token")


@app.websocket("/ws/chat/{chat_id}")
async def websocket_chat(websocket: WebSocket, chat_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user_from_token(token, db)
    if not user:
        await websocket.close(code=1008)
        return

    await websocket.accept()  # Подключаем WebSocket клиента
    await manager.connect(websocket, str(chat_id), user.id)

    try:
        # Помечаем сообщения как прочитанные, если отправитель не текущий пользователь
        unread_messages = db.query(Message).filter(
            Message.chat_id == chat_id,
            Message.status == "unread",
            Message.sender_id != user.id
        ).all()

        for message in unread_messages:
            message.status = "read"
        db.commit()

        if unread_messages:
            await manager.broadcast(
                json.dumps({
                    "type": "read_receipts",
                    "read_message_ids": [msg.id for msg in unread_messages]
                }),
                str(chat_id)
            )

        while True:
            data = await websocket.receive_text()
            parsed_data = json.loads(data)

            if parsed_data.get("content"):
                # Новое сообщение
                sent_at = datetime.utcnow()
                new_message = Message(
                    content=parsed_data["content"],
                    sender_id=user.id,
                    chat_id=chat_id,
                    sent_at=sent_at,
                    status="unread"
                )
                db.add(new_message)
                db.commit()

                # Проверяем наличие других активных пользователей
                active_users = manager.get_active_users(str(chat_id))
                if len(active_users) > 1:  # Если есть другие пользователи
                    new_message.status = "read"
                    db.commit()
                    await manager.broadcast(
                        json.dumps({
                            "type": "read_receipts",
                            "read_message_ids": [new_message.id]
                        }),
                        str(chat_id)
                    )

                response = {
                    "id": new_message.id,
                    "content": new_message.content,
                    "author": user.username,
                    "author_avatar": user.profile_picture or "static/avatars/default.png",  # Добавляем URL аватарки
                    "sent_at": sent_at.isoformat(),
                    "status": new_message.status
                }

                await manager.broadcast(json.dumps(response), str(chat_id))

            if parsed_data.get("file_url"):
                # Сообщение с файлом
                sent_at = datetime.utcnow()
                new_message = Message(
                    file_url=parsed_data["file_url"],
                    sender_id=user.id,
                    chat_id=chat_id,
                    sent_at=sent_at,
                    status="unread",
                )
                db.add(new_message)
                db.commit()

                mime_type, _ = mimetypes.guess_type(parsed_data["file_url"])
                is_image = mime_type and mime_type.startswith("image/")

                active_users = manager.get_active_users(str(chat_id))
                if len(active_users) > 1:  # Если есть другие пользователи
                    new_message.status = "read"
                    db.commit()
                    await manager.broadcast(
                        json.dumps({
                            "type": "read_receipts",
                            "read_message_ids": [new_message.id]
                        }),
                        str(chat_id)
                    )

                response = {
                    "id": new_message.id,
                    "file_url": new_message.file_url,
                    "filename": os.path.basename(new_message.file_url).split("_", 3)[-1],
                    "is_image": is_image,
                    "author": user.username,
                    "author_avatar": user.profile_picture or "static/avatars/default.png",
                    "sent_at": sent_at.isoformat(),
                    "status": new_message.status,
                }

                await manager.broadcast(json.dumps(response), str(chat_id))

    except WebSocketDisconnect:
        manager.disconnect(websocket, str(chat_id), user.id)





@app.post("/ws/send-system-message")
async def send_system_message(data: dict, db: Session = Depends(get_db)):
    chat_id = data.get("chat_id")
    content = data.get("content")

    if not chat_id or not content:
        raise HTTPException(status_code=400, detail="chat_id and content are required")

    # Создаем системное сообщение в базе данных
    sent_at = datetime.utcnow()
    system_message = Message(
        content=content,
        sender_id=0,  # ID системного пользователя
        chat_id=chat_id,
        sent_at=sent_at
    )
    db.add(system_message)
    db.commit()

    # Формируем сообщение для отправки
    response_message = {
        "id": system_message.id,
        "content": system_message.content,
        "author": None,
        "is_system": True,
        "sent_at": sent_at.isoformat(),
    }

    # Рассылаем сообщение всем участникам
    await manager.broadcast(json.dumps(response_message), str(chat_id))

    return {"detail": "System message sent"}


@app.delete("/ws/clear-chat-history/{chat_id}")
async def clear_chat_history(chat_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    # Валидация пользователя
    user = get_current_user_from_token(token, db)
    if not user:
        raise HTTPException(status_code=403, detail="Invalid token")

    # Проверяем, является ли пользователь администратором чата
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if chat.creator_id != user.id:
        raise HTTPException(status_code=403, detail="You are not the admin of this chat")

    messages_with_files = db.query(Message).filter(Message.chat_id == chat_id, Message.file_url != None).all()

    # Отправляем запросы на удаление файлов
    for message in messages_with_files:
        try:
            response = requests.delete(
                f"{BASE_WEBSITE_URL}/delete-file/",
                params={"file_url": message.file_url},
                headers={"Authorization": f"Bearer {token}"},  # Передаем токен для авторизации
            )
            if response.status_code != 200:
                print(f"Failed to delete file: {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"Error connecting to website service: {str(e)}")

    # Удаляем сообщения чата
    db.query(Message).filter(Message.chat_id == chat_id).delete()
    db.commit()

    # Уведомляем всех подключенных пользователей
    notification = {
        "type": "chat_history_cleared",
        "chat_id": chat_id,
        "message": "Chat history has been cleared by the admin"
    }

    await manager.broadcast(json.dumps(notification), str(chat_id))

    return {"detail": "Chat history cleared successfully"}


@app.delete("/ws/delete-message/{message_id}")
async def delete_message(message_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    # Проверяем токен
    user = get_current_user_from_token(token, db)
    if not user:
        raise HTTPException(status_code=403, detail="Invalid token")

    # Проверяем существование сообщения
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.file_url:
        try:
            # Отправляем запрос на удаление файла
            response = requests.delete(
                f"{BASE_WEBSITE_URL}/delete-file/",
                params={"file_url": message.file_url},
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code != 200:
                print(f"Failed to delete file: {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"Error connecting to website service: {str(e)}")

    # Проверяем, имеет ли пользователь доступ к сообщению
    chat = db.query(Chat).filter(Chat.id == message.chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if user.id not in [member.user_id for member in chat.members]:
        raise HTTPException(status_code=403, detail="You are not a member of this chat")

    # Удаляем сообщение
    db.delete(message)
    db.commit()

    # Уведомляем участников чата
    notification = {
        "type": "message_deleted",
        "message_id": message_id,
    }
    await manager.broadcast(json.dumps(notification), str(chat.id))

    return {"detail": "Message deleted successfully"}


@app.post("/ws/add-reaction")
async def add_reaction(data: dict, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user_from_token(token, db)
    if not user:
        raise HTTPException(status_code=403, detail="Invalid token")

    message_id = data.get("message_id")
    reaction_name = data.get("reaction_name")

    if not message_id or not reaction_name:
        raise HTTPException(status_code=400, detail="Message ID and reaction name are required")

    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Проверяем существование реакции
    reaction = db.query(Reaction).filter(Reaction.name == reaction_name).first()
    if not reaction:
        raise HTTPException(status_code=404, detail="Reaction not found")

    # Проверяем, существует ли уже реакция от этого пользователя
    existing_reaction = db.query(MessageReaction).filter_by(
        message_id=message_id, user_id=user.id, reaction_id=reaction.id
    ).first()

    if existing_reaction:
        db.delete(existing_reaction)  # Удаляем, если реакция уже существует
    else:
        new_reaction = MessageReaction(
            message_id=message_id, user_id=user.id, reaction_id=reaction.id
        )
        db.add(new_reaction)
    db.commit()

    # Уведомляем через WebSocket
    reactions = db.query(MessageReaction).filter(MessageReaction.message_id == message_id).all()
    reaction_data = [
        {
            "user_id": r.user_id,
            "username": r.author.username,
            "reaction_name": r.reaction.name,
            "avatar": r.author.profile_picture or "static/avatars/default.png",
        }
        for r in reactions
    ]

    notification = {
        "type": "reaction_update",
        "message_id": message_id,
        "reactions": reaction_data,
    }
    await manager.broadcast(json.dumps(notification), str(message.chat_id))

    return {"detail": "Reaction updated"}

