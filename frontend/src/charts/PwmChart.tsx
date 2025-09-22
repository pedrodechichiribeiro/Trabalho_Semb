import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";

type Props = { name?: string; series?: [number, number][] };

function fmtTimeLabel(value: number) {
  const d = new Date(value);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function PwmChart({ name = "PWM", series = [] }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);

  const baseOption = useMemo<echarts.EChartsCoreOption>(() => ({
    animation: false,
    grid: { left: 45, right: 12, top: 22, bottom: 36 },
    xAxis: {
      type: "time",
      boundaryGap: false,
      axisLabel: {
        formatter: (v: any) => fmtTimeLabel(+v),
        hideOverlap: true,
        margin: 10,
      },
    },
    yAxis: { type: "value", name: "PWM (0..255)", min: 0, max: 255 },
    series: [{
      type: "line",
      name,
      showSymbol: false,
      data: [],
      sampling: "lttb",
      animationThreshold: 200,
      smooth: false,
      connectNulls: true,
    }],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line", snap: true },
      valueFormatter: (v: any) => (typeof v === "number" ? v.toFixed(0) : v),
    },
    dataZoom: [
      { type: "inside", throttle: 50 },
      { type: "slider", height: 18 },
    ],
  }), [name]);

  // init
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

  // apply data
  useEffect(() => {
    const chart = chartRef.current!;
    if (!chart) return;

    // valida e ordena os pontos
    const data = (series ?? [])
      .filter((pt): pt is [number, number] =>
        Array.isArray(pt) && pt.length === 2 && Number.isFinite(+pt[0]) && Number.isFinite(+pt[1])
      )
      .sort((a, b) => a[0] - b[0]);

    // reenvia a SÉRIE COMPLETA e preserva grid/eixos
    chart.setOption({
      series: [{
        type: "line",
        name,
        showSymbol: false,
        data,
        sampling: "lttb",
        animationThreshold: 200,
        smooth: false,
        connectNulls: true,
      }],
    }, { replaceMerge: ["series"], lazyUpdate: true });

    // janela “rolante” de 30s
    if (data.length) {
      const lastTs = data[data.length - 1][0];
      chart.setOption({ xAxis: { min: lastTs - 30_000, max: lastTs } }, { lazyUpdate: true });
    }
  }, [series, name]);

  return <div ref={ref} style={{ width: "100%", height: 260 }} />;
}
