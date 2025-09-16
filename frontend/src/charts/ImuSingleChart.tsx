import React, { memo } from "react";
import ReactECharts from "echarts-for-react";

/**
 * Gráfico genérico para uma única variável do IMU (faixa -128..127).
 * `series` no formato [[ts, valor], ...]
 */
function ImuSingleChart({ name, series }: { name: string; series: [number, number][] }) {
  const option = {
    animation: false,
    grid: { top: 28, left: 48, right: 16, bottom: 48 },
    legend: { top: 4, data: [name] },
    xAxis: { type: "time" },
    yAxis: { type: "value", min: -128, max: 127, interval: 64 },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 18 }],
    series: [{ name, type: "line", showSymbol: false, sampling: "lttb", data: series }],
    tooltip: { trigger: "axis" },
  };
  return <ReactECharts option={option} style={{ height: 300 }} />;
}

export default memo(ImuSingleChart);
