import React, { memo } from "react";
import ReactECharts from "echarts-for-react";

/**
 * Scatter de posição: eixo X = latitude, eixo Y = longitude.
 * `pairs` no formato [[lat, lon], ...] em ordem histórica.
 */
function GpsLatLonChart({ pairs }: { pairs: [number, number][] }) {
  const last = pairs.length ? [pairs[pairs.length - 1]] : [];

  const option = {
    animation: false,
    grid: { top: 28, left: 64, right: 16, bottom: 56 },
    legend: { top: 4, data: ["lat x lon", "último"] },
    xAxis: {
      type: "value",
      name: "latitude",
      nameGap: 28,
      axisLabel: { formatter: (v: number) => v.toFixed(6) },
      scale: true,
    },
    yAxis: {
      type: "value",
      name: "longitude",
      nameGap: 28,
      axisLabel: { formatter: (v: number) => v.toFixed(6) },
      scale: true,
    },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, yAxisIndex: 0 },
      { type: "slider", xAxisIndex: 0, height: 18 },
      { type: "slider", yAxisIndex: 0, width: 18, right: 0 },
    ],
    tooltip: {
      trigger: "item",
      formatter: (p: any) =>
        `lat: ${Number(p.value[0]).toFixed(6)}<br/>lon: ${Number(p.value[1]).toFixed(6)}`,
    },
    series: [
      {
        name: "lat x lon",
        type: "scatter",
        symbolSize: 6,
        data: pairs,
        emphasis: { focus: "series" },
      },
      {
        name: "último",
        type: "scatter",
        symbolSize: 10,
        data: last,
        z: 3,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 300 }} />;
}

export default memo(GpsLatLonChart);
