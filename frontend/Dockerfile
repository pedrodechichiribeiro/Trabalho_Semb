FROM node:20-slim

ARG UID=1000
ARG GID=1000

# cria usuário "app" com mesmo UID/GID do host
RUN groupadd -g ${GID} app && useradd -m -u ${UID} -g ${GID} app

WORKDIR /app

# instala deps em camada de build (opcional; com bind mount elas ficam no host)
COPY package*.json ./
RUN npm ci || npm install

# copia o resto para builds de produção; em dev, será sobrescrito por bind mount
COPY . .

# garante ownership (útil quando copiar arquivos dentro da imagem)
RUN chown -R ${UID}:${GID} /app

USER ${UID}:${GID}
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
