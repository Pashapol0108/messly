import React, { useState } from "react";
import UserProfilePopup from "./UserProfilePopup";
import ChatPopup from "./ChatPopup";
import "./Static/ChatList.css";

const ChatList = ({ chats, onSelectChat, onCreateChat, onCreatePersonalChat }) => {
  const [newChatName, setNewChatName] = useState("");
  const [personalChatUsername, setPersonalChatUsername] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroupChat, setSelectedGroupChat] = useState(null);
  const [activeTab, setActiveTab] = useState("personal"); // Состояние для активной вкладки

  const currentUsername = localStorage.getItem("username");

  // Подсчет непрочитанных сообщений в личных чатах
  const getUnreadPersonalMessagesCount = () => {
    return chats.personal.reduce((acc, chat) => acc + (chat.unread_count || 0), 0);
  };

  // Подсчет непрочитанных сообщений в групповых чатах
  const getUnreadGroupMessagesCount = () => {
    return chats.group.reduce((acc, chat) => acc + (chat.unread_count || 0), 0);
  };

  const handleCreateChat = () => {
    if (newChatName.trim() === "") {
      alert("Название чата не может быть пустым");
      return;
    }
    onCreateChat(newChatName);
    setNewChatName("");
  };

  const handleCreatePersonalChat = () => {
    if (personalChatUsername.trim() === "") {
      alert("Имя пользователя не может быть пустым");
      return;
    }
    onCreatePersonalChat(personalChatUsername);
    setPersonalChatUsername("");
  };

  const fetchUserProfile = async (username) => {
    try {
      const response = await fetch(`/api/users/profile?username=${username}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) throw new Error("Не удалось загрузить профиль пользователя");

      const data = await response.json();
      setSelectedUser(data);
    } catch (error) {
      console.error("Ошибка при загрузке профиля пользователя:", error);
    }
  };

  const closeUserProfile = () => {
    setSelectedUser(null);
  };

  const openGroupChatPopup = async (chatId) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!response.ok) throw new Error("Не удалось загрузить данные группы");
      const data = await response.json();
      setSelectedGroupChat(data);
    } catch (error) {
      console.error("Ошибка при загрузке данных группы:", error);
    }
  };

  const closeGroupChatPopup = () => {
    setSelectedGroupChat(null);
  };

  const formatTime = (time) => {
    if (!time) return "";
    const date = new Date(new Date(time).getTime() + 3 * 60 * 60 * 1000); // Добавляем 3 часа
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isSystemMessage = (message) => message?.sender_id === 0;

  return (
    <div className="chat-list-container">
      {/* Переключатели для личных и групповых чатов */}
      <div className="chat-tabs">
        <button
          className={`chat-tab ${activeTab === "personal" ? "active" : ""}`}
          onClick={() => setActiveTab("personal")}
        >
          Личные чаты
          {getUnreadPersonalMessagesCount() > 0 && (
            <span className="unread-count-badge">
              {getUnreadPersonalMessagesCount()}
            </span>
          )}
        </button>
        <button
          className={`chat-tab ${activeTab === "group" ? "active" : ""}`}
          onClick={() => setActiveTab("group")}
        >
          Группы
          {getUnreadGroupMessagesCount() > 0 && (
            <span className="unread-count-badge">
              {getUnreadGroupMessagesCount()}
            </span>
          )}
        </button>
      </div>

      {/* Список личных чатов */}
      {activeTab === "personal" && (
        <>
          <div className="create-personal-chat">
            <input
              type="text"
              placeholder="Имя пользователя"
              value={personalChatUsername}
              onChange={(e) => setPersonalChatUsername(e.target.value)}
            />
            <button onClick={handleCreatePersonalChat}>+</button>
          </div>
          {chats.personal.map((chat) => {
            const otherUser = chat.members?.find(
              (member) => member.username !== currentUsername
            ) || { username: "Deleted User", profile_picture: "static/avatars/default.png" };
            const lastMessage = chat.last_message;
            const isUnread =
              !isSystemMessage(lastMessage) && chat.unread_count > 0; // Исключаем системные сообщения
            const isSentByUser = lastMessage?.sender_name === currentUsername;

            return (
              <div
                key={chat.id}
                className="chat-item"
                onClick={() => onSelectChat(chat.id, otherUser?.username, "personal")}
              >
                <img
                  src={`/api/${otherUser?.profile_picture || "static/avatars/default.png"}`}
                  alt={`${otherUser?.username}'s avatar`}
                  className="chat-avatar"
                  onError={(e) => {
                    e.target.src = "/api/static/avatars/default.png";
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchUserProfile(otherUser?.username);
                  }}
                />
                <div className="chat-details">
                  <div className="chat-title">
                    <span className="chat-username">{otherUser?.username}</span>
                    {otherUser?.username === "messly" ? (
                      <img
                        src="/api/static/others/galka_messly.png"
                        alt="Messly badge"
                        className="messly-badge"
                      />
                    ) : (
                      <span
                        className={`status-indicator ${otherUser?.status === "online" ? "online" : "offline"}`}
                      ></span>
                    )}
                  </div>
                  {lastMessage && (
                    <div className={`chat-last-message ${isUnread ? "unread-message-bg" : ""}`}>
                      {!isSystemMessage(lastMessage) && (
                        <span className="message-author">
                          {isSentByUser ? "Вы: " : ""}
                        </span>
                      )}
                      <span className="message-content">{lastMessage.content}</span>
                    </div>
                  )}
                </div>
                <div className="chat-meta">
                  <span className="chat-time">{formatTime(lastMessage?.sent_at)}</span>
                  {isUnread && <span className="unread-count">{chat.unread_count}</span>}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Список групповых чатов */}
      {activeTab === "group" && (
        <>
          <div className="create-chat">
            <input
              type="text"
              placeholder="Название группы"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
            />
            <button onClick={handleCreateChat}>+</button>
          </div>
          {chats.group.map((chat) => {
            const lastMessage = chat.last_message;
            const isUnread =
              !isSystemMessage(lastMessage) && chat.unread_count > 0; // Исключаем системные сообщения
            const isSentByUser = lastMessage?.sender_name === currentUsername;

            return (
              <div
                key={chat.id}
                className="chat-item"
                onClick={() => onSelectChat(chat.id, chat.name, "group")}
              >
                <img
                  src={`/api/${chat.photo}`}
                  alt={`${chat.name}'s avatar`}
                  className="group-chat-avatar"
                  onError={(e) => {
                    e.target.src = "/api/static/group_avatars/default.png";
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openGroupChatPopup(chat.id);
                  }}
                />
                <div className="chat-details">
                  <div className="chat-title">
                    <span className="chat-group-title">{chat.name}</span>
                  </div>
                  {lastMessage && (
                    <div
                      className={`chat-last-message ${
                        !isSystemMessage(lastMessage) && isUnread ? "unread-message-bg" : ""
                      }`}
                    >
                      {isSystemMessage(lastMessage) ? (
                        lastMessage.content
                      ) : (
                        <>
                          {isSentByUser ? "Вы: " : lastMessage.sender_name ? `${lastMessage.sender_name}: ` : ""}
                          {lastMessage.content}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="chat-meta">
                  <span className="chat-time">{formatTime(lastMessage?.sent_at)}</span>
                  {isUnread && <span className="unread-count">{chat.unread_count}</span>}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Профиль пользователя и чат с группой */}
      {selectedUser && <UserProfilePopup user={selectedUser} onClose={closeUserProfile} />}
      {selectedGroupChat && (
        <ChatPopup
          chatPhoto={selectedGroupChat.photo}
          chatName={selectedGroupChat.name}
          chatMembers={selectedGroupChat.members}
          onClose={closeGroupChatPopup}
          isAdmin={selectedGroupChat.creator_id === currentUsername}
          onDeleteChat={null}
          onLeaveChat={null}
          onChatSettings={null}
          onChangeChatPhoto={null}
          openedFromChatWindow={false}
        />
      )}

    </div>
  );
};

export default ChatList;
