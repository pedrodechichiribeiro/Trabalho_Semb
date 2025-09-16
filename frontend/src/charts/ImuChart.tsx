import React, { memo } from "react";
import ReactECharts from "echarts-for-react";

type SeriesMap = Record<string, [number, number][]>;

function ImuChart({ series }: { series: SeriesMap }) {
  const names = Object.keys(series);
  const option = {
    animation: false,
    grid: { top: 28, left: 48, right: 16, bottom: 48 },
    legend: { top: 4, data: names },
    xAxis: { type: "time" },
    yAxis: { type: "value", min: -128, max: 127, interval: 64 },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 18 }],
    series: names.map((n) => ({
      name: n, type: "line", showSymbol: false, sampling: "lttb", data: series[n],
    })),
    tooltip: { trigger: "axis" },
  };
  return <ReactECharts option={option} style={{ height: 300 }} />;
}
export default memo(ImuChart);
