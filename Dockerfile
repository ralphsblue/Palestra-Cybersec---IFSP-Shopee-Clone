# Node 24: modulo node:sqlite (DatabaseSync) esta estavel nesta versao
FROM node:24-alpine

# Diretorio da app dentro do container
WORKDIR /app

# Instala dependencias primeiro (melhor cache de camadas)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copia o restante do codigo
COPY . .

# Garante que a pasta de uploads exista em runtime
RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
