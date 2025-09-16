import React, { memo } from "react";
import ReactECharts from "echarts-for-react";

function DirectionChart({ series }: { series: [number, number][] }) {
  const name = "Direção (1=front,0=back)";
  const option = {
    animation: false,
    grid: { top: 28, left: 48, right: 16, bottom: 48 },
    legend: { top: 4, data: [name] },
    xAxis: { type: "time" },
    yAxis: { type: "value", min: 0, max: 1, interval: 1 },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 18 }],
    series: [{ name, type: "line", step: "end", data: series }],
    tooltip: { trigger: "axis" },
  };
  return <ReactECharts option={option} style={{ height: 300 }} />;
}
export default memo(DirectionChart);
