import React, { useState, useEffect } from "react";
import "./Static/ChatUser.css";

const ChatUser = ({ fetchChats }) => {
  const [currentUsername, setCurrentUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profilePicture, setProfilePicture] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isGifVisible, setIsGifVisible] = useState(false); // Состояние для отображения GIF


  useEffect(() => {
  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        const newAvatarUrl = userData.profile_picture
          ? `/api/${userData.profile_picture}`
          : "/api/static/avatars/default.png";

        setCurrentUsername(userData.username);
        setProfilePicture(newAvatarUrl);
        setDescription(userData.description || "Пользователь Messly");
        localStorage.setItem("username", userData.username);
        localStorage.setItem("profile_picture", newAvatarUrl);
      } else {
        console.error("Failed to fetch user profile");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  fetchUserProfile();
}, []);


  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      setStatusMessage("Username cannot be empty");
      return;
    }

    try {
      const response = await fetch("/api/profile/update_username", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ username: newUsername }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setStatusMessage(errorData.detail || "Failed to update username");
        return;
      }

      const data = await response.json();
      localStorage.setItem("username", data.username);
      setCurrentUsername(data.username);
      setStatusMessage("Username updated successfully!");
      setNewUsername("");
      window.location.reload();
      await fetchChats();
    } catch (error) {
      console.error("Error updating username:", error);
      setStatusMessage("Failed to update username");
    }
  };

const handleUpdateDescription = async () => {
  if (!newDescription.trim()) {
    setStatusMessage("Description cannot be empty");
    return;
  }

  try {
    const response = await fetch("/api/profile/update_description", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify({ description: newDescription }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setStatusMessage(errorData.detail || "Failed to update description");
      return;
    }

    const data = await response.json();
    setDescription(data.description);
    setStatusMessage("Description updated successfully!");
    setNewDescription("");
  } catch (error) {
    console.error("Error updating description:", error);
    setStatusMessage("Failed to update description");
  }
};

const handleCloseSettings = () => {
    setShowProfileSettings(false); // Закрыть модальное окно
    setStatusMessage(""); // Очистить сообщение
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) {
      alert("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/users/upload-avatar/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.detail || "Failed to upload avatar");
        return;
      }

      const data = await response.json();
      const newAvatarUrl = `/api/${data.profile_picture}`;
      localStorage.setItem("profile_picture", newAvatarUrl);
      setProfilePicture(newAvatarUrl);
      alert("Avatar updated successfully!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar");
    }
  };

  const handleLogout = async () => {
    try {
        const token = localStorage.getItem("access_token");
        if (token) {
            // Отправляем запрос на выход
            await fetch("/api/logout", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        }
        setIsGifVisible(true);
    } catch (error) {
        console.error("Failed to logout:", error);
    }

    setTimeout(() => {
    // Очищаем локальное хранилище
      localStorage.clear();
    // Перенаправляем на страницу входа
      window.location.href = "/login";
      setIsGifVisible(false);
    }, 1700);
};


  return (
    <div className="chat-user">
  <div className="avatar-container">
    <img
      src={profilePicture}
      alt="Avatar"
      className="avatar"
      onError={(e) => {
        e.target.src = "/api/static/avatars/default.png";
      }}
    />
    <div className="buttons-container">
      <img
        src="/api/static/others/settings-button.png"
        alt="Settings"
        className="settings-button"
        onClick={() => setShowProfileSettings(true)}
      />
      <img
        src="/api/static/others/exit-button.png"
        alt="Exit"
        className="exit-button"
        onClick={handleLogout}
      />
    </div>
  </div>
  <div className="user-info-container">
    <h3>{currentUsername}</h3>
    {isGifVisible && (
    <div className="gif-container">
      <img
        src="/api/static/others/Logout.gif"
        alt="Logout-ok"
        className="logout-gif"
      />
    </div>
    )}
  </div>


      {showProfileSettings && (
        <div className="modal">

          <div className="modal-content">
              <div className="close-btn" onClick={handleCloseSettings}>
                &times;
              </div>
            <h3>Profile settings</h3>

            {/* Аватарка */}
            <div className="avatar-upload">
              <img
                src={profilePicture}
                alt="Avatar"
                className="avatar-preview"
                onError={(e) => {
                  e.target.src = "/api/static/avatars/default.png";
                }}
              />
              <input type="file" onChange={handleFileChange} />
              <button onClick={handleUploadAvatar}>Upload</button>
            </div>

            {/* Изменение никнейма */}
            <div className="username-update">
              <label>New Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username"

              />
            </div>
            <button onClick={handleUpdateUsername}>Update</button>


            {/* Текущее описание */}
            <div className="current-description">

              <p>{description}</p>
            </div>

            {/* Изменение описания */}
            <div className="description-update">
              <label>New Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Enter new description"
              />
            </div>
            <div>
            <button onClick={handleUpdateDescription}>Update</button>
            </div>
            <p className="status-message">{statusMessage}</p>
          </div>

        </div>
      )}
    </div>
  );
};

export default ChatUser;
