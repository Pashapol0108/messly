# Используем официальный образ Node.js
FROM node:16

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package.json package-lock.json /app/

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY ./src /app/src

# Копируем папку public
COPY ./public /app/public

# Строим приложение для продакшн
RUN npm run build

# Открываем порт 3000
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
