import { createStore } from "./baseStore";
import type { TelemetryProcessed } from "../types/telemetry";
import { wsConnect, wsOnMessage, wsOnOpen, wsOnClose } from "../api/client";

type State = {
  items: TelemetryProcessed[];
  connected: boolean;
  paused: boolean;
  lastError?: string;
  maxPoints: number;
};
const store = createStore<State>({
  items: [],
  connected: false,
  paused: false,
  lastError: undefined,
  maxPoints: 3000,
});

let _started = false;
let _unsubMsg: (() => void) | null = null;
let _unsubOpen: (() => void) | null = null;
let _unsubClose: (() => void) | null = null;

function appendItem(item: TelemetryProcessed) {
  const { items, maxPoints, paused } = store.getState();
  if (paused) return;
  const next = items.concat(item);
  const trimmed = next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
  store.setState({ items: trimmed });
}

export const telemetryLive = {
  useState: store.useStore,
  clear() { store.setState({ items: [] }); },
  pause() { store.setState({ paused: true }); },
  resume() { store.setState({ paused: false }); },
  setMaxPoints(n: number) { store.setState({ maxPoints: Math.max(100, n|0) }); },
  connect() {
    if (_started) return;
    _started = true;

    const ws = wsConnect();
    // atualiza conectado a partir dos eventos reais
    _unsubOpen = wsOnOpen(() => store.setState({ connected: true }));
    _unsubClose = wsOnClose(() => store.setState({ connected: false }));
    _unsubMsg = wsOnMessage((msg) => appendItem(msg as TelemetryProcessed));
  },
  disconnect() {
    if (!_started) return;
    _started = false;
    if (_unsubMsg) { _unsubMsg(); _unsubMsg = null; }
    if (_unsubOpen) { _unsubOpen(); _unsubOpen = null; }
    if (_unsubClose) { _unsubClose(); _unsubClose = null; }
    store.setState({ connected: false });
  },
};