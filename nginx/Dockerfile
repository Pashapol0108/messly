# Используем официальный образ NGINX
FROM nginx:alpine

# Копируем конфигурацию NGINX в контейнер
COPY nginx.conf /etc/nginx/nginx.conf

# Открываем порт 80 для внешнего доступа
EXPOSE 80

# Запускаем NGINX
CMD ["nginx", "-g", "daemon off;"]
