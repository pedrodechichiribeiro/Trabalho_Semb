import { createStore } from "./baseStore";

type State = {
  rangeMinutes: number;
  live: boolean;
  themeMode: "light" | "dark";
};
const store = createStore<State>({
  rangeMinutes: 10,
  live: true,
  themeMode: "light",
});

export const uiStore = {
  useState: store.useStore,
  setRange(min: number) { store.setState({ rangeMinutes: Math.max(1, min|0) }); },
  setLive(live: boolean) { store.setState({ live }); },
  toggleTheme() {
    const curr = store.getState().themeMode;
    store.setState({ themeMode: curr === "light" ? "dark" : "light" });
  },
};
