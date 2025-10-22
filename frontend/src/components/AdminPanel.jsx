import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Static/AdminPanel.css";

const AdminPanel = () => {
    const [adminData, setAdminData] = useState(null);
    const [users, setUsers] = useState([]);
    const [chats, setChats] = useState([]);
    const [messages, setMessages] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editUserId, setEditUserId] = useState(null);
    const [editUsername, setEditUsername] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editRole, setEditRole] = useState("user");
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredUsers, setFilteredUsers] = useState([]);
    const token = localStorage.getItem("access_token");

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const response = await fetch("/api/admin-panel", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setAdminData(data);
                } else {
                    throw new Error("Не удалось загрузить данные администратора.");
                }
            } catch (err) {
                setError(err.message);
            }
        };

        const fetchUsers = async () => {
            try {
                const response = await fetch("/api/admin-panel/users/", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setUsers(data);
                    setFilteredUsers(data);
                } else {
                    throw new Error("Не удалось загрузить пользователей.");
                }
            } catch (err) {
                setError(err.message);
            }
        };

        const fetchChats = async () => {
            try {
                const response = await fetch("/api/admin-panel/chats/", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setChats(data);
                } else {
                    throw new Error("Не удалось загрузить чаты.");
                }
            } catch (err) {
                setError(err.message);
            }
        };

        const fetchMessages = async () => {
            try {
                const response = await fetch("/api/admin-panel/messages/", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setMessages(data);
                } else {
                    throw new Error("Не удалось загрузить сообщения.");
                }
            } catch (err) {
                setError(err.message);
            }
        };

        const fetchStatistics = async () => {
            try {
                const response = await fetch("/api/admin-panel/statistics/", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setStatistics(data);
                } else {
                    throw new Error("Не удалось загрузить статистику.");
                }
            } catch (err) {
                setError(err.message);
            }
        };

        fetchAdminData();
        fetchUsers();
        fetchChats();
        fetchMessages();
        fetchStatistics();
    }, [token]);

    const handleDelete = async (userId) => {
        const confirmDelete = window.confirm("Вы уверены, что хотите удалить этого пользователя?");
        if (confirmDelete) {
            try {
                const response = await fetch(`/api/users/${userId}/`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (response.ok) {
                    const newUsers = users.filter((user) => user.id !== userId);
                    setUsers(newUsers);
                    setFilteredUsers(newUsers);
                    alert("Пользователь удален успешно!");
                } else {
                    const data = await response.json();
                    setError(data.detail || "Не удалось удалить пользователя.");
                }
            } catch (err) {
                setError("Произошла ошибка при удалении пользователя.");
            }
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        const filtered = users.filter(
            (user) =>
                user.username.toLowerCase().includes(query.toLowerCase()) ||
                user.email.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredUsers(filtered);
    };

    const handleEdit = (user) => {
        setEditUserId(user.id);
        setEditUsername(user.username);
        setEditEmail(user.email);
        setEditRole(user.role);
        setIsEditing(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const updatedUser = { username: editUsername, email: editEmail, role: editRole };

        try {
            const response = await fetch(`/api/users/${editUserId}/update/`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(updatedUser),
            });
            if (response.ok) {
                const updatedData = await response.json();
                const newUsers = users.map((user) =>
                    user.id === updatedData.user.id ? updatedData.user : user
                );
                setUsers(newUsers);
                setFilteredUsers(newUsers);
                setIsEditing(false);
                alert("Пользователь обновлен успешно!");
            } else {
                const data = await response.json();
                setError(data.detail || "Не удалось обновить пользователя.");
            }
        } catch (err) {
            setError("Произошла ошибка при обновлении данных.");
        }
    };

    if (error) {
        return (
            <div className="error-message">
                <h1>Ошибка</h1>
                <p>{error}</p>
                <Link to="/login">Вернуться на страницу логина</Link>
            </div>
        );
    }

    if (!adminData) {
        return <div>Загрузка панели...</div>;
    }

    return (
        <div className="admin-panel">
            <header className="admin-header">
                <h1>Добро пожаловать, {adminData.username}!</h1>

                <Link to="/login" className="logout-button">Выйти</Link>
            </header>

            <section className="admin-section">
                <h2>Статистика</h2>
                <div className="statistics">
                    <p>Пользователей: {statistics.total_users}</p>
                    <p>Чатов: {statistics.total_chats}</p>
                    <p>Сообщений: {statistics.total_messages}</p>
                </div>
            </section>

            <section className="admin-section">
                <h2>Список чатов</h2>
                {chats.map((chat) => (
                    <div key={chat.id} className="chat-item">
                        <h3>{chat.name} ({chat.type})</h3>
                        <p>Создатель: {chat.creator}</p>
                        <ul>
                            {chat.members.map((member) => (
                                <li key={member.id}>{member.username}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>



            <section className="user-section">
                <h2>Список пользователей</h2>
                <div className="filters">
                    <input
                        type="text"
                        placeholder="Поиск по имени или email"
                        value={searchQuery}
                        onChange={handleSearch}
                    />
                </div>
                <table className="user-table">
                    <thead>
                        <tr>
                            <th>Имя пользователя</th>
                            <th>Email</th>
                            <th>Роль</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td>{user.username}</td>
                                <td>{user.email}</td>
                                <td>{user.role}</td>
                                <td>
                                    <button onClick={() => handleEdit(user)}>Редактировать</button>
                                    <button onClick={() => handleDelete(user.id)}>Удалить</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {isEditing && (
                <section className="edit-user-form">
                    <h3>Редактирование пользователя</h3>
                    <form onSubmit={handleSave}>
                        <div>
                            <label>Имя пользователя:</label>
                            <input
                                type="text"
                                value={editUsername}
                                onChange={(e) => setEditUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label>Email:</label>
                            <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label>Роль:</label>
                            <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                                <option value="user">Пользователь</option>
                                <option value="admin">Администратор</option>
                            </select>
                        </div>
                        <button type="submit">Сохранить изменения</button>
                        <button type="button" onClick={() => setIsEditing(false)}>Отмена</button>
                    </form>
                </section>
            )}
        </div>
    );
};

export default AdminPanel;
