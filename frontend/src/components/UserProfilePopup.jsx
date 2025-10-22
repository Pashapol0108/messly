import React from "react";
import "./Static/UserProfilePopup.css";

const UserProfilePopup = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="user-popup-modal">
      <div className="user-popup-content">
        <button className="user-popup-close-button" onClick={onClose}>
          &times;
        </button>
        <img
          src={`/api/${user.profile_picture}`}
          alt={`${user.username}'s avatar`}
          className="user-popup-avatar"
          onError={(e) => {
            e.target.src = "/api/static/avatars/default.png";
          }}
        />
        <h3 className="user-popup-name">{user.username}</h3>
        <p className="user-popup-description">{user.description || "Пользователь Messly"}</p>
        <p className={`user-popup-status ${user.status === "online" ? "online" : "offline"}`}>
          {user.status || "offline"}
        </p>
      </div>
    </div>
  );
};

export default UserProfilePopup;
