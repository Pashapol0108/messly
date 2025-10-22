from fastapi import FastAPI, HTTPException, Depends, Form, File, UploadFile, Query
from sqlalchemy.testing.suite.test_reflection import users

from auth import create_access_token, verify_password, get_password_hash, get_current_user
from crud import create_user, get_user_by_email, get_user_by_username
from db import *
from schemas import Token, UserIn, ChatCreate, AddMemberRequest, RemoveMemberRequest, PersonalChatRequest, \
    UsernameUpdateRequest, UpdateDescriptionRequest, UserProfile, ChatNameUpdate, UserUpdate
from models import *
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import joinedload
import requests
import time
import os
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import subqueryload
import mimetypes
from fastapi.responses import JSONResponse
#uvicorn website.app.main:app --reload
#uvicorn chat.app.main:app --reload --port 8001


app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR =  os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")


@app.post("/register")
def register(user: UserIn, db: Session = Depends(get_db)):
    db_user = get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user_by_username = get_user_by_username(db, user.username)
    if db_user_by_username:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Создаем пользователя
    new_user = create_user(db, user.email, user.username, user.password)

    # Автоматическое создание чата с Messly
    messly_user = db.query(User).filter(User.id == 100).first()  # Получаем системного пользователя
    if not messly_user:
        raise HTTPException(status_code=500, detail="Messly user not found")

    # Проверяем, существует ли уже чат с Messly (не обязательно, но на всякий случай)
    existing_chat = db.query(Chat).filter(
        Chat.type == "personal",
        Chat.members.any(user_id=new_user.id),
        Chat.members.any(user_id=messly_user.id)
    ).first()

    if not existing_chat:
        # Создаем новый чат
        chat_name = f"{new_user.username},Hello world!"
        new_chat = Chat(name=chat_name, type="personal", creator_id=messly_user.id)
        db.add(new_chat)
        db.commit()

        # Добавляем участников в чат
        db.add_all([
            ChatMember(chat_id=new_chat.id, user_id=new_user.id, role="member"),
            ChatMember(chat_id=new_chat.id, user_id=messly_user.id, role="member"),
        ])
        db.commit()

        welcome_message = Message(
            content="Добро пожаловать в наш мессенджер! Приятного пользования! Ниже есть файл, в котором описаны основные функции приложения. Если у вас есть вопросы или пожелания - нам будет приятно их выслушать! @Павел (не Дуров) CEO Messly",
            sender_id=messly_user.id,
            chat_id=new_chat.id,
            sent_at=datetime.utcnow(),
            status="read",
        )
        db.add(welcome_message)
        db.commit()

        welcome_message = Message(
            file_url ="static/others/Инструкция.docx",
            sender_id=messly_user.id,
            chat_id=new_chat.id,
            sent_at=datetime.utcnow(),
            status="read",
        )
        db.add(welcome_message)
        db.commit()

        welcome_message = Message(
            file_url="static/others/Hello.gif",
            sender_id=messly_user.id,
            chat_id=new_chat.id,
            sent_at=datetime.utcnow(),
            status="read",
        )
        db.add(welcome_message)
        db.commit()

    return {"message": "User created successfully"}


@app.post("/login", response_model=Token)
def login(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    user.status = "online"
    db.commit()

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}


@app.post("/logout")
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Обновляем статус пользователя на "оффлайн"
    user.status = "offline"
    db.commit()
    return {"message": "User logged out successfully"}


@app.get("/me")
def get_me(user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Возвращаем данные пользователя, включая аватар
    return {
        "username": user.username,
        "email": user.email,
        "profile_picture": user.profile_picture or "static/avatars/default.png",  # Дефолтная аватарка, если не установлена
        "description": user.description,
        "role": user.role,
    }




@app.get("/chats/")
def get_user_chats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    personal_chats = db.query(Chat).filter(
        Chat.type == "personal",
        Chat.members.any(user_id=user.id)
    ).options(subqueryload(Chat.messages)).all()

    group_chats = db.query(Chat).filter(
        Chat.type == "group",
        Chat.members.any(user_id=user.id)
    ).options(subqueryload(Chat.messages)).all()

    def format_last_message(chat):
        # Определяем последнее сообщение
        last_message = (
            db.query(Message)
            .filter(Message.chat_id == chat.id)
            .order_by(Message.sent_at.desc())  # Сортируем по времени отправки (убывающий порядок)
            .first()
        )

        if last_message:
            # Если есть file_url, возвращаем "Файл", иначе используем content
            content = "Файл" if last_message.file_url else last_message.content
        else:
            content = None

        return {
            "id": last_message.id if last_message else None,
            "content": content,
            "sender_id": last_message.sender_id if last_message else None,
            "sender_name": last_message.author.username if last_message and last_message.author else None,
            "sent_at": last_message.sent_at if last_message else None,
            "status": last_message.status if last_message else None,
        }

    def calculate_unread_count(chat):
        # Подсчитываем только те сообщения, которые:
        # - Не являются системными (sender_id != 0)
        # - Не были отправлены текущим пользователем
        return sum(
            1 for msg in chat.messages
            if msg.status == "unread" and msg.sender_id != user.id and msg.sender_id != 0
        )

    def get_member_data(member):
        if member.user:  # Если пользователь существует
            return {
                "id": member.user.id,
                "username": member.user.username,
                "profile_picture": member.user.profile_picture or "static/avatars/default.png",
                "status": member.user.status,
            }
        else:  # Если пользователь был удалён
            return {
                "id": None,
                "username": "Deleted User",
                "profile_picture": "static/avatars/default.png",
                "status": "offline",
            }

    return {
        "personal": [
            {
                "id": chat.id,
                "is_personal": True,
                "members": [get_member_data(member) for member in chat.members],
                "last_message": format_last_message(chat),
                "unread_count": calculate_unread_count(chat),
            }
            for chat in personal_chats
        ],
        "group": [
            {
                "id": chat.id,
                "name": chat.name,
                "photo": chat.photo or "static/group_avatars/default.png",
                "last_message": format_last_message(chat),
                "unread_count": calculate_unread_count(chat),  # Используем функцию для подсчёта
            }
            for chat in group_chats
        ],
    }


@app.get("/chats/{chat_id}/messages/")
def get_chat_messages(chat_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if not db.query(ChatMember).filter_by(chat_id=chat_id, user_id=user.id).first():
        raise HTTPException(status_code=403, detail="Access denied")

    messages = db.query(Message).filter(Message.chat_id == chat_id).options(
        joinedload(Message.author)
    ).order_by(Message.sent_at).all()

    def format_reactions(msg):
        reactions = db.query(MessageReaction).filter(MessageReaction.message_id == msg.id).all()
        return [
            {
                "reaction_name": r.reaction.name,
                "user_id": r.user_id,
                "username": r.author.username,
                "avatar": r.author.profile_picture or "static/avatars/default.png",
            }
            for r in reactions
        ]

    return [
        {
            "id": msg.id,
            "content": msg.content,
            "file_url": msg.file_url if msg.file_url else None,
            "filename": os.path.basename(msg.file_url).split("_", 3)[-1] if msg.file_url else None,
            "is_image": msg.file_url and mimetypes.guess_type(msg.file_url)[0] and mimetypes.guess_type(msg.file_url)[0].startswith('image'),
            "author": msg.author.username if msg.author else "Deleted User",
            "author_avatar": msg.author.profile_picture if msg.author else "static/avatars/default.png",
            "sent_at": msg.sent_at.isoformat() if msg.sent_at else None,
            "status": msg.status,
            "reactions": format_reactions(msg),
        }
        for msg in messages
    ]


@app.post("/chats/create")
def create_chat(
    chat: ChatCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing_chat = db.query(Chat).filter(Chat.name == chat.name, Chat.type == "group").first()
    if existing_chat:
        raise HTTPException(status_code=400, detail="Chat with this name already exists")

    new_chat = Chat(name=chat.name, type="group", creator_id=user.id)
    db.add(new_chat)
    db.commit()

    chat_member = ChatMember(chat_id=new_chat.id, user_id=user.id, role="admin")
    db.add(chat_member)
    db.commit()

    return {"id": new_chat.id, "name": new_chat.name}




@app.post("/chats/{chat_id}/add_member")
def add_member(
    chat_id: int,
    request: AddMemberRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Проверяем существование чата
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Проверяем, что пользователь - администратор
    chat_member = db.query(ChatMember).filter_by(chat_id=chat_id, user_id=user.id).first()
    if not chat_member or chat_member.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can add members")

    # Проверяем, что добавляемый пользователь существует
    new_member = db.query(User).filter(User.username == request.username).first()
    if not new_member:
        raise HTTPException(status_code=404, detail="User not found")

    # Проверяем, что пользователь еще не в чате
    existing_member = db.query(ChatMember).filter_by(chat_id=chat_id, user_id=new_member.id).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a member")

    # Добавляем пользователя в чат
    new_chat_member = ChatMember(chat_id=chat_id, user_id=new_member.id, role="member")
    db.add(new_chat_member)
    db.commit()

    # Системное сообщение
    system_message = f"{new_member.username} добавлен в чат."

    # Сохранение сообщения и уведомление через вебсокет
    try:
        response = requests.post(
            "http://chat:8001/ws/send-system-message",
            json={"chat_id": chat_id, "content": system_message}
        )
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error sending system message: {e}")

    return {"detail": f"User {request.username} added to the chat"}


@app.get("/users/search")
def search_users(
        username: str,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    users = db.query(User).filter(User.username.ilike(f"%{username}%")).limit(10).all()
    if not users:
        return []
    return [{"id": u.id, "username": u.username} for u in users]


@app.get("/chats/{chat_id}/role")
def get_user_role(
        chat_id: int,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # Проверяем, существует ли чат
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Проверяем, является ли пользователь участником чата
    chat_member = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id == user.id
    ).first()
    if not chat_member:
        raise HTTPException(status_code=403, detail="Access denied")

    return {"role": chat_member.role}


@app.delete("/chats/{chat_id}/remove_member")
def remove_member(
    chat_id: int,
    request: RemoveMemberRequest,  # Принимаем тело запроса
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Проверка существования чата
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Проверка, является ли текущий пользователь администратором
    member = db.query(ChatMember).filter_by(chat_id=chat_id, user_id=user.id).first()
    if not member or member.role != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")

    # Проверка пользователя на удаление
    user_to_remove = db.query(User).filter(User.username == request.username).first()
    if not user_to_remove:
        raise HTTPException(status_code=404, detail="User not found")

    # Проверка, что удаляемый пользователь является членом чата
    member_to_remove = db.query(ChatMember).filter_by(chat_id=chat_id, user_id=user_to_remove.id).first()
    if not member_to_remove:
        raise HTTPException(status_code=404, detail="User is not a member of the chat")

    # Админа нельзя удалить
    if member_to_remove.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot remove an admin")

    # Удаление участника
    db.delete(member_to_remove)
    db.commit()

    # Отправка системного сообщения через микросервис вебсокетов
    try:
        system_message = f"{request.username} удалён из чата."
        requests.post(
            "http://chat:8001/ws/send-system-message",
            json={"chat_id": chat_id, "content": system_message}
        )
    except requests.exceptions.RequestException as e:
        print(f"Error sending system message: {e}")

    return {"detail": f"User {request.username} has been removed from the chat"}


@app.delete("/chats/{chat_id}")
def delete_chat(
    chat_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Проверка существования чата
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Проверка, является ли текущий пользователь администратором
    member = db.query(ChatMember).filter_by(chat_id=chat_id, user_id=user.id).first()
    if not member or member.role != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")

    messages_with_files = db.query(Message).filter(Message.chat_id == chat_id, Message.file_url != None).all()
    for message in messages_with_files:
        file_url = os.path.join(BASE_DIR, message.file_url)
        if os.path.exists(file_url):
            try:
                os.remove(file_url)
                print(f"Deleted file: {file_url}")
            except Exception as e:
                print(f"Error deleting file {file_url}: {str(e)}")

    if chat.photo and chat.photo != "static/group_avatars/default.png":
        avatar_path = os.path.join(BASE_DIR, chat.photo)
        if os.path.exists(avatar_path):
            try:
                os.remove(avatar_path)
                print(f"Deleted chat avatar: {avatar_path}")
            except Exception as e:
                print(f"Error deleting chat avatar {avatar_path}: {str(e)}")

    # Удаление всех сообщений чата
    db.query(Message).filter_by(chat_id=chat_id).delete()

    # Удаление участников чата
    db.query(ChatMember).filter_by(chat_id=chat_id).delete()

    # Удаление самого чата
    db.delete(chat)
    db.commit()

    return {"detail": f"Chat {chat.name} has been deleted"}



@app.post("/chats/create_personal")
def create_personal_chat(
    request: PersonalChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    username = request.username

    if user.username == username:
        raise HTTPException(status_code=400, detail="You cannot create a personal chat with yourself.")

    # Проверяем, существует ли пользователь с указанным username
    other_user = db.query(User).filter(User.username == username).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Проверяем, существует ли уже личный чат между этими двумя пользователями
    existing_chat = db.query(Chat).filter(
        Chat.type == "personal",
        Chat.members.any(user_id=user.id),
        Chat.members.any(user_id=other_user.id)
    ).first()

    if existing_chat:
        return {
            "id": existing_chat.id,
            "members": [
                {"id": member.user.id, "username": member.user.username} for member in existing_chat.members
            ]
        }

    # Создаем новый личный чат
    chat_name = f"{user.username},{other_user.username}"
    new_chat = Chat(name=chat_name, type="personal", creator_id=user.id)
    db.add(new_chat)
    db.commit()

    # Добавляем обоих пользователей в участники чата
    chat_member1 = ChatMember(chat_id=new_chat.id, user_id=user.id, role="member")
    chat_member2 = ChatMember(chat_id=new_chat.id, user_id=other_user.id, role="member")
    db.add_all([chat_member1, chat_member2])
    db.commit()

    return {
        "id": new_chat.id,
        "members": [
            {"id": user.id, "username": user.username},
            {"id": other_user.id, "username": other_user.username},
        ]
    }


@app.put("/profile/update_username")
def update_username(
        request: UsernameUpdateRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # Проверяем, существует ли никнейм
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    # Обновляем никнейм пользователя
    current_user.username = request.username
    db.commit()
    db.refresh(current_user)
    return {"message": "Username updated successfully", "username": request.username}



@app.put("/profile/update_description")
def update_description(
    request: UpdateDescriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not request.description:
        raise HTTPException(status_code=400, detail="Description cannot be empty")

    current_user.description = request.description
    db.commit()
    db.refresh(current_user)
    return {"message": "Description updated successfully", "description": current_user.description}


@app.get("/chats/{chat_id}/members/")
def get_chat_members(chat_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    members = db.query(ChatMember).filter(ChatMember.chat_id == chat_id).all()

    return [
        {
            "id": member.user.id,
            "username": member.user.username,
            "profile_picture": member.user.profile_picture or "static/avatars/default.png",  # Добавляем фото
            "status": member.user.status,
        }
        for member in members
    ]



@app.get("/chats/{chat_id}/is_member")
def is_member(chat_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    member = db.query(ChatMember).filter_by(chat_id=chat_id, user_id=user.id).first()
    if member:
        return {"is_member": True}
    return {"is_member": False}



@app.delete("/chats/{chat_id}/leave")
def leave_chat(
    chat_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Проверяем, существует ли чат
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Проверяем, что пользователь состоит в чате
    member = db.query(ChatMember).filter_by(chat_id=chat_id, user_id=user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this chat")

    # Проверяем, что пользователь не является администратором
    if member.role == "admin":
        raise HTTPException(status_code=403, detail="Admin cannot leave the chat")

    # Удаляем пользователя из чата
    db.delete(member)
    db.commit()

    # Отправка системного сообщения через микросервис вебсокетов
    try:
        system_message = f"{user.username} покинул чат."
        requests.post(
            "http://chat:8001/ws/send-system-message",
            json={"chat_id": chat_id, "content": system_message}
        )
    except requests.exceptions.RequestException as e:
        print(f"Error sending system message: {e}")

    return {"detail": "You have left the chat"}



@app.post("/users/upload-avatar/")
def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Проверяем формат файла
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    # Создаём уникальное имя для файла
    filename = f"user_{user.id}_{int(time.time())}.{file.filename.split('.')[-1]}"
    filepath = os.path.join(BASE_DIR, "static", "avatars", filename)

    # Сохраняем файл
    with open(filepath, "wb") as f:
        f.write(file.file.read())

    # Удаляем старую аватарку, если она была
    if user.profile_picture and "static/avatars/" in user.profile_picture:
        old_file = os.path.join(BASE_DIR, user.profile_picture)
        if os.path.exists(old_file):
            os.remove(old_file)

    # Обновляем путь в базе данных
    user.profile_picture = f"static/avatars/{filename}"
    db.commit()

    return {"detail": "Avatar uploaded successfully", "profile_picture": user.profile_picture}


@app.get("/users/profile")
def get_user_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "username": user.username,
        "profile_picture": user.profile_picture or "static/avatars/default.png",
        "description": user.description or "Пользователь Messly",
        "status": user.status,
    }


@app.post("/chats/{chat_id}/upload-photo/")
def upload_chat_photo(
        chat_id: int,
        file: UploadFile = File(...),
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
):
    # Проверяем, существует ли чат
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Проверяем, является ли пользователь создателем чата
    if chat.creator_id != user.id:
        raise HTTPException(status_code=403, detail="Only the chat creator can change the photo")

    # Проверяем формат файла
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    # Создаём уникальное имя для файла
    filename = f"group_{chat.id}_{int(time.time())}.{file.filename.split('.')[-1]}"
    filepath = os.path.join(BASE_DIR, "static", "group_avatars", filename)

    # Сохраняем файл
    with open(filepath, "wb") as f:
        f.write(file.file.read())

    # Удаляем старую аватарку, если она не дефолтная
    if chat.photo and chat.photo != "static/group_avatars/default.png":
        old_file = os.path.join(BASE_DIR, chat.photo)
        if os.path.exists(old_file):
            os.remove(old_file)

    # Обновляем путь в базе данных
    chat.photo = f"static/group_avatars/{filename}"
    db.commit()

    return {"detail": "Chat photo uploaded successfully", "photo": chat.photo}




@app.get("/chats/{chat_id}")
def get_chat_info(chat_id: int, db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {
        "id": chat.id,
        "name": chat.name,
        "photo": chat.photo or "static/group_avatars/default.png",
        "members": [
            {"id": member.user.id, "username": member.user.username}
            for member in chat.members
        ],
    }



@app.put("/chats/{chat_id}/update-name/")
def update_chat_name(
    chat_id: int,
    chat_update: ChatNameUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if chat.creator_id != user.id:
        raise HTTPException(status_code=403, detail="Only the chat creator can update the name")

    if not chat_update.new_name.strip():
        raise HTTPException(status_code=400, detail="Chat name cannot be empty")

    chat.name = chat_update.new_name.strip()
    db.commit()
    return {"detail": "Chat name updated successfully", "name": chat.name}



@app.post("/chats/{chat_id}/upload-file/")
async def upload_file(
    chat_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Проверяем, существует ли чат
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Проверяем, что пользователь является членом чата
    if not db.query(ChatMember).filter_by(chat_id=chat_id, user_id=user.id).first():
        raise HTTPException(status_code=403, detail="Access denied")

    # Создаём уникальное имя для файла
    filename = f"file_{chat.id}_{int(time.time())}_{file.filename}"
    filepath = os.path.join(BASE_DIR, "static", "files", filename)

    # Сохраняем файл
    try:
        # Перемещаем курсор в начало файла перед чтением (решает проблему повторной загрузки)
        file.file.seek(0)

        # Сохраняем файл на сервер
        with open(filepath, "wb") as f:
            f.write(file.file.read())
        mime_type, _ = mimetypes.guess_type(filepath)
        is_image = mime_type and mime_type.startswith("image/")

        return {"file_url": f"static/files/{filename}", "is_image": is_image}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")




@app.delete("/delete-file/")
async def delete_file(file_url: str, user: User = Depends(get_current_user)):
    filepath = os.path.join(BASE_DIR, file_url)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        os.remove(filepath)  # Удаляем файл
        return {"detail": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")




@app.get("/admin-panel")
def admin_dashboard(user: User = Depends(get_current_user)):
    # Проверяем, является ли пользователь администратором
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied. Admins only.")

    # Возвращаем базовую информацию для панели
    return {
        "message": "Welcome to the Admin Panel!",
        "username": user.username,
        "role": user.role,
    }



@app.get("/admin-panel/users/")
def get_users_for_admin(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    username: str = Query(None),
    email: str = Query(None),
    role: str = Query(None),
    sort_by: str = Query("username"),
    sort_order: str = Query("asc")
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied. Admins only.")

    query = db.query(User)

    if username:
        query = query.filter(User.username.ilike(f"%{username}%"))
    if email:
        query = query.filter(User.email.ilike(f"%{email}%"))
    if role:
        query = query.filter(User.role == role)

    if sort_by not in ["username", "email", "role"]:
        sort_by = "username"  # Default sorting by username
    if sort_order == "desc":
        query = query.order_by(getattr(User, sort_by).desc())
    else:
        query = query.order_by(getattr(User, sort_by))

    users = query.all()

    return [{
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "role": u.role,
    } for u in users]



@app.put("/users/{user_id}/update/")
def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="You do not have permission to update this user")

    # Ищем пользователя по id
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Обновляем данные пользователя
    if user_update.username:
        user.username = user_update.username
    if user_update.email:
        user.email = user_update.email
    if user_update.role:
        user.role = user_update.role

    db.commit()

    return {
        "detail": "User updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }




@app.delete("/users/{user_id}/")
async def delete_user(user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Проверяем, что текущий пользователь имеет права на удаление
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="You do not have permission to delete this user")

    # Ищем пользователя по id
    user_to_delete = db.query(User).filter(User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")

    # Удаляем аватарку пользователя
    if user_to_delete.profile_picture:
        avatar_path = os.path.join(BASE_DIR, user_to_delete.profile_picture)
        try:
            os.remove(avatar_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error deleting avatar: {str(e)}")

    # Удаляем пользователя из базы данных
    db.delete(user_to_delete)
    db.commit()

    return {"detail": "User deleted successfully"}


@app.get("/admin-panel/chats/")
def get_chats_for_admin(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied. Admins only.")

    chats = db.query(Chat).all()

    return [{
        "id": chat.id,
        "name": chat.name,
        "type": chat.type,
        "creator": chat.creator_id,
        "created_at": chat.created_at.isoformat(),
        "members": [{"id": member.user_id, "username": member.user.username} for member in chat.members],
        "messages": [{"id": msg.id, "content": msg.content, "sent_at": msg.sent_at.isoformat()} for msg in chat.messages]
    } for chat in chats]


@app.get("/admin-panel/messages/")
def get_messages_for_admin(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    chat_id: int = Query(None),
    status: str = Query(None)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied. Admins only.")

    query = db.query(Message)

    if chat_id:
        query = query.filter(Message.chat_id == chat_id)
    if status:
        query = query.filter(Message.status == status)

    messages = query.all()

    return [{
        "id": msg.id,
        "content": msg.content,
        "sender_id": msg.sender_id,
        "chat_id": msg.chat_id,
        "sent_at": msg.sent_at.isoformat(),
        "status": msg.status,
    } for msg in messages]


@app.get("/admin-panel/statistics/")
def get_statistics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied. Admins only.")

    total_users = db.query(User).count()
    total_chats = db.query(Chat).count()
    total_messages = db.query(Message).count()

    return {
        "total_users": total_users,
        "total_chats": total_chats,
        "total_messages": total_messages
    }
