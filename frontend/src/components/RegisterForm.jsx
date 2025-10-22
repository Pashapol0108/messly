import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import './Static/RegisterForm.css';

const RegisterForm = () => {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false); // Состояние для анимации
    const [isVisible, setIsVisible] = useState(false); // Состояние для анимации появления
    const [isReverseAnimation, setIsReverseAnimation] = useState(false); // Новое состояние для обратной анимации
    const [isButtonShaking, setIsButtonShaking] = useState(false); // Состояние для анимации кнопки
    const [isGifVisible, setIsGifVisible] = useState(false); // Состояние для отображения GIF

    useEffect(() => {
        // Включаем анимацию появления при монтировании компонента
        setIsVisible(true);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    username,
                    password,
                }),
            });

            if (response.ok) {
                setIsGifVisible(true);
                setTimeout(() => {
                setIsSubmitting(true); // Начинаем анимацию
                setIsReverseAnimation(true); // Включаем обратную анимацию для заголовка

                setTimeout(() => {
                    navigate("/login"); // Перенаправляем на /login после задержки
                }, 1200); // Задержка на 1.5 секунды
            }, 1800);
            } else {
                const errorData = await response.json();
                setError(errorData.detail || "Registration failed");
                setIsSubmitting(false); // Если ошибка, отменяем анимацию
                setIsReverseAnimation(false); // Включаем обратную анимацию для заголовка
                setIsButtonShaking(true);
                setTimeout(() => {
                setIsButtonShaking(false); // Сбрасываем анимацию "шейкинга"
                setIsGifVisible(false);
            }, 800);
            }
        } catch (err) {
            setError("Network error");
            setIsSubmitting(false);
            setIsReverseAnimation(false);
            setIsButtonShaking(true);
                setTimeout(() => {
                setIsButtonShaking(false); // Сбрасываем анимацию "шейкинга"
                setIsGifVisible(false);
            }, 800);
        }
    };

    const handleSignInClick = (e) => {
        e.preventDefault(); // Отменяем стандартный переход по ссылке
        setIsSubmitting(true); // Начинаем анимацию исчезновения
        setIsReverseAnimation(true); // Включаем обратную анимацию для заголовка


        // Даем время на анимацию исчезновения перед редиректом
        setTimeout(() => {
            navigate("/login"); // Перенаправляем на /login после задержки
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
        <div className="register-container">
            <div
                className={`header ${isReverseAnimation ? 'reverse' : ''}`} // Добавляем класс для обратной анимации
            >
                <h1>Messly</h1>
            </div>
            <div className={`box ${isSubmitting ? "fade-out" : ""} ${isVisible ? "fade-in" : ""}`}>
                <div className="form">
                    <h2>SignUp</h2>
                    {error && <p className="error">{error}</p>}
                    <form onSubmit={handleSubmit}>
                        <div className="inputBox">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <span>Email</span>
                            <i></i>
                        </div>
                        <div className="inputBox">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                            <span>Username</span>
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
                            <a href="/login" onClick={handleSignInClick}>Sign In</a> {/* Обработчик клика по ссылке */}
                        </div>
                        <input type="submit" value="Register" className={isButtonShaking ? "shake-horizontal" : ""} />
                        {isGifVisible && (
                        <div>
                                <img
                                    src="/api/static/others/Register.gif"
                                    alt="Register-ok"
                                    className="register-gif"
                                />
                            </div>
                            )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterForm;
