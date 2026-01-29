FROM node:18

# Permitir Meteor como root (CI / Docker)
ENV METEOR_ALLOW_SUPERUSER=true

# Instalar curl
RUN apt-get update && apt-get install -y curl

# Instalar Meteor
RUN curl https://install.meteor.com/ | sh

WORKDIR /app

# Copiar el proyecto
COPY . .

# 🔑 PASO CLAVE: instalar dependencias Meteor
RUN meteor npm install

# Construir la app
RUN meteor build --directory /build --server-only

# Instalar deps del bundle
WORKDIR /build/bundle/programs/server
RUN npm install

WORKDIR /build/bundle

ENV PORT=3000
EXPOSE 3000

CMD ["node", "main.js"]
