import { Box } from "@mui/material";

type Props = {
  value: number;     // valor atual (m/s)
  max?: number;      // máximo da barra (default 15)
  label?: string;    // rótulo
  height?: number;   // altura px (default 260)
  width?: number;    // largura px (default 60)
};

export default function SpeedBarVertical({
  value,
  max = 15,
  label = "Velocidade (m/s)",
  height = 260,
  width = 60,
}: Props) {
  const v = Math.max(0, Math.min(value, max));
  const pct = (v / max) * 100;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <Box sx={{ fontSize: 14, fontWeight: 700 }}>{label}</Box>
      <Box
        sx={{
          position: "relative",
          height,
          width,
          borderRadius: 1,
          bgcolor: "#e0e0e0",
          overflow: "hidden",
        }}
      >
        {/* preenchimento do fundo a partir da base */}
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: `${pct}%`,
            bgcolor: "#1976d2",
            transition: "height 120ms linear",
          }}
        />
        {/* marcação 0 / max */}
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 4,
            textAlign: "center",
            fontSize: 11,
            color: "#666",
          }}
        >
          {max.toFixed(0)}
        </Box>
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 4,
            textAlign: "center",
            fontSize: 11,
            color: "#666",
          }}
        >
          0
        </Box>
      </Box>
      <Box sx={{ fontSize: 12, fontWeight: 700 }}>{v.toFixed(3)} m/s</Box>
    </Box>
  );
}
