import { EventBus } from "./eventBus";
import { API_WS } from "../api/client";
import type { TelemetryProcessed } from "../types/telemetry";

const FLUSH_MS = 50;               // 20 Hz (use 16 ms para ~60 Hz se quiser)
const WINDOW_MS = 30_000;          // janela de 30 s no eixo X
const MAX_POINTS = 2000;           // limite de pontos do buffer global
const MAX_QUEUE_FASTFWD = 5000;    // se fila > isso, pulamos pro presente

export type RTTopic = "rt:batch" | "rt:status" | "rt:latest";

export const rtBus = new EventBus<RTTopic>();

// Buffer central (compartilhado por todos os gráficos)
const items: TelemetryProcessed[] = [];
// Fila de entradas (antes do flush)
const queue: TelemetryProcessed[] = [];

let _ws: WebSocket | null = null;
let _flushTimer: number | null = null;
let _connected = false;

function scheduleFlush() {
  if (_flushTimer != null) return;
  _flushTimer = window.setTimeout(() => {
    _flushTimer = null;
    flushNow();
  }, FLUSH_MS);
}

function flushNow() {
  if (queue.length === 0) return;

  // Consome e ordena por ts ascendente (evita “vai-e-volta” no eixo)
  const batch = queue.splice(0, queue.length).sort((a, b) => a.ts - b.ts);

  items.push(...batch);

  // Janela por tempo, ancorada no último ts
  const lastTs = items[items.length - 1]?.ts ?? Date.now();
  const cutoff = lastTs - WINDOW_MS;
  let firstIdx = 0;
  while (firstIdx < items.length && items[firstIdx].ts < cutoff) firstIdx++;
  if (firstIdx > 0) items.splice(0, firstIdx);

  // Fallback por quantidade
  if (items.length > MAX_POINTS) {
    items.splice(0, items.length - MAX_POINTS);
  }

  rtBus.emit("rt:batch", batch);
  rtBus.emit("rt:latest", items[items.length - 1]);
}

// Normaliza payloads do WS: objeto | string JSON | array | {items:[...]}
// OBS: agora também trata Blob (com .text()).
function decodeFrameSyncOrNull(data: any): TelemetryProcessed[] | null {
  try {
    let msg: any = data;

    // string JSON
    if (typeof data === "string") {
      msg = JSON.parse(data);
    }

    // keep-alive
    if (msg && typeof msg === "object" && (msg.type === "ping" || msg.op === "ping")) {
      return [];
    }

    // { items: [...] }
    if (msg && typeof msg === "object" && Array.isArray(msg.items)) {
      msg = msg.items;
    }

    // array de amostras
    if (Array.isArray(msg)) {
      return msg.filter(validSample);
    }

    // amostra única
    if (validSample(msg)) return [msg];

    return [];
  } catch {
    return null; // deixa o async (Blob) tentar
  }
}

function validSample(x: any): x is TelemetryProcessed {
  return x && typeof x === "object" && typeof x.ts === "number";
}

export function rtConnect(wsUrl = API_WS) {
  if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) {
    return _ws;
  }

  try {
    const ws = new WebSocket(wsUrl);
    _ws = ws;

    ws.onopen = () => {
      _connected = true;
      rtBus.emit("rt:status", { connected: true });
      // eslint-disable-next-line no-console
      console.info("[rt] WebSocket conectado:", wsUrl);
    };

    ws.onmessage = (ev) => {
      const raw = (ev as any).data ?? ev.data;

      // 1) Tenta via caminho síncrono (string/objeto)
      const sync = decodeFrameSyncOrNull(raw);
      if (sync) {
        if (sync.length) {
          queue.push(...sync);
          if (queue.length > MAX_QUEUE_FASTFWD) queue.splice(0, queue.length - 200);
          scheduleFlush();
        }
        return;
      }

      // 2) Se veio Blob, faz parse assíncrono
      if (raw instanceof Blob) {
        raw
          .text()
          .then((txt) => {
            try {
              const arr = decodeFrameSyncOrNull(txt) ?? [];
              if (arr.length) {
                queue.push(...arr);
                if (queue.length > MAX_QUEUE_FASTFWD) queue.splice(0, queue.length - 200);
                scheduleFlush();
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn("[rt] Frame Blob inválido:", e);
            }
          })
          .catch((e) => {
            // eslint-disable-next-line no-console
            console.warn("[rt] Falha ao ler Blob do WS:", e);
          });
        return;
      }

      // 3) Caso não reconhecido
      // eslint-disable-next-line no-console
      console.warn("[rt] Frame WS não reconhecido:", typeof raw, raw);
    };

    ws.onclose = (ev) => {
      _connected = false;
      rtBus.emit("rt:status", { connected: false });
      // eslint-disable-next-line no-console
      console.warn("[rt] WebSocket fechado:", ev.code, ev.reason);
      // backoff simples
      setTimeout(() => rtConnect(wsUrl), 2000);
    };

    ws.onerror = (err) => {
      // eslint-disable-next-line no-console
      console.error("[rt] WebSocket erro:", err);
    };

    return ws;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[rt] Falha ao abrir WS:", e);
    return null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (queue.length > 0) queue.splice(0, Math.max(0, queue.length - 200));
    scheduleFlush();
  }
});

// Helpers públicos para quem ainda precisa consultar estado
export function rtIsConnected() { return _connected; }
export function rtGetLatest(): TelemetryProcessed | undefined { return items[items.length - 1]; }
export function rtGetWindow(): { items: readonly TelemetryProcessed[], lastTs: number } {
  const lastTs = items.length ? items[items.length - 1].ts : Date.now();
  return { items, lastTs };
}
export function rtWindowMs() { return WINDOW_MS; }

// ----------------------
// 🔌 Autoconectar (side-effect):
// Ao importar qualquer chart que importa este módulo,
// garantimos que o WS seja conectado, sem precisar alterar Home/ChartsPage.
// ----------------------
rtConnect();
