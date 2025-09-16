import React, { memo } from "react";
import ReactECharts from "echarts-for-react";

/**
 * Série do ângulo do volante ao longo do tempo, em graus (-180..180)
 */
function SteeringAngleChart({ series }: { series: [number, number][] }) {
  const name = "Ângulo da direção (°)";
  const option = {
    animation: false,
    grid: { top: 28, left: 48, right: 16, bottom: 48 },
    legend: { top: 4, data: [name] },
    xAxis: { type: "time" },
    yAxis: { type: "value", min: -180, max: 180 },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 18 }],
    series: [{ name, type: "line", showSymbol: false, sampling: "lttb", data: series }],
    tooltip: { trigger: "axis", valueFormatter: (v: any) => `${Number(v).toFixed(1)} °` },
  };
  return <ReactECharts option={option} style={{ height: 300 }} />;
}

export default memo(SteeringAngleChart);
