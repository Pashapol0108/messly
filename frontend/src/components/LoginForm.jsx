import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import './Static/LoginForm.css';

const LoginForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(false); // Состояние для анимации появления
    const [isSubmitting, setIsSubmitting] = useState(false); // Состояние для анимации исчезновения
    const [isReverseAnimation, setIsReverseAnimation] = useState(false); // Новое состояние для обратной анимации
    const [isButtonShaking, setIsButtonShaking] = useState(false); // Состояние для анимации кнопки
    const [isGifVisible, setIsGifVisible] = useState(false); // Состояние для отображения GIF

    const queryParams = new URLSearchParams(location.search);
    const sessionExpired = queryParams.get("session") === "expired";

    useEffect(() => {
        // Включаем анимацию появления при монтировании компонента
        setIsVisible(true);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);


        try {
            // Очищаем localStorage перед входом нового пользователя
            localStorage.clear();

            // Отправляем запрос на логин
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    email,
                    password,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem("access_token", data.access_token); // Сохраняем токен

                // Получаем информацию о текущем пользователе
                const userResponse = await fetch("/api/me", {
                    headers: { Authorization: `Bearer ${data.access_token}` },
                });

                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    localStorage.setItem("username", userData.username); // Сохраняем имя пользователя
                    localStorage.setItem(
                        "profile_picture",
                        userData.profile_picture || "/api/static/avatars/default.png"
                    ); // Сохраняем аватарку пользователя или дефолтное изображение
                     setIsGifVisible(true);
                     setTimeout(() => {
                        navigate("/chats"); // Перенаправляем на /chats после задержки
                     }, 1300);
                } else {
                    setError("Failed to fetch user data");
                }
            } else {
                const errorData = await response.json();
                setError(errorData.detail || "Login failed");
                setIsButtonShaking(true);
                setTimeout(() => {
                setIsButtonShaking(false); // Сбрасываем анимацию "шейкинга"
                setIsGifVisible(false);
            }, 800); // Время соответствует длительности анимации
            }
        } catch (err) {
            setError("Network error");
            setIsButtonShaking(true);
            setTimeout(() => {
            setIsButtonShaking(false); // Сбрасываем анимацию "шейкинга"
            setIsGifVisible(false);
        }, 800); // Время соответствует длительности анимации
        }
    };

    const handleSignInClick = (e) => {
        e.preventDefault(); // Отменяем стандартный переход по ссылке
        setIsSubmitting(true); // Начинаем анимацию исчезновения
        setIsReverseAnimation(true); // Включаем обратную анимацию для заголовка


        // Даем время на анимацию исчезновения перед редиректом
        setTimeout(() => {
            navigate("/register"); // Перенаправляем на /login после задержки
        }, 1000); // Задержка на 1.5 секунды для завершения анимации
    };

    // После того как анимация fade-in завершена, меняем состояние на false для fade-out
    useEffect(() => {
        if (isVisible) {
            const timeout = setTimeout(() => {
                setIsVisible(false); // Делаем невидимым после завершения анимации fade-in
            }, 1000); // Задержка, равная времени анимации fade-in
            return () => clearTimeout(timeout); // Очистка таймера при размонтировании
        }
    }, [isVisible]);

    return (
        <div className="login-container">
            <div
                className={`header ${isReverseAnimation ? 'reverse' : ''}`} // Добавляем класс для обратной анимации
            >
                <h1>Messly</h1>
            </div>
            <div className={`box ${isSubmitting ? "fade-out" : ""} ${isVisible ? "fade-in" : ""}`}>
                <div className="form">
                    <h2>SignIn</h2>
                    {sessionExpired && <p className="error">Пожалуйста, войдите снова.</p>}
                    {error && <p className="error">{error}</p>}
                    <form onSubmit={handleSubmit}>
                        <div className="inputBox">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <span>Login</span>
                            <i></i>
                        </div>
                        <div className="inputBox">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <span>Password</span>
                            <i></i>
                        </div>

                        <div className="links">
                            <a href="/register" onClick={handleSignInClick}>Sign Up</a>
                        </div>
                        <input type="submit" value="Login" className={isButtonShaking ? "shake-horizontal" : ""} />
                        {/* Отображаем GIF только если isGifVisible = true */}
                        {isGifVisible && (
                            <div>
                                <img
                                    src="/api/static/others/Login.gif"
                                    alt="Login-ok"
                                    className="login-gif"
                                />
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;
