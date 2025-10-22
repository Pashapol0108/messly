import React, { useState, useRef, useEffect } from "react";
import "./Static/ChatPopup.css"; // Подключим стили

const ChatPopup = ({
  chatPhoto,
  chatName,
  chatMembers,
  isAdmin,
  onClose,
  onDeleteChat,
  onLeaveChat,
  onChatSettings,
  onUpdateChatName,
  onChangeChatPhoto, // Новый пропс для изменения фото
  onClearChatHistory,
  openedFromChatWindow
}) => {

  const [newChatName, setNewChatName] = useState(chatName); // Для редактирования названия
  const [isEditingName, setIsEditingName] = useState(false);
  const fileInputRef = useRef(null); // Реф для скрытого поля загрузки файла
  const [activeGif, setActiveGif] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onChangeChatPhoto(file); // Передаем файл в обработчик
    }
  };

useEffect(() => {
  setNewChatName(chatName); // Обновляем локальное состояние, если `chatName` меняется
}, [chatName]);

  const saveChatName = () => {
  if (newChatName.trim() && newChatName !== chatName) {
    onUpdateChatName(newChatName); // Вызываем обработчик в `ChatWindow`
    setIsEditingName(false);
  }
};

  const triggerFileInput = () => {
    fileInputRef.current.click(); // Открываем диалог выбора файла
  };

  const handleAction = (action, gifKey) => {
    setActiveGif(gifKey); // Устанавливаем гифку
    setTimeout(() => {
      setActiveGif(null); // Скрываем гифку
      action(); // Выполняем действие
    }, 3000); // Задержка на 3 секунды для проигрывания гифки
  };


  return (
    <div className="chat-popup-modal">
      <div className="chat-popup-content">
        <button className="chat-popup-close" onClick={onClose}>
          &times;
        </button>
        <div className="chat-popup-header">
          <img
            src={`http://127.0.0.1:8000/${chatPhoto}`}
            alt={chatName}
            className="chat-popup-avatar"
            onError={(e) => {
              e.target.src = "/api/static/group_avatars/default.png";
            }}
          />
          {isAdmin && isEditingName ? (
            <div>
              <input
                type="text"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                className="edit-chat-name-input"
              />
              <button onClick={saveChatName} className="save-chat-name-button">
                Save
              </button>
            </div>
          ) : (
            <h2 onDoubleClick={() => isAdmin && setIsEditingName(true)}
                className="chat-popup-name">
              {chatName}
            </h2>
          )}

          {isAdmin && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handlePhotoChange}
              />
              <button className="change-photo-button" onClick={triggerFileInput}>
                Change Photo
              </button>
            </>
          )}
        </div>
        <div className="chat-popup-members">
          <h3>Members</h3>
          <ul>
            {chatMembers.map((member) => (
              <li key={member.id}>{member.username}</li>
            ))}
          </ul>
        </div>
        <div className="chat-popup-actions">
          {isAdmin ? (
            <>
              <div className="action-item">
                {activeGif === "delete" && (
                  <img
                    src="/api/static/others/delete-chat.gif"
                    alt="Delete Chat"
                    className="action-gif"
                  />
                )}
                <button
                  onClick={() => handleAction(onDeleteChat, "delete")}
                  className="delete-chat-button"
                >
                  Delete Chat
                </button>
              </div>
              <div className="action-item">
                {activeGif === "clear-history" && (
                  <img
                    src="/api/static/others/clear-history.gif"
                    alt="Clear History"
                    className="action-gif"
                  />
                )}
                <button
                  onClick={() => handleAction(onClearChatHistory, "clear-history")}
                  className="clear-history-button"
                >
                  Clear History
                </button>
              </div>
              <div className="action-item">
                {activeGif === "settings" && (
                  <img
                    src="/api/static/others/chat-settings.gif"
                    alt="Chat Settings"
                    className="action-gif"
                  />
                )}
                <button
                  onClick={() => handleAction(onChatSettings, "settings")}
                  className="settings-button"
                >
                  Chat Settings
                </button>
              </div>
            </>
          ) : (
            openedFromChatWindow && ( // Кнопка Leave Chat только если попап открыт из окна чата
                <div className="action-item">
                {activeGif === "leave-chat" && (
                  <img
                    src="/api/static/others/leave-chat.gif"
                    alt="Chat leave"
                    className="action-gif"
                  />
                )}
              <button
                  onClick={() => handleAction(onLeaveChat, "leave-chat")}
                  className="settings-button"
                >
                Leave Chat
              </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPopup;
