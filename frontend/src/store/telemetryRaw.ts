import { createStore } from "./baseStore";
import type { TelemetryRaw } from "@/types/telemetry";
import { fetchRawList, fetchRawLatest } from "@/api/telemetry";

type State = {
  items: TelemetryRaw[];
  latest?: TelemetryRaw | null;
  loading: boolean;
};
const store = createStore<State>({
  items: [],
  latest: undefined,
  loading: false,
});

export const telemetryRawStore = {
  useState: store.useStore,
  async fetchList(limit = 100) {
    store.setState({ loading: true });
    try {
      const data = await fetchRawList({ limit });
      store.setState({ items: data, loading: false });
    } catch (e) {
      console.error(e);
      store.setState({ loading: false });
    }
  },
  async fetchLatest() {
    try {
      const data = await fetchRawLatest();
      store.setState({ latest: data });
    } catch (e) {
      console.error(e);
    }
  },
  clear() { store.setState({ items: [], latest: undefined }); },
};
