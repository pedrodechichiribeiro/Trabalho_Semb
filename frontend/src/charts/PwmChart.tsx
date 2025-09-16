import React, { memo } from "react";
import ReactECharts from "echarts-for-react";

function PwmChart({ series }: { series: [number, number][] }) {
  const option = {
    animation: false,
    grid: { top: 28, left: 48, right: 16, bottom: 48 },
    legend: { top: 4, data: ["PWM"] },
    xAxis: { type: "time" },
    yAxis: { type: "value", name: "0–255", min: 0, max: 255 },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 18 }],
    series: [{ name: "PWM", type: "line", showSymbol: false, data: series }],
    tooltip: { trigger: "axis", valueFormatter: (v: any) => `${Number(v).toFixed(0)}` },
  };
  return <ReactECharts option={option} style={{ height: 300 }} />;
}
export default memo(PwmChart);
