import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import Chats from "./components/Chats";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPanel from "./components/AdminPanel";

const App = () => {
    return (
        <Router>
            <Routes>
                {/* По умолчанию перенаправляем на /login */}
                <Route path="/" element={<Navigate to="/login" />} />

                {/* Маршрут для логина */}
                <Route path="/login" element={<LoginForm />} />

                {/* Маршрут для регистрации */}
                <Route path="/register" element={<RegisterForm />} />

                {/* Защищенный маршрут для чатов */}
                <Route
                    path="/chats"
                    element={
                        <ProtectedRoute>
                            <Chats />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin-panel"
                    element={
                        <ProtectedRoute>
                            <AdminPanel />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    );
};

export default App;
