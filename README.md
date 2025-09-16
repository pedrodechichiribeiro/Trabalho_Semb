# Telemetria (car + central) — Backend + Frontend

Sistema completo de **coleta, processamento e visualização** de telemetria para um carro RC controlado por duas **STM32F411 “Black Pill”**:

- **Carro (car):** lê **IMU** (acel/giros), **GPS**, e **drive** (PWM/velocidade); envia dados.
- **Central (centric):** lê **controles** (volante/ângulo, velocidade, sentido) de potenciômetros/botão e envia comandos/estado.
- Um computador recebe tudo (via USB serial/MQTT/HTTP), **processa** e **exibe** gráficos em tempo real.

- Foco: a **aplicação** (backend + frontend). O hardware é descrito para contexto.

---

## 1) Visão geral da arquitetura

```
[STM32F411 CARRO] --Wi‑Fi--> (MQTT) ─┐
                                      ├─> [Backend FastAPI]
[STM32F411 CENTRAL] --USB--> [PC] ----┘      ├─ Persistência: SQLite
                                             ├─ HTTP REST: /api/v1/...
                                             ├─ WebSocket: /ws (broadcast)
                                             └─ Enriquecimento + Derivados

[Frontend React/MUI/ECharts/Leaflet] <---- HTTP/WS ----> [Backend]
```

```
[STM32 CARRO]──┐
               ├──> (a) MQTT  ──> [mosquitto] ──> [api (FastAPI)] ──> WebSocket/DB/HTTP
[STM32 CENTRAL]┘
                                  ↑
                   (b) HTTP direto│
                                  │
                         [feeder_http]  →  POST /api/v1/telemetry_raw/ingest
                                  │
                   (c) Serial     │
               [serial_bridge] ───┘  (publica no MQTT ou faz POST HTTP)
```

- **STM32 (car):** IMU, GPS, ponte H (pwm), envia telemetria.
- **STM32 (central):** volante (ângulo) + potenciômetros + botão; envia estado/comando.
- **Broker MQTT (Mosquitto):** desacopla produtores/consumidores.
- **Backend (FastAPI + SQLite):**
  - Consome MQTT/HTTP/serial;
  - **Salva dados brutos** (tabela `telemetry_raw`);
  - **Gera versão processada** (tabela `telemetry`) com datas e derivados;
  - **WebSocket** para streaming ao vivo;
  - **HTTP** para ingestão/consulta.
- **Frontend (Vite + TS + React + MUI + ECharts + Leaflet):**
  - Painel ao vivo (volante/bússola), gráficos de Carro e Central, mapa OSM e scatter de lat×lon.

---

## 2) Hardware e Sinais

### 2.1 Módulo do Carro (fonte `car`)
- **IMU** (manteremos a chave `imu`):
  - Aceleração bruta: `accelerationX/Y/Z` (inteiro assinado, faixa **−128…+127**).
  - Giroscópio bruto: `spinX/Y/Z` (inteiro assinado, **−128…+127**).
  - **Escala do giroscópio**: `scale_dps` ∈ {**250, 500, 1000, 2000**} (°/s).
- **Ponte H (drive)**:
  - `pwm` (0–255).
  - `speed_est_mps` (**m/s**, estimado).
- **GPS**: `latitude`/`longitude` (float, WGS84).

### 2.2 Módulo Central (fonte `centric`)
- **Controles do operador** (`controls`):
  - `curve_direction` (0…360): posição de volante/curva (origem do firmware).
  - `speed` (0…255): byte de comando de velocidade.
  - `movement_direction` (1 frente, 0 ré).

---

## 3) Formato dos Dados

### 3.1 Payload **bruto** (SEM data) — salvo como chegou
```json
{
  "car": {
    "gps": { "latitude": -23.5586, "longitude": -46.6492 },
    "imu": {
      "accelerationX": 100,
      "accelerationY": 100,
      "accelerationZ": 100,
      "spinX": 100,
      "spinY": 100,
      "spinZ": 100,
      "scale_dps": 500
    },
    "drive": { "pwm": 120, "speed_est_mps": 3.33 }
  },
  "centric": {
    "controls": { "curve_direction": 49, "speed": 120, "movement_direction": 1 }
  },
  "src": "test"
}
```

> O payload **bruto não tem `ts`**. O backend carimba a data na etapa de processamento.

### 3.2 Registro **processado** (COM datas e derivados)
```json
{
  "ts": 1757588324210,
  "ts_iso": "2025-09-15T07:18:44.210Z",
  "ts_local": "2025-09-15 04:18:44.210-03:00",
  "src": "test",

  "car": {
    "gps": { "latitude": -23.5586, "longitude": -46.6492 },
    "imu": {
      "accelerationX": 100,
      "accelerationY": 100,
      "accelerationZ": 100,
      "spinX": 100,
      "spinY": 100,
      "spinZ": 100,
      "scale_dps": 500
    },
    "drive": { "pwm": 120, "speed_est_mps": 3.33 }
  },

  "centric": {
    "controls": {
      "curve_direction": 49,
      "speed": 120,
      "movement_direction": 1,
      "derived": {
        "steering_deg": 49,
        "steering_side": "right",
        "speed_cmd_byte": 120,
        "speed_cmd_pct": 0.4706,
        "speed_cmd_mps": 0.4706 * VMAX_MPS,
        "movement_direction_text": "front"
      }
    }
  }
}
```

#### Regras de derivação (backend)
- **Datas**: `ts` (epoch ms), `ts_iso` (UTC) e `ts_local` (fuso via `API_TZ`).
- **Volante** (`steering_deg` a partir de `curve_direction`):
  - `curve_direction <= 180` → `steering_deg = +curve_direction` (direita; **0/180 ≈ 0°**).
  - `curve_direction > 180` → `steering_deg = -(360 - curve_direction)` (esquerda).
  - `steering_side`: `right` | `left` | `straight`.
- **Velocidade de comando**:
  - `speed_cmd_pct = speed / 255` (0..1).
  - `speed_cmd_mps = speed_cmd_pct * VMAX_MPS` (constante).
- **Validações (clamp)**:
  - `pwm` 0–255; `speed` 0–255; `curve_direction` 0–360;
  - IMU bruta **−128..+127**; `scale_dps` ∈ {250, 500, 1000, 2000}.

---

## 4) Dicionário de Dados (principais)

| Caminho                                   | Tipo       | Unidade/Valores            | Descrição |
|-------------------------------------------|------------|----------------------------|-----------|
| `car.gps.latitude`                        | float      | graus                      | Latitude WGS84 |
| `car.gps.longitude`                       | float      | graus                      | Longitude WGS84 |
| `car.imu.accelerationX/Y/Z`               | int        | −128..+127                 | Aceleração bruta (sem m/s²) |
| `car.imu.spinX/Y/Z`                       | int        | −128..+127                 | Giroscópio bruto |
| `car.imu.scale_dps`                       | int        | °/s (250/500/1000/2000)    | Faixa/escala do giroscópio |
| `car.drive.pwm`                           | int        | 0..255                     | Duty/ação na ponte H |
| `car.drive.speed_est_mps`                 | float      | m/s                        | Velocidade estimada |
| `centric.controls.curve_direction`        | int        | 0..360                     | Posição do volante (origem firmware) |
| `centric.controls.speed`                  | int        | 0..255                     | Byte de comando de velocidade |
| `centric.controls.movement_direction`     | int        | 1/0                        | 1=frente, 0=ré |
| `centric.controls.derived.steering_deg`   | float      | graus                      | Direita positiva, esquerda negativa |
| `centric.controls.derived.steering_side`  | string     | right/left/straight        | Lado/estado do volante |
| `centric.controls.derived.speed_cmd_pct`  | float      | 0..1                       | Percentual do comando |
| `centric.controls.derived.speed_cmd_mps`  | float      | m/s                        | Velocidade derivada do comando |
| `ts`, `ts_iso`, `ts_local`                | number/str | ms / ISO / local           | Datas geradas no backend |
| `src`                                     | string     | –                          | Identificador da origem |

---

## 5) Banco de Dados (SQLite)

**Objetivo:** manter **compatibilidade histórica** (tabela bruta) e **consultas eficientes** (tabela processada).

### 5.1 Tabela `telemetry_raw`
- `id` (PK autoincrement)
- `received_at` (epoch ms, auto) — quando o backend recebeu
- `src` (TEXT, opcional)
- `raw_json` (TEXT) — **payload bruto** exatamente como chegou

**Índices:** `(received_at)`, `(src, received_at)`

### 5.2 Tabela `telemetry`
- `id` (PK autoincrement)
- `ts` (epoch ms), `ts_iso` (TEXT), `ts_local` (TEXT)
- `src` (TEXT)
- Colunas indexadas úteis:
  - `lat` (REAL), `lon` (REAL)         ← cópia de `car.gps.*`
  - `speed_est_mps` (REAL)
  - `pwm` (INTEGER)
  - `steering_deg` (REAL)
  - `speed_cmd_pct` (REAL)
  - `speed_cmd_mps` (REAL)
  - `movement_dir` (INTEGER)           ← 1/0
- `doc_json` (TEXT) — registro **processado** completo

**Índices:** `(ts)`, `(src, ts)`, `(lat, lon)`

---

## 6) Modos de Execução (e por quê)

A aplicação suporta **perfis** no `docker compose` para facilitar diferentes cenários:

1) **Modo Simulador** (`COMPOSE_PROFILES=sim`)  
   - **Por quê existe:** validar toda a pipeline (MQTT → backend → WebSocket → frontend) **sem hardware**.  
   - **O que faz:** um serviço publica **telemetria sintética** no broker conforme o formato acima.

2) **Modo Serial (ponte Serial→MQTT/HTTP)** (`COMPOSE_PROFILES=serial`)  
   - **Por quê existe:** quando o **hardware real** do carro/central envia **JSON pela USB/serial**, esta ponte lê a serial e publica no **MQTT** ou faz **POST** na API.  
   - **Resistente:** se a placa não estiver conectada, a ponte fica em **retry** até encontrar a porta (ex.: `/dev/ttyACM0`).

3) **Modo HTTP Direto** (`COMPOSE_PROFILES=http`)  
   - **Por quê existe:** debugar/testar ou integrar sistemas sem broker, enviando **POST** diretamente para o backend (`/api/v1/telemetry_raw/ingest`).

> Perfis podem ser combinados, mas normalmente use **um por vez** para a fonte de dados.

---

## 7) Rotas da API

Base: **`/api/v1`**

### 7.1 Brutos — `telemetry_raw`
- `POST /telemetry_raw/ingest` — ingestão de **dados brutos**.
- `GET /telemetry_raw/latest` — último registro bruto.
- `GET /telemetry_raw/list?limit=&offset=` — lista bruta (ordem decrescente por tempo de recebimento).

### 7.2 Processados — `telemetry`
- `GET /telemetry/latest` — **último processado** (com `ts/ts_iso/ts_local` + `derived`).
- `GET /telemetry/list?limit=&offset=` — lista processada.

### 7.3 Health
- `GET /health` — status simples.

### 7.4 WebSocket
- `ws://localhost:8000/ws` — stream de **registros processados** em tempo real.

---

## 8) Frontend (UI)

- **Volante (card principal):** SVG **D-shape** com rotação por `steering_deg` + **bússola** (0° topo, −180°..+180°).  
- **Carro:**
  - **Velocidade (m/s)**: `car.drive.speed_est_mps`.
  - **PWM (0–255)**: `car.drive.pwm`.
  - **IMU** (6 gráficos): `accX/accY/accZ` e `spinX/spinY/spinZ` (faixa fixa **−128..+127**).
  - **GPS Mapa**: Leaflet/OSM com trilha + ponto atual (auto-fit).
  - **GPS Scatter (lat×lon)**: **X=latitude**, **Y=longitude** (sem tempo) para leitura visual/numerária.
- **Central:**
  - **Vel. Comando (m/s)**: `controls.derived.speed_cmd_mps`.
  - **Direção (ângulo, °)** no tempo: `controls.derived.steering_deg`.
  - **Movimento**: `movement_direction` (1=front, 0=back).
- **Layout:** **2 gráficos por linha** (telas `md+`).

---

## 9) Execução

### 9.1 Pré-requisitos
- **Docker** e **Docker Compose**.
- (Opcional) **Node.js ≥ 20.19** se rodar o front fora do Docker.

### 9.2 `.env` (raiz)
```dotenv
# Perfis
COMPOSE_PROFILES=sim          # sim | serial | http

# Ports
MOSQUITTO_PORT=1883
API_PORT=8000
FRONT_PORT=5173

# UID/GID para containers rootless
UID=1000
GID=1000

# Backend API
UVICORN_HOST=0.0.0.0
UVICORN_PORT=8000
SQLITE_PATH=/data/telemetry.db
API_TZ=America/Sao_Paulo
CORS_ORIGINS=http://localhost:5173
VMAX_MPS=12

# MQTT
MQTT_URL=mqtt://mosquitto:1883
MQTT_TOPIC=telemetry/combined/1
MQTT_USERNAME=
MQTT_PASSWORD=

# SIM (perfil sim)
SIM_INTERVAL_MS=200
SIM_SRC=sim

# HTTP Feeder (perfil http)
API_INGEST_URL=http://api:8000/api/v1/telemetry_raw/ingest
FEEDER_INTERVAL_MS=200

# Serial Bridge (perfil serial)
SERIAL_PORT=/dev/ttyACM0
SERIAL_BAUD=115200
BRIDGE_MODE=mqtt   # mqtt | http

# Frontend
VITE_API_HTTP_URL=http://localhost:8000
VITE_API_WS_URL=ws://localhost:8000/ws
```

### 9.3 Subir com Docker
```bash
docker compose up -d --build
# usa o perfil de COMPOSE_PROFILES do .env (ex.: sim)
```

- Frontend: http://localhost:5173  
- Swagger (API): http://localhost:8000/docs

> **Volumes antigos root:root?** Faça `docker compose down -v` antes de subir novamente para recriar volumes com a nova política de usuário (UID/GID).

---

## 10) Serviços (Docker)

- **mosquitto**: broker MQTT (porta `1883`).
- **api**: FastAPI + SQLite; consome, persiste (bruto e processado), **WS** e **HTTP**.
- **frontend**: app Vite dev-server (porta `5173`). **Node 20+** (no container).
- **simulator** *(perfil `sim`)*: publica telemetria sintética. Usa `loop_start()` para keepalive.
- **feeder_http** *(perfil `http`)*: publica direto via HTTP.
- **serial_bridge** *(perfil `serial`)*: lê JSON da serial e publica em MQTT ou HTTP.

> Todos os Dockerfiles/serviços rodam **rootless** (com `UID/GID` do host), evitando arquivos com propriedade `root` nos volumes/binds.

---

## 11) Troubleshooting

- **Node antigo / Vite falha**: “You are using Node 18.x; Vite requires 20.19+” → atualize Node ou use Docker.
- **Cliente MQTT desconecta por timeout**: verifique se o produtor chama `client.loop_start()` e keepalive > 0 (simulador já OK).
- **Porta 1883 ocupada**: mude `MOSQUITTO_PORT` ou desligue serviço em conflito.
- **CORS bloqueando front**: inclua `http://localhost:5173` em `CORS_ORIGINS`.
- **Serial sem placa**: `serial_bridge` fica em retry; use esse perfil só quando a porta existir.
- **Volumes com arquivos root:root**: refaça com `docker compose down -v && up -d --build`.

