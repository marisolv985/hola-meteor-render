FROM node:18

RUN apt-get update && apt-get install -y curl

RUN curl https://install.meteor.com/ | sh

WORKDIR /app
COPY . .

RUN meteor build --directory /build --server-only --allow-superuser

WORKDIR /build/bundle/programs/server
RUN npm install

WORKDIR /build/bundle

ENV PORT=3000
EXPOSE 3000

CMD ["node", "main.js"]
