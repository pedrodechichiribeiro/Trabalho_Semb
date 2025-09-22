import { useMemo } from "react";

type Props = {
  /** valor atual (m/s) */
  value: number;
  /** máximo da barra (m/s). default 15 */
  max?: number;
  /** rótulo mostrado acima */
  label?: string;
};

export default function SpeedBar({ value, max = 15, label = "Velocidade (m/s)" }: Props) {
  const pct = useMemo(() => {
    const v = Math.max(0, Math.min(value, max));
    return (v / max) * 100;
  }, [value, max]);

  return (
    <div style={{ width: "100%", padding: "8px 10px" }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div
        style={{
          width: "100%",
          height: 22,
          borderRadius: 6,
          background: "#e0e0e0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "#1976d2",
            transition: "width 120ms linear",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#0d1117",
            mixBlendMode: "difference",
          }}
        >
          {value.toFixed(3)} / {max.toFixed(0)} m/s
        </div>
      </div>
    </div>
  );
}
