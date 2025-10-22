import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
    const [userRole, setUserRole] = useState(null); // null - проверка, "user"/"admin"
    const token = localStorage.getItem("access_token");
    const [loading, setLoading] = useState(true); // Добавим флаг загрузки


    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                clearLocalStorage();
                setUserRole(null);
                setLoading(false);
                return;
            }
            try {
                const response = await fetch("/api/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    const storedUsername = localStorage.getItem("username");
                    if (!storedUsername || storedUsername !== data.username) {
                        localStorage.setItem("username", data.username);
                    }
                    // Устанавливаем роль
                    setUserRole(data.role); // Добавьте поле `role` в ответ эндпоинта /me
                } else {
                    throw new Error("Invalid token");
                }
            } catch {
                clearLocalStorage();
                setUserRole(null);
            } finally {
                setLoading(false);
                }
        };

        validateToken();
    }, [token]);

    const clearLocalStorage = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
    };

    if (loading) {
        return <div>Loading...</div>; // Пока загружается, показываем спиннер
    }

    if (!userRole) {
        return <Navigate to="/login?session=expired" replace />;
    }

    if (userRole === "admin" && window.location.pathname !== "/admin-panel") {
    return <Navigate to="/admin-panel" replace />;
    }

    return children;
};


export default ProtectedRoute;
