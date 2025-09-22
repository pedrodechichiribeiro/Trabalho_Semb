import { useEffect } from "react";
import { telemetryLive } from "../store/telemetryLive";

export function useRealtimeSeries() {
  const { series, connected } = telemetryLive.useState(s => ({
    series: s.series,
    connected: s.connected,
  }));

  useEffect(() => {
    telemetryLive.connect();
    return () => telemetryLive.disconnect();
  }, []);

  return { series, connected };
}
