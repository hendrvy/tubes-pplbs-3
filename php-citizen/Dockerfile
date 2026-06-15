FROM php:8.2-fpm-alpine

WORKDIR /var/www/html

RUN docker-php-ext-install pdo pdo_mysql && \
    apk add --no-cache curl nginx

COPY index.php health.php ./

RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /var/www/html; \
    index index.php; \
    location / { \
        try_files $uri $uri/ /index.php?$args; \
    } \
    location ~ \.php$ { \
        fastcgi_pass 127.0.0.1:9000; \
        fastcgi_index index.php; \
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; \
        include fastcgi_params; \
    } \
}' > /etc/nginx/http.d/default.conf

RUN addgroup -g 82 -S www-data && \
    adduser -u 82 -S www-data -G www-data && \
    chown -R www-data:www-data /var/www/html

USER www-data

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/health.php || exit 1

CMD ["sh", "-c", "php-fpm -D && nginx -g 'daemon off;'"]