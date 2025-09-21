FROM node:20-slim

ARG UID=1000
ARG GID=1000

# Só cria grupo/usuário se o GID/UID NÃO existirem; caso existam, 
# usamos os IDs numéricos direto
RUN set -eux; \
    if ! getent group "${GID}" >/dev/null; then \
        groupadd -g "${GID}" app; \
    fi; \
    if ! getent passwd "${UID}" >/dev/null; then \
        useradd -m -u "${UID}" -g "${GID}" app; \
    fi

WORKDIR /app

# instala deps em camada de build (opcional; com bind mount elas ficam no host)
COPY package*.json ./
RUN npm ci || npm install

# copia o resto para builds de produção; em dev, será sobrescrito por bind mount
COPY . .

USER ${UID}:${GID}
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]