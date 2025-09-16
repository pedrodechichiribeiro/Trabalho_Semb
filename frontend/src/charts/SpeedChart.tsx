import React, { memo } from "react";
import ReactECharts from "echarts-for-react";

function SpeedChart({
  title = "Velocidade (m/s)",
  name = "Velocidade",
  series,
}: {
  title?: string;
  name?: string;
  series: [number, number][];
}) {
  const option = {
    animation: false,
    grid: { top: 28, left: 48, right: 16, bottom: 48 },
    legend: { top: 4, data: [name] },
    xAxis: { type: "time" },
    yAxis: { type: "value", name: "m/s", min: "dataMin", max: "dataMax" as const },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 18 }],
    series: [
      { name, type: "line", showSymbol: false, sampling: "lttb", data: series },
    ],
    tooltip: { trigger: "axis", valueFormatter: (v: any) => `${Number(v).toFixed(2)} m/s` },
  };
  return <ReactECharts option={option} style={{ height: 300 }} />;
}
export default memo(SpeedChart);
