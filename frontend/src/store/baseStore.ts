import { useSyncExternalStore } from "react";

type Listener = () => void;

export function createStore<S extends object>(initial: S) {
  let state = initial;
  const listeners = new Set<Listener>();

  function getState(): S {
    return state;
  }

  function setState(partial: Partial<S> | ((s: S) => Partial<S>)) {
    const next = typeof partial === "function" ? (partial as any)(state) : partial;
    const nextState = { ...state, ...next } as S;
    // Evita emitir update sem mudança real rasa
    let changed = false;
    for (const k of Object.keys(nextState) as (keyof S)[]) {
      if (state[k] !== nextState[k]) { changed = true; break; }
    }
    if (!changed) return;
    state = nextState;
    listeners.forEach((l) => l());
  }

  function subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  }

  /**
   * IMPORTANTE: cache de snapshot para evitar
   * "The result of getSnapshot should be cached..."
   */
  function useStore<T>(selector: (s: S) => T): T {
    let lastStateRef: S | null = null;
    let lastVal: T;
    const getSnapshot = () => {
      if (state === lastStateRef) return lastVal;
      lastStateRef = state;
      lastVal = selector(state);
      return lastVal;
    };
    return useSyncExternalStore(subscribe, getSnapshot);
  }

  return { getState, setState, subscribe, useStore };
}
