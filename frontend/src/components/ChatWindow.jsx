import React, { useState, useEffect, useRef } from "react";
import UserProfilePopup from "./UserProfilePopup";
import ChatPopup from "./ChatPopup";
import ReactionButton from "./ReactionButton";
import "./Static/ChatWindow.css";

const ChatWindow = ({ chatId, chatName, chatType }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Проверка роли
  const [showSettingsPopup, setShowSettingsPopup] = useState(false); // Модальное окно
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [chatMembers, setChatMembers] = useState([]); // Участники чата
  const currentUsername = localStorage.getItem("username"); // Ваш текущий никнейм
  const [allReadNotification, setAllReadNotification] = useState(false); // Для управления уведомлением
  const [selectedUser, setSelectedUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [chatPhoto, setChatPhoto] = useState(null); // Для фото группового чата
  const [showChatPopup, setShowChatPopup] = useState(false);
  const [localChatName, setLocalChatName] = useState(chatName);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 }); // Для позиционирования
  const messagesEndRef = useRef(null); // Ссылка для прокрутки вниз
  const inputRef = useRef(null);

  useEffect(() => {
    // Фокусируемся на поле ввода при открытии чата
    inputRef.current?.focus();
  }, [chatId]);

  useEffect(() => {
    // Автоматически прокручиваем вниз при обновлении сообщений
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]); // Прокручиваем при добавлении новых сообщений

  const handleKeyPress = (e) => {
    // Отправка сообщения по пробелу или Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      if (newMessage.trim()) {
        sendMessage(newMessage);
        setNewMessage('');
      }
    }
  };


const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`/api/chats/${chatId}/upload-file/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload file");
    }

    const data = await response.json();
    const fileUrl = data.file_url;

    if (socket && fileUrl) {
      socket.send(
        JSON.stringify({
          file_url: fileUrl,
        })
      );
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    alert("Failed to upload file");
  }
};

const handleReaction = async (messageId) => {
  try {
    const response = await fetch(
      `/ws/add-reaction?token=${localStorage.getItem("access_token")}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message_id: messageId,
          reaction_name: "like", // Название реакции
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to update reaction:", errorData);
      return;
    }

    const updatedReactions = await response.json(); // Убедитесь, что это массив
    if (Array.isArray(updatedReactions)) {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, reactions: updatedReactions } : msg
        )
      );
    } else {
      console.error("Invalid reactions format:", updatedReactions);
    }
  } catch (error) {
    console.error("Error updating reaction:", error);
  }
};




useEffect(() => {
  const handleOutsideClick = (event) => {
    if (showDeletePopup) {
      setShowDeletePopup(false);
    }
  };

  document.addEventListener("click", handleOutsideClick);

  return () => {
    document.removeEventListener("click", handleOutsideClick);
  };
}, [showDeletePopup]);

const handleDoubleClick = (e, messageId) => {
  const popupWidth = 100;
  const popupHeight = 50;

  // Координаты клика
  let x = e.clientX;
  let y = e.clientY;

  // Ограничения по ширине окна
  if (x + popupWidth > window.innerWidth) {
    x = window.innerWidth - popupWidth - 5; // Сдвигаем влево
  }

  // Ограничения по высоте окна
  if (y + popupHeight > window.innerHeight) {
    y = window.innerHeight - popupHeight - 5; // Сдвигаем вверх
  }

  setPopupPosition({ x, y }); // Устанавливаем позицию поп-апа
  setShowDeletePopup(true); // Показываем поп-ап
  setSelectedMessageId(messageId); // Устанавливаем ID сообщения
};


const deleteMessage = async () => {
  try {
    const response = await fetch(
      `/ws/delete-message/${selectedMessageId}?token=${localStorage.getItem("access_token")}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.detail || "Failed to delete message");
      return;
    }

    // Удаляем сообщение локально
    setMessages((prev) => prev.filter((msg) => msg.id !== selectedMessageId));
    setShowDeletePopup(false); // Закрываем поп-ап
  } catch (error) {
    console.error("Error deleting message:", error);
    alert("Failed to delete message");
  }
};


const clearChatHistory = async () => {
  const confirmClear = window.confirm(
    "Are you sure you want to clear the chat history?"
  );
  if (!confirmClear) return;

  try {
    const response = await fetch(
      `/ws/clear-chat-history/${chatId}?token=${localStorage.getItem("access_token")}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.detail || "Failed to clear chat history");
      return;
    }


    setMessages([]); // Очистить локально загруженные сообщения
  } catch (error) {
    console.error("Error clearing chat history:", error);
    alert("Failed to clear chat history");
  }
};



const updateChatName = async (newName) => {
  try {
    const response = await fetch(`/api/chats/${chatId}/update-name/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify({ new_name: newName }),
    });

    if (!response.ok) {
      throw new Error("Failed to update chat name");
    }

    const data = await response.json();
    setLocalChatName(data.name); // Обновляем локальное состояние

    await fetchChatInfo();
  } catch (error) {
    console.error("Error updating chat name:", error);
  }
};
useEffect(() => {
  setLocalChatName(chatName);
}, [chatName]);



const onChangeChatPhoto = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`/api/chats/${chatId}/upload-photo/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload photo");
    }

    const data = await response.json();
    setChatPhoto(data.photo); // Обновляем локальное фото чата

    // Обновляем данные на сервере
    await fetchChatInfo(); // Перезагружаем информацию о чате после изменения
  } catch (error) {
    console.error("Error changing chat photo:", error);
  }
};


const toggleChatPopup = () => {
    setShowChatPopup(!showChatPopup);
  };

// Функция для получения данных о чате
  const fetchChatInfo = async () => {
    if (!chatId || chatType !== "group") return;

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch chat info");
      }

      const data = await response.json();
      setChatPhoto(data.photo || "static/group_avatars/default.png"); // Устанавливаем фото чата
    } catch (error) {
      console.error("Error fetching chat info:", error);
    }
  };

  useEffect(() => {
    if (chatType === "group") {
      fetchChatInfo(); // Загружаем фото только для групповых чатов
    }
  }, [chatId, chatType]);

// Функция для загрузки участников чата
  const fetchChatMembers = async () => {
    if (!chatId) return; // Проверяем наличие chatId

    try {
      const response = await fetch(`/api/chats/${chatId}/members/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching chat members:", errorData.detail);
        throw new Error("Failed to fetch chat members");
      }

      const data = await response.json();
      setChatMembers(data); // Устанавливаем список участников

      // Устанавливаем собеседника для персонального чата
      if (chatType === "personal") {
        const other = data.find((member) => member.username !== currentUsername);
        setOtherUser(other || null);
        }
    } catch (error) {
      console.error("Error fetching chat members:", error);
    }
  };
  useEffect(() => {
    fetchChatMembers();
  }, [chatId, chatType]);


  // Проверка принадлежности к чату
  const checkMembership = async () => {
    try {
        const response = await fetch(`/api/chats/${chatId}/is_member`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
        });

        if (!response.ok) {
            alert("Время вашей сессии истекло!");
        }

        const data = await response.json();
        if (!data.is_member) {
            alert("You are no longer a member of this chat.");
            window.location.reload(); // Перезагрузка страницы
            throw new Error("Membership check failed"); // Прерываем выполнение
        }
    } catch (error) {
        throw error; // Убедимся, что ошибка выбрасывается
    }
};



  const closeUserProfile = () => {
    setSelectedUser(null);
  };

const deleteChat = async () => {
  const confirmDelete = window.confirm("Are you sure you want to delete this chat?");
  if (!confirmDelete) return;

  try {
    const response = await fetch(`/api/chats/${chatId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.detail || "Failed to delete the chat");
      return;
    }

    alert("Chat deleted successfully");
    window.location.reload(); // Перезагрузка страницы
  } catch (error) {
    console.error("Error deleting the chat:", error);
    alert("Failed to delete the chat");
  }
};

const leaveChat = async () => {
  try {
    const response = await fetch(`/api/chats/${chatId}/leave`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.detail || "Failed to leave the chat");
      return;
    }

    window.location.reload(); // Перезагрузка страницы
  } catch (error) {
    console.error("Error leaving the chat:", error);
    alert("Failed to leave the chat");
  }
};

  // Периодическая проверка членства в чате
  useEffect(() => {
    if (!chatId) return;

    const interval = setInterval(() => {
      checkMembership();
    }, 30000);

    return () => clearInterval(interval);
  }, [chatId]);



  const fetchUserProfile = async (username) => {
    try {
      const response = await fetch(`/api/users/profile?username=${username}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch user profile");

      const data = await response.json();
      setSelectedUser(data); // Устанавливаем выбранного пользователя
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
  if (!chatId) return;

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      setMessages(data);
      sendReadReceipts();
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const fetchRole = async () => {
    try {
      const response = await fetch(`/api/chats/${chatId}/role`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch role");
      const data = await response.json();
      setIsAdmin(data.role === "admin");
    } catch (error) {
      console.error("Error fetching role:", error);
    }
  };

  const sendReadReceipts = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "read_receipts",
          chat_id: chatId
        })
      );
    }
  };

  fetchMessages();
  fetchRole();
  fetchChatMembers();

  const ws = new WebSocket(
  `ws://${window.location.host}/ws/chat/${chatId}?token=${localStorage.getItem("access_token")}`
  );

  ws.onopen = () => {
    console.log("WebSocket connection established");
    sendReadReceipts();
  };

  ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);

    if (message.type === "reaction_update") {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === message.message_id
            ? { ...msg, reactions: message.reactions }
            : msg
        )
      );
    } else if (message.type === "read_receipts") {
      setMessages((prev) =>
        prev.map((msg) =>
          message.read_message_ids.includes(msg.id) ? { ...msg, status: "read" } : msg
        )
      );
    } else if (message.type === "chat_history_cleared") {
      setMessages([]);
      alert("Chat history has been cleared by the admin.");
    } else if (message.type === "message_deleted") {
      setMessages((prev) => prev.filter((msg) => msg.id !== message.message_id));
    } else if (message.file_url) {
      // Добавляем файл как новое сообщение
      setMessages((prev) => [...prev, message]);
    } else {
      setMessages((prev) => [...prev, message]);
      if (message.author !== currentUsername) {
        sendReadReceipts();
      }
    }
  } catch (error) {
    console.error("Error parsing WebSocket message:", error);
  }
};


  ws.onclose = () => {
    console.log("WebSocket connection closed");
  };

  setSocket(ws);

  return () => {
    ws.close();
  };
}, [chatId]);

// Логика для отображения "все сообщения прочитаны"
useEffect(() => {
    if (messages.length > 0 && messages.every((msg) => msg.status === "read")) {
      console.log("All messages are read");
      setAllReadNotification(true);

      // Убираем уведомление через 2 секунды
      const timer = setTimeout(() => {
        setAllReadNotification(false);
      }, 2000);

      return () => clearTimeout(timer); // Очищаем таймер при размонтировании
    }
  }, [messages]);



  const sendMessage = async () => {
    try {
        const isMember = await checkMembership(); // Проверяем принадлежность перед отправкой
        if (socket && newMessage.trim() !== "") {
            socket.send(JSON.stringify({ content: newMessage }));
            setNewMessage("");
        }
    } catch (error) {
        console.error("Не удалось отправить сообщение: пользователь не состоит в чате.");
    }
};



  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert("Please enter a username to search");
      return;
    }
    try {
      const response = await fetch(`/api/users/search?username=${searchQuery}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to search users");
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const handleAddMember = async (username) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/add_member`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.detail || "Failed to add member");
        return;
      }

      setSearchQuery("");
      setSearchResults([]);
      await fetchChatMembers(); // Обновляем список участников
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };

  const handleRemoveMember = async (username) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/remove_member`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.detail || "Failed to remove member");
        return;
      }

      setSearchQuery("");
      setSearchResults([]);
      await fetchChatMembers(); // Обновляем список участников
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const openSettingsPopup = async () => {
    setShowSettingsPopup(true);
    await fetchChatMembers(); // Загружаем участников чата при открытии
  };

  return (
  <div className="chat-window">
    <div className="chat-header">
        {chatType === "personal" && otherUser && (
          <img
            src={`/api/${otherUser.profile_picture || "static/avatars/default.png"}`}
            alt={`${otherUser.username || "Deleted User"}'s avatar`}
            className="chat-avatar"
            onError={(e) => {
              e.target.src = "/api/static/avatars/default.png";
            }}
            onClick={() => fetchUserProfile(otherUser.username)} // Открываем поп-ап с профилем
          />
        )}

        {chatType === "group" && (
          <img
            src={`/api/${chatPhoto}`}
            alt={`${chatName}'s avatar`}
            className="chat-avatar"
            onClick={toggleChatPopup} // Открываем поп-ап
            onError={(e) => {
              e.target.src = "/api/static/group_avatars/default.png";
            }}
          />
        )}

      <div className="chat-header-title">
          <div className="chat-title-container">

        <h2
            className="chat-title"
            onClick={chatType === "group" ? toggleChatPopup : undefined}
            style={chatType === "group" ? { cursor: "pointer" } : {}}
        >
            {chatType === "group" ? localChatName : chatName}
        </h2>
        {chatType === "personal" && (
            <span
              className={`status-indicator ${otherUser?.status === "online" ? "online" : "offline"}`}
              title={otherUser?.status}
            ></span>
            )}
           </div>
      </div>
    </div>

    <div className="messages">
  {messages.length === 0 ? (
    // Если сообщений нет, отображаем текст по центру
    <div className="no-messages">
        <img
        src="/api/static/others/no-messages.gif"
        alt="No messages"
        className="no-messages-gif"
      />
      No messages
    </div>
  ) : (
    // Если есть сообщения, отображаем их
    messages.map((msg) => {
      const isSystemMessage = !msg.author || msg.author === "Messly"; // Системные сообщения
      const isMyMessage = msg.author === currentUsername; // Мои сообщения

      return (
        <div
          key={msg.id || `${msg.type}-${msg.user_id || "unknown"}`}
          className={`message-container ${
            isSystemMessage
              ? "system-message"
              : isMyMessage
              ? "right"
              : "left"
          }`}
        >
          {isMyMessage && (
            <ReactionButton
              messageId={msg.id}
              reactions={msg.reactions || []}
              currentUsername={currentUsername}
              handleReaction={handleReaction}
              position="left"
            />
          )}
          {isSystemMessage ? (
            // Центрированное системное сообщение
            <div className="message system-message">{msg.content}</div>
          ) : (
            <>
              {!isMyMessage && chatType === "group" && (
                <img
                  src={`/api/${msg.author_avatar || "static/avatars/default.png" }`}
                  alt={`${msg.author || "Deleted User"}'s avatar`}
                  className="message-avatar"
                  onError={(e) => {
                    e.target.src = "/api/static/avatars/default.png";
                  }}
                  onClick={() => fetchUserProfile(msg.author)}
                />
              )}
              <div
                className={`message ${
                  msg.status === "unread" ? "unread" : ""
                }`}
                onDoubleClick={(e) => handleDoubleClick(e, msg.id)}
              >
                {/* Имя автора только для групповых чатов */}
                {chatType === "group" && !isMyMessage && (
                  <strong className="message-author">{msg.author}</strong>
                )}
                {msg.content && <span className="message-text">{msg.content}</span>}
                {msg.file_url && msg.is_image ? (
                      // Если это изображение
                      <img
                        src={`/api/${msg.file_url}`}
                        alt="Uploaded"
                        className="message-image"
                      />
                    ) : msg.file_url ? (
                      // Если это файл, но не изображение
                      <a
                        href={`/api/${msg.file_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="message-file"
                      >
                        {msg.filename || "Download File"}
                      </a>
                    ) : null}
                <div className="message-time">
                  {msg.sent_at
                    ? new Date(
                        new Date(msg.sent_at).getTime() + 3 * 60 * 60 * 1000
                      ).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : "Invalid Date"}
                </div>
              </div>
              {!isMyMessage && (
                <ReactionButton
                  messageId={msg.id}
                  reactions={msg.reactions || []}
                  currentUsername={currentUsername}
                  handleReaction={handleReaction}
                  position="right"
                />
              )}
            </>
          )}
        <div ref={messagesEndRef} />
        </div>
      );
    })
  )}



  {selectedUser && <UserProfilePopup user={selectedUser} onClose={closeUserProfile} />}

  {showChatPopup && (
  <ChatPopup
    chatPhoto={chatPhoto}
    chatName={localChatName}
    chatMembers={chatMembers}
    isAdmin={isAdmin}
    onClose={toggleChatPopup}
    onDeleteChat={deleteChat}
    onLeaveChat={leaveChat}
    onChatSettings={openSettingsPopup}
    onChangeChatPhoto={onChangeChatPhoto}
    onUpdateChatName={updateChatName}
    onClearChatHistory={clearChatHistory}
    openedFromChatWindow={true} // Новый флаг
  />
)}

{showDeletePopup && (
  <div
    className="delete-popup"
    style={{
      position: "absolute",
      top: `${popupPosition.y}px`,
      left: `${popupPosition.x}px`,
      backgroundColor: "#c60b1a",
      border: "1px solid #80000b",
      borderRadius: "7px",
      padding: "1.5px", // Уменьшенный размер
      width: "70px", // Меньший размер поп-апа
      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
      zIndex: 1000,
    }}
onClick={(e) => e.stopPropagation()}
  >
    <button
      onClick={deleteMessage}
      style={{
        backgroundColor: "#c60b1a", // Красный цвет кнопки
        color: "white",
        border: "none",
        borderRadius: "5px",
        width: "100%", // Кнопка на всю ширину
        padding: "3px",
        cursor: "pointer",
      }}
    >
      Delete
    </button>
  </div>
)}


</div>
    <div className="message-input">
        <label className="file-upload-label">
            <img
                src="/api/static/others/link-button.png"
                alt="Send file"
                className="send-button"
              />
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files.length > 0) {
                  uploadFile(e.target.files[0]);
                  e.target.value = "";
                }
              }}
              style={{ display: "none" }}
            />
        </label>
      <input
        ref={inputRef}
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type a message..."
        onKeyDown={handleKeyPress}
      />


    <button onClick={sendMessage}>
    <img
        src="/api/static/others/send-button1.png"
        alt="Send message"
        className="send-button"
      />
    </button>


    </div>

    {showSettingsPopup && (
  <div className="chat-window-modal">
    <div className="chat-window-modal-content">
        <button className="chat-window-popup-close" onClick={() => setShowSettingsPopup(false)}>
          &times;
        </button>
      <h3 className="modal-title">Chat Settings</h3>
      <div className="add-remove-members">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a user"
          className="modal-input"
        />
        <button onClick={handleSearch} className="modal-button search-button">
          Search
        </button>
        <ul className="members-list">
          {(searchQuery ? searchResults : chatMembers).map((user) => {
            const isInChat = chatMembers.some(
              (member) => member.username === user.username
            );
            return (
              <li key={user.id} className="member-item">
                <span className="member-username">{user.username}</span>
                {user.username === currentUsername ? null : isInChat ? (
                  !searchQuery && (
                    <button
                      onClick={() => handleRemoveMember(user.username)}
                      className="modal-button remove-button"
                    >
                      remove
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleAddMember(user.username)}
                    className="modal-button add-button"
                  >
                    add
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

    </div>
  </div>
)}

  </div>
);

};

export default ChatWindow;
