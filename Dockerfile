# 🏗️ Stage 1: Build Angular app
FROM node:current-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install && npm run build

# 🚀 Stage 2: Serve with Nginx
FROM nginx:current-alpine
COPY --from=builder /app/dist/* /usr/share/nginx/html/
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80