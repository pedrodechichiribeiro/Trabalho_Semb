export const API_HTTP = import.meta.env.VITE_API_HTTP_URL || "http://localhost:8000";
export const API_WS = import.meta.env.VITE_API_WS_URL || "ws://localhost:8000/ws";

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_HTTP}${path}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: any, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_HTTP}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

let _ws: WebSocket | null = null;
let _reconnectTimer: any = null;
const listeners = new Set<(msg: any) => void>();
const onOpenListeners = new Set<() => void>();
const onCloseListeners = new Set<() => void>();

export function wsConnect(): WebSocket {
  if (_ws) return _ws;
  if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }

  const ws = new WebSocket(API_WS);
  _ws = ws;

  ws.addEventListener("open", () => { onOpenListeners.forEach(fn => fn()); });
  ws.addEventListener("message", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      listeners.forEach((cb) => cb(data));
    } catch { /* ignore non-json */ }
  });
  ws.addEventListener("close", () => {
    onCloseListeners.forEach(fn => fn());
    _ws = null;
    // reconectar com backoff simples
    if (!_reconnectTimer) {
      _reconnectTimer = setTimeout(() => {
        _reconnectTimer = null;
        wsConnect();
      }, 2000);
    }
  });
  return ws;
}

export function wsOnMessage(cb: (msg: any) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function wsOnOpen(cb: () => void): () => void {
  onOpenListeners.add(cb);
  return () => onOpenListeners.delete(cb);
}

export function wsOnClose(cb: () => void): () => void {
  onCloseListeners.add(cb);
  return () => onCloseListeners.delete(cb);
}