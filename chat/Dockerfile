# Используем официальный образ Python
FROM python:3.9-slim

# Устанавливаем рабочую директорию
WORKDIR /app

COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Копируем файлы проекта в контейнер
COPY ./app /app


# Открываем порт 8001
EXPOSE 8001

# Команда для запуска WebSocket
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
