import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";

type Props = {
  title?: string;
  yName?: string;
  seriesX?: [number, number][];
  seriesY?: [number, number][];
  seriesZ?: [number, number][];
  legendX?: string;
  legendY?: string;
  legendZ?: string;
};

function fmtTimeLabel(v: number) {
  const d = new Date(v);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function ImuTripleChart({
  title,
  yName,
  seriesX = [],
  seriesY = [],
  seriesZ = [],
  legendX = "X",
  legendY = "Y",
  legendZ = "Z",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);

  const baseOption = useMemo<echarts.EChartsCoreOption>(() => ({
    animation: false,
    title: title ? { text: title, top: 0, left: "center" } : undefined,
    grid: { left: 50, right: 12, top: title ? 50 : 24, bottom: 36 },
    legend: { top: 24, left: "center" },
    xAxis: {
      type: "time",
      boundaryGap: false,
      axisLabel: { formatter: (v: any) => fmtTimeLabel(+v), hideOverlap: true, margin: 10 },
    },
    yAxis: { type: "value", name: yName ?? "" },
    tooltip: { trigger: "axis", axisPointer: { type: "line", snap: true } },
    dataZoom: [{ type: "inside", throttle: 50 }, { type: "slider", height: 18 }],
    series: [
      { type: "line", name: legendX, showSymbol: false, data: [] },
      { type: "line", name: legendY, showSymbol: false, data: [] },
      { type: "line", name: legendZ, showSymbol: false, data: [] },
    ],
  }), [title, yName, legendX, legendY, legendZ]);

  useEffect(() => {
    const el = ref.current!;
    const chart = echarts.init(el);
    chartRef.current = chart;
    chart.setOption(baseOption);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    const raf = requestAnimationFrame(() => chart.resize());
    return () => { ro.disconnect(); cancelAnimationFrame(raf); chart.dispose(); chartRef.current = null; };
  }, [baseOption]);

  useEffect(() => {
    const chart = chartRef.current!;
    if (!chart) return;

    const clean = (arr?: [number, number][]) =>
      (arr ?? [])
        .filter((pt): pt is [number, number] =>
          Array.isArray(pt) && pt.length === 2 && Number.isFinite(+pt[0]) && Number.isFinite(+pt[1])
        )
        .sort((a, b) => a[0] - b[0]);

    const dX = clean(seriesX);
    const dY = clean(seriesY);
    const dZ = clean(seriesZ);

    chart.setOption({
      series: [
        { type: "line", name: legendX, showSymbol: false, data: dX, sampling: "lttb", animationThreshold: 200, connectNulls: true },
        { type: "line", name: legendY, showSymbol: false, data: dY, sampling: "lttb", animationThreshold: 200, connectNulls: true },
        { type: "line", name: legendZ, showSymbol: false, data: dZ, sampling: "lttb", animationThreshold: 200, connectNulls: true },
      ],
    }, { replaceMerge: ["series"], lazyUpdate: true });

    const lastTs = Math.max(
      dX.length ? dX[dX.length - 1][0] : 0,
      dY.length ? dY[dY.length - 1][0] : 0,
      dZ.length ? dZ[dZ.length - 1][0] : 0
    );
    if (lastTs > 0) {
      chart.setOption({ xAxis: { min: lastTs - 30_000, max: lastTs } }, { lazyUpdate: true });
    }
  }, [seriesX, seriesY, seriesZ, legendX, legendY, legendZ]);

  return <div ref={ref} style={{ width: "100%", height: 260 }} />;
}
