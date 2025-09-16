import { apiGet } from "./client";
import type { TelemetryProcessed, TelemetryRaw } from "@/types/telemetry";

export async function fetchLatestProcessed() {
  return apiGet<TelemetryProcessed | null>("/api/v1/telemetry/latest");
}

export async function fetchProcessedList(params: {
  limit?: number;
  offset?: number;
  start_ts?: number;
  end_ts?: number;
  order_by?: "updated_at" | "ts";
} = {}) {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  if (params.start_ts) q.set("start_ts", String(params.start_ts));
  if (params.end_ts) q.set("end_ts", String(params.end_ts));
  if (params.order_by) q.set("order_by", params.order_by);
  const qs = q.toString();
  return apiGet<TelemetryProcessed[]>(`/api/v1/telemetry/list${qs ? "?" + qs : ""}`);
}

export async function fetchRawLatest() {
  return apiGet<TelemetryRaw | null>("/api/v1/telemetry/raw/latest");
}

export async function fetchRawList(params: {
  limit?: number;
  offset?: number;
  start_received_at?: number;
  end_received_at?: number;
} = {}) {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  if (params.start_received_at) q.set("start_received_at", String(params.start_received_at));
  if (params.end_received_at) q.set("end_received_at", String(params.end_received_at));
  const qs = q.toString();
  return apiGet<TelemetryRaw[]>(`/api/v1/telemetry/raw/list${qs ? "?" + qs : ""}`);
}
