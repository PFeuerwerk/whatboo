FROM nginx:1.10.1-alpine
COPY src/html /usr/share/nginx/html
WORKDIR /app


# Documentation
# EXPOSE 80
# ENTRYPOINT ["nginx", "-g", "daemon off"]