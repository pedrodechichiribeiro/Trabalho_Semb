FROM python:3.11-slim

ARG UID=1000
ARG GID=1000

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN groupadd -g ${GID} app && useradd -m -u ${UID} -g ${GID} app

# pyserial etc.
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bridge.py ./bridge.py
RUN chown -R ${UID}:${GID} /app
USER ${UID}:${GID}

# acesso ao /dev/ttyACM* virá do host (bind), então o user do container
# deve ter permissão; se precisar, acrescente grupos no compose (e.g. dialout)
CMD ["python", "-u", "bridge.py"]
