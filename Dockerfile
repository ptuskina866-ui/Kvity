FROM php:8.2-cli-alpine

# Установка необходимых расширений для SQLite
RUN apk add --no-cache sqlite-dev \
    && docker-php-ext-install pdo pdo_sqlite

WORKDIR /app

# Копируем исходный код проекта
COPY . /app

# Создаем папку для базы данных и выставляем права
RUN mkdir -p /app/database && chmod -R 777 /app/database

# Порт по умолчанию (Cloud сервисы передают переменную PORT)
ENV PORT=8000
EXPOSE 8000

# Запуск встроенного веб-сервера
CMD php -S 0.0.0.0:${PORT} -t public public/index.php
