from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from db import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    profile_picture = Column(String)  # URL на фото профиля
    status = Column(String, default="offline")
    role = Column(String, nullable=False, default="user")
    description = Column(String, default="Пользователь Messly")
    create_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("Message", back_populates="author")
    chat_memberships = relationship("ChatMember", back_populates="user", cascade="all, delete")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete")
    reactions = relationship("MessageReaction", back_populates="author")


class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    type = Column(String, nullable=False)  # personal, group
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=datetime.utcnow)
    photo = Column(String, nullable=True, default="static/group_avatars/default.png")  # Ссылка на фото

    members = relationship("ChatMember", back_populates="chat", cascade="all, delete")
    messages = relationship("Message", back_populates="chat", cascade="all, delete")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)  # Для текстовых сообщений
    audio_url = Column(String)  # Для голосовых сообщений
    is_audio = Column(Boolean, default=False)
    duration = Column(Integer)  # Длительность голосового сообщения в секундах
    file_url = Column(String, nullable=True)  # URL на файл
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="unread")  # Например: read, unread

    author = relationship("User", back_populates="messages")
    chat = relationship("Chat", back_populates="messages")
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete")


class Reaction(Base):
    __tablename__ = "reactions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    emoji = Column(String, nullable=False)

    message_reactions = relationship("MessageReaction", back_populates="reaction")



class ChatMember(Base):
    __tablename__ = "chat_members"

    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String, nullable=False, default="member")  # admin, moderator, member
    added_at = Column(DateTime, default=datetime.utcnow)

    chat = relationship("Chat", back_populates="members")
    user = relationship("User", back_populates="chat_memberships")


class MessageReaction(Base):
    __tablename__ = "message_reactions"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reaction_id = Column(Integer, ForeignKey("reactions.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    message = relationship("Message", back_populates="reactions")
    reaction = relationship("Reaction", back_populates="message_reactions")
    author = relationship("User", back_populates="reactions")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # Например: "message", "chat"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)  # Текст уведомления
    sent_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)

    user = relationship("User", back_populates="notifications")

