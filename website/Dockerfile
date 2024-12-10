# Используем официальный образ Python
FROM python:3.9-slim

# Устанавливаем рабочую директорию
WORKDIR /app



COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Копируем файлы проекта в контейнер
COPY ./app /app

# Копируем статические файлы в контейнер
COPY ./app/static /app/static

# Открываем порт 8000
EXPOSE 8000

# Команда для запуска FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
