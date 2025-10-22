import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";  // Импортируем useNavigate для перенаправления
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";
import ChatUser from "./ChatUser";
import "./Static/Chats.css";

const Chats = () => {
  const [chats, setChats] = useState({ personal: [], group: [] });
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatName, setChatName] = useState("");
  const [chatType, setChatType] = useState(""); // Тип текущего чата (personal или group)
  const [leftPanelWidth, setLeftPanelWidth] = useState(30); // Начальная ширина в процентах
  const [isResizing, setIsResizing] = useState(false); // Флаг изменения размера

  const navigate = useNavigate();  // Хук для перенаправления

  const handleMouseDown = () => setIsResizing(true);
  const handleMouseUp = () => setIsResizing(false);

  const handleMouseMove = (e) => {
    if (isResizing) {
      const newWidth = Math.min(Math.max((e.clientX / window.innerWidth) * 100, 10), 30);
      setLeftPanelWidth(newWidth);
    }
  };

  const logout = () => {
    localStorage.clear(); // Очищаем localStorage
    // Если у вас есть метод для изменения статуса (например, в глобальном состоянии или через API), вызывайте его здесь.
    console.log("User logged out.");
  };

  const checkTokenValidity = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
        logout();
      // Если токен отсутствует, перенаправляем на страницу логина с флагом session=expired
      navigate("/login?session=expired", { replace: true });
      return false;
    }
    return true;
  };

  // Функция для загрузки чатов
  const fetchChats = async () => {
    if (!checkTokenValidity()) return; // Проверка токена перед запросом

    try {
      const response = await fetch("/api/chats/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        // Если ответ не ок (например, токен истек), перенаправляем на страницу логина
        logout();
        navigate("/login?session=expired", { replace: true });
        return;
      }

      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  // Эффект для первичной загрузки чатов и их обновления каждые 2 секунды
  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 2000);
    return () => clearInterval(interval);
  }, []);

  // Обработка выбора чата
  const handleSelectChat = (id, name, type) => {
    setSelectedChat(id);
    setChatName(name);
    setChatType(type);
  };

  // Создание группового чата
  const handleCreateChat = async (name) => {
    try {
      const response = await fetch("/api/chats/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.detail || "Failed to create chat");
        return;
      }

      const newChat = await response.json();
      setChats((prev) => ({
        ...prev,
        group: [...prev.group, newChat],
      }));
    } catch (error) {
      console.error("Error creating chat:", error);
      alert("Failed to create chat");
    }
  };

  // Создание личного чата
  const handleCreatePersonalChat = async (username) => {
    try {
      const response = await fetch("/api/chats/create_personal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.detail || "Failed to create personal chat");
        return;
      }

      const newChat = await response.json();
      setChats((prev) => ({
        ...prev,
        personal: [...prev.personal, newChat],
      }));
    } catch (error) {
      console.error("Error creating personal chat:", error);
      alert("Failed to create personal chat");
    }
  };

  return (
    <div className="chats-page">
  {/* Левая панель: ChatUser + ChatList */}
  <div className="left-panel">
    <ChatUser fetchChats={fetchChats} />
    <ChatList
      chats={chats}
      onSelectChat={handleSelectChat}
      onCreateChat={handleCreateChat}
      onCreatePersonalChat={handleCreatePersonalChat}
    />
    <footer className="chat-list-footer">
        <span>Messly</span>
    </footer>
  </div>

  {/* Правая панель: ChatWindow */}
  {/* Правая панель: ChatWindow */}
{selectedChat ? (
  <ChatWindow chatId={selectedChat} chatName={chatName} chatType={chatType} />
) : (
  <div className="chat-window-container">
    <div className="no-chat-selected">
      <img
        src="/api/static/others/no-chat.gif"
        alt="No Chat"
        className="no-chat-gif"
      />
      Please select a chat
    </div>
  </div>
)}

</div>

  );
};

export default Chats;
