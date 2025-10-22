import React from "react";
import "./Static/ReactionButton.css";

const ReactionButton = ({ messageId, reactions, currentUsername, handleReaction, position }) => {
  const validReactions = Array.isArray(reactions) ? reactions : []; // Проверка на массив
  const userHasReacted = validReactions.some((r) => r.username === currentUsername); // Проверка, поставил ли пользователь реакцию
  const hasReactions = validReactions.length > 0; // Проверка, есть ли вообще реакции

  return (
    <div
      className={`reaction-container ${
        position === "left" ? "reaction-left" : "reaction-right"
      }`}
    >
      {/* Кнопка с сердечком */}
      <div
        className={`reaction-button ${userHasReacted || hasReactions ? "active" : ""}`}
        onClick={() => handleReaction(messageId)}
        title="Click to react"
      >
        ❤️
       </div>
      {/* Отображение аватарок или количества реакций */}
      {hasReactions && (
        <div className="reaction-avatars">
          {validReactions.length > 3 ? (
            <span className="reaction-count">{validReactions.length}</span>
          ) : (
            validReactions.map((reaction) => (
              <img
                key={reaction.user_id}
                src={`/api/${reaction.avatar}`} // Загрузка аватарки
                alt={reaction.username}
                className="reaction-avatar"
                title={reaction.username}
                onError={(e) => {
                  e.target.src = "/api/static/avatars/default.png"; // Замена на дефолтный аватар
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ReactionButton;
