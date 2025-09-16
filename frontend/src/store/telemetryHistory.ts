import { createStore } from "./baseStore";
import type { TelemetryProcessed } from "@/types/telemetry";
import { fetchProcessedList } from "@/api/telemetry";

type State = {
  items: TelemetryProcessed[];
  loading: boolean;
  lastParams?: Record<string, any>;
};
const store = createStore<State>({
  items: [],
  loading: false,
  lastParams: undefined,
});

export const telemetryHistory = {
  useState: store.useStore,
  async fetch(params: {
    limit?: number;
    offset?: number;
    start_ts?: number;
    end_ts?: number;
    order_by?: "updated_at" | "ts";
  }) {
    store.setState({ loading: true, lastParams: params });
    try {
      const data = await fetchProcessedList(params);
      store.setState({ items: data, loading: false });
    } catch (e) {
      console.error(e);
      store.setState({ loading: false });
    }
  },
  clear() { store.setState({ items: [] }); },
};
