import { createStore } from "./baseStore";
import type { TelemetryProcessed } from "../types/telemetry";

// ===== Configs de RT =====
const WS_URL = import.meta.env.VITE_API_WS_URL || "ws://localhost:8000/ws";
const FLUSH_MS = 50;            // 20 Hz (16ms ≈ 60Hz)
const WINDOW_MS = 30_000;       // 30s de janela
const MAX_POINTS = 2000;        // backstop
const MAX_QUEUE_FASTFWD = 5000; // fast-forward

// ===== Tipos =====
type IMUSeries = {
  accX: [number, number][];
  accY: [number, number][];
  accZ: [number, number][];
  spinX: [number, number][];
  spinY: [number, number][];
  spinZ: [number, number][];
};

type Series = {
  // já existentes
  speedCar: [number, number][];
  pwm: [number, number][];
  curve: [number, number][];
  imu: IMUSeries;
  gpsLonLat: [number, number][]; // [lon, lat] (p/ ECharts scatter)
  gyroZ?: [number, number][];    // compat opcional

  // 🔹 novos (compat com ChartsPage/GpsMap)
  gps2d: [number, number][];         // [lat, lon] (p/ <GpsMap points={...} />)
  speedCmd: [number, number][];      // m/s de comando (derived.speed_cmd_mps)
  steeringAngle: [number, number][]; // graus (derived.steering_deg)
  directionFB: [number, number][];   // 1=front, 0=back (movement_direction)
};

type State = {
  connected: boolean;
  paused: boolean;
  items: readonly TelemetryProcessed[];
  series: Series;
  last?: TelemetryProcessed;
  lastError?: string;
};

// ===== Estado inicial =====
const emptyIMU = (): IMUSeries => ({
  accX: [], accY: [], accZ: [],
  spinX: [], spinY: [], spinZ: [],
});

const emptySeries = (): Series => ({
  speedCar: [],
  pwm: [],
  curve: [],
  imu: emptyIMU(),
  gpsLonLat: [],
  gyroZ: [],
  // novos:
  gps2d: [],
  speedCmd: [],
  steeringAngle: [],
  directionFB: [],
});

const store = createStore<State>({
  connected: false,
  paused: false,
  items: [],
  series: emptySeries(),
  last: undefined,
  lastError: undefined,
});

// ===== Internos (WS + buffer) =====
let ws: WebSocket | null = null;
const queue: TelemetryProcessed[] = [];
let flushTimer: number | null = null;

function scheduleFlush() {
  if (flushTimer != null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushNow();
  }, FLUSH_MS);
}

function validSample(x: any): x is TelemetryProcessed {
  return x && typeof x === "object" && typeof x.ts === "number";
}

// aceita objeto / string JSON / array / {items:[...]} / Blob(text)
function decodeFrame(data: any): TelemetryProcessed[] {
  let msg: any = data;
  try {
    if (typeof data === "string") msg = JSON.parse(data);
  } catch {
    return [];
  }
  if (msg && typeof msg === "object" && (msg.type === "ping" || msg.op === "ping")) return [];
  if (msg && typeof msg === "object" && Array.isArray(msg.items)) msg = msg.items;
  if (Array.isArray(msg)) return msg.filter(validSample);
  if (validSample(msg)) return [msg];
  return [];
}

function flushNow() {
  if (queue.length === 0) return;

  // lote ordenado por ts ascendente
  const batch = queue.splice(0, queue.length).sort((a, b) => a.ts - b.ts);

  // 1) atualiza janela de items
  const nextItems = [...store.getState().items, ...batch];
  const lastTs = nextItems[nextItems.length - 1]?.ts ?? Date.now();
  const cutoff = lastTs - WINDOW_MS;

  let firstIdx = 0;
  while (firstIdx < nextItems.length && nextItems[firstIdx].ts < cutoff) firstIdx++;
  const pruned = firstIdx > 0 ? nextItems.slice(firstIdx) : nextItems;

  // backstop de quantidade
  const trimmed =
    pruned.length > MAX_POINTS ? pruned.slice(pruned.length - MAX_POINTS) : pruned;

  // 2) recalcula séries no formato esperado pelos seus componentes
  const series: Series = emptySeries();

  for (const p of trimmed) {
    const ts = p.ts;

    // speed (carro, estimada)
    const sp = Number(p?.car?.drive?.speed_est_mps ?? NaN);
    if (Number.isFinite(sp)) series.speedCar.push([ts, sp]);

    // PWM
    const pwm = Number(p?.car?.drive?.pwm ?? NaN);
    if (Number.isFinite(pwm)) series.pwm.push([ts, pwm]);

    // direção (0..360)
    const cd = Number(p?.centric?.controls?.curve_direction ?? NaN);
    if (Number.isFinite(cd)) series.curve.push([ts, cd]);

    // comando de velocidade (m/s)
    const scmd = Number(p?.centric?.controls?.derived?.speed_cmd_mps ?? NaN);
    if (Number.isFinite(scmd)) series.speedCmd.push([ts, scmd]);

    // ângulo de direção derivado (graus)
    const sdeg = Number(p?.centric?.controls?.derived?.steering_deg ?? NaN);
    if (Number.isFinite(sdeg)) series.steeringAngle.push([ts, sdeg]);

    // movimento frente/trás (1 front, 0 back)
    let fb: number | null = null;
    const md = p?.centric?.controls?.movement_direction;
    if (md === 1 || md === 0) fb = md;
    // fallback por texto, caso exista
    const mdt = p?.centric?.controls?.derived?.movement_direction_text;
    if (fb === null && typeof mdt === "string") {
      fb = mdt === "front" ? 1 : mdt === "back" ? 0 : null;
    }
    if (fb !== null) series.directionFB.push([ts, fb]);

    // IMU
    const ax = Number(p?.car?.imu?.accelerationX ?? NaN);
    const ay = Number(p?.car?.imu?.accelerationY ?? NaN);
    const az = Number(p?.car?.imu?.accelerationZ ?? NaN);
    const sx = Number(p?.car?.imu?.spinX ?? NaN);
    const sy = Number(p?.car?.imu?.spinY ?? NaN);
    const sz = Number(p?.car?.imu?.spinZ ?? NaN);

    if (Number.isFinite(ax)) series.imu.accX.push([ts, ax]);
    if (Number.isFinite(ay)) series.imu.accY.push([ts, ay]);
    if (Number.isFinite(az)) series.imu.accZ.push([ts, az]);
    if (Number.isFinite(sx)) series.imu.spinX.push([ts, sx]);
    if (Number.isFinite(sy)) series.imu.spinY.push([ts, sy]);
    if (Number.isFinite(sz)) {
      series.imu.spinZ.push([ts, sz]);
      series.gyroZ?.push([ts, sz]); // compat opcional
    }

    // GPS:
    const lon = Number(p?.car?.gps?.longitude ?? NaN);
    const lat = Number(p?.car?.gps?.latitude ?? NaN);
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      // para ECharts scatter (x=lon, y=lat)
      series.gpsLonLat.push([lon, lat]);
      // para <GpsMap points={series.gps2d}> (lat, lon)
      series.gps2d.push([lat, lon]);
    }
  }

  // 3) commit no store (1 setState por flush)
  store.setState({
    items: trimmed,
    series,
    last: trimmed[trimmed.length - 1],
  });
}

// ===== API pública da store =====
export const telemetryLive = {
  useState: store.useStore,
  connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    try {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => store.setState({ connected: true });
      ws.onclose = () => store.setState({ connected: false });
      ws.onerror = () => store.setState({ lastError: "ws error" });
      ws.onmessage = (ev) => {
        const raw = (ev as any).data ?? ev.data;

        // string/objeto
        const sync = typeof raw === "string" ? decodeFrame(raw) : decodeFrame(raw);
        if (sync.length) {
          queue.push(...sync);
          if (queue.length > MAX_QUEUE_FASTFWD) queue.splice(0, queue.length - 200);
          scheduleFlush();
          return;
        }

        // Blob
        if (raw instanceof Blob) {
          raw.text().then((txt) => {
            const arr = decodeFrame(txt);
            if (arr.length) {
              queue.push(...arr);
              if (queue.length > MAX_QUEUE_FASTFWD) queue.splice(0, queue.length - 200);
              scheduleFlush();
            }
          }).catch(() => {});
        }
      };

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          if (queue.length > 0) queue.splice(0, Math.max(0, queue.length - 200));
          scheduleFlush();
        }
      });
    } catch (e) {
      store.setState({ lastError: String(e) });
    }
  },
  disconnect() {
    try { ws?.close(); } catch {}
    ws = null;
    store.setState({ connected: false });
  },
  pause() { store.setState({ paused: true }); },
  resume() { store.setState({ paused: false }); },
  clear() {
    store.setState({ items: [], series: emptySeries(), last: undefined });
  },
};
