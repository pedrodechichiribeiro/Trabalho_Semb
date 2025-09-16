# API — FastAPI
FROM python:3.11-slim as base

# ==== args para mapear seu usuário ====
ARG UID=1000
ARG GID=1000

# ==== sistema & usuário ====
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl ca-certificates tzdata \
 && rm -rf /var/lib/apt/lists/*
RUN groupadd -g ${GID} app && useradd -m -u ${UID} -g ${GID} app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# ==== deps python ====
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ==== código ====
COPY app ./app

# ==== diretórios de runtime (ex.: SQLite) ====
RUN mkdir -p /data && chown -R ${UID}:${GID} /data /app

# ==== troca usuário ====
USER ${UID}:${GID}

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
