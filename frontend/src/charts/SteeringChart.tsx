import React from "react";
import { Grid, Box, Typography } from "@mui/material";

/** Normaliza para [-180, 180) */
function normalize180(a: number) {
  let x = ((a + 180) % 360 + 360) % 360;
  return x - 180;
}

/** Volante D-shape (fundo reto) com 2 raios laterais + 1 inferior */
function DShapeWheel({ angleDeg, size = 340 }: { angleDeg: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  // altura do “corte” reto da base (0.6r acima do centro)
  const flatY = cy + r * 0.6;
  const t = Math.asin((flatY - cy) / r); // rad
  const cosT = Math.cos(t);
  const xL = cx - r * cosT;
  const xR = cx + r * cosT;

  const rimWidth = size * 0.08;
  const spokeWidth = size * 0.035;

  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {/* grupo rotacionado (gira o volante) */}
      <g transform={`rotate(${angleDeg} ${cx} ${cy})`}>
        {/* aro D-shape (stroke grosso) */}
        <path
          d={`M ${xL} ${flatY}
              A ${r} ${r} 0 1 1 ${xR} ${flatY}
              L ${xL} ${flatY}`}
          fill="none"
          stroke="rgba(0,0,0,0.85)"
          strokeWidth={rimWidth}
          strokeLinejoin="round"
        />
        {/* Borda do aro para leve highlight */}
        <path
          d={`M ${xL} ${flatY}
              A ${r} ${r} 0 1 1 ${xR} ${flatY}
              L ${xL} ${flatY}`}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={rimWidth * 0.3}
          strokeLinejoin="round"
        />

        {/* raios laterais */}
        <line
          x1={cx} y1={cy}
          x2={cx - r * 0.78} y2={cy}
          stroke="rgba(0,0,0,0.85)"
          strokeWidth={spokeWidth}
          strokeLinecap="round"
        />
        <line
          x1={cx} y1={cy}
          x2={cx + r * 0.78} y2={cy}
          stroke="rgba(0,0,0,0.85)"
          strokeWidth={spokeWidth}
          strokeLinecap="round"
        />
        {/* raio inferior (para base reta) */}
        <line
          x1={cx} y1={cy}
          x2={cx} y2={cy + r * 0.9}
          stroke="rgba(0,0,0,0.85)"
          strokeWidth={spokeWidth}
          strokeLinecap="round"
        />

        {/* cubo central */}
        <circle cx={cx} cy={cy} r={size * 0.07} fill="rgba(0,0,0,0.9)" />
        <circle cx={cx} cy={cy} r={size * 0.07} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
      </g>
    </svg>
  );
}

/** Bússola (0° no topo), com ticks e ponteiro do ângulo do volante */
function Compass({ angleDeg, size = 340 }: { angleDeg: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  const angle = normalize180(angleDeg); // exibe –180..+180
  const majorEvery = 30; // ticks maiores a cada 30°
  const minorEvery = 10; // menores a cada 10°

  const ticks: JSX.Element[] = [];
  for (let a = -180; a < 180; a += minorEvery) {
    const rad = (Math.PI / 180) * (a - 90); // 0° no topo
    const isMajor = a % majorEvery === 0;
    const len = isMajor ? 14 : 7;
    const x1 = cx + Math.cos(rad) * (r - len);
    const y1 = cy + Math.sin(rad) * (r - len);
    const x2 = cx + Math.cos(rad) * (r + 2);
    const y2 = cy + Math.sin(rad) * (r + 2);
    ticks.push(
      <line
        key={a}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(0,0,0,0.65)"
        strokeWidth={isMajor ? 2 : 1}
        strokeLinecap="round"
      />
    );
  }

  // labels principais (0, ±90, ±180)
  const labels = [
    { txt: "0°", a: 0 },
    { txt: "+90°", a: 90 },
    { txt: "±180°", a: 180 },
    { txt: "-90°", a: -90 },
  ].map(({ txt, a }) => {
    const rad = (Math.PI / 180) * (a - 90);
    const x = cx + Math.cos(rad) * (r - 28);
    const y = cy + Math.sin(rad) * (r - 28);
    return (
      <text key={a} x={x} y={y} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 12, fill: "rgba(0,0,0,0.7)" }}>
        {txt}
      </text>
    );
  });

  // ponteiro
  const pointerLen = r * 0.95;
  const pointerRad = (Math.PI / 180) * (angle - 90);
  const px = cx + Math.cos(pointerRad) * pointerLen;
  const py = cy + Math.sin(pointerRad) * pointerLen;

  // label numérico: garante dentro do SVG (nada cortado)
  const labelY = size - 8;

  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {/* bordas */}
      <circle cx={cx} cy={cy} r={r + 4} fill="#fff" stroke="rgba(0,0,0,0.1)" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={r} fill="#f7f7f7" stroke="rgba(0,0,0,0.2)" strokeWidth={2} />
      {/* ticks e labels */}
      {ticks}
      {labels}
      {/* ponteiro */}
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="#1976d2" strokeWidth={4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill="#1976d2" />
      {/* leitura numérica (sem corte) */}
      <text x={cx} y={labelY} textAnchor="middle" style={{ fontSize: 14, fill: "rgba(0,0,0,0.75)" }}>
        Ângulo: {angle.toFixed(1)}°
      </text>
    </svg>
  );
}

export default function SteeringChart({ angleDeg }: { angleDeg: number }) {
  const angleText = normalize180(angleDeg).toFixed(1) + "°";

  return (
    <Grid
      container
      spacing={6}                      // MAIS ESPAÇO ENTRE OS DOIS
      alignItems="center"
      justifyContent="center"          // CENTRALIZA NO CARD
    >
      <Grid item xs={12} md={5} sx={{ display: "flex", justifyContent: "center" }}>
        <Box sx={{ textAlign: "center" }}>
          <DShapeWheel angleDeg={angleDeg} />
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>{angleText}</Typography>
        </Box>
      </Grid>
      <Grid item xs={12} md={5} sx={{ display: "flex", justifyContent: "center" }}>
        <Compass angleDeg={angleDeg} />
      </Grid>
    </Grid>
  );
}
