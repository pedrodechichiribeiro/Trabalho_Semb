import React, { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import { Box } from "@mui/material";

/**
 * points: array de [longitude, latitude]
 * Renderiza:
 * - Trilho (Polyline)
 * - Ponto atual (CircleMarker)
 * - Tooltip permanente no último ponto com "lat, lon"
 * - Overlay no canto com "lat, lon"
 * - Auto-fit para a extensão dos pontos
 */
function FitBounds({ latlngs }: { latlngs: [number, number][] }) {
  const map = useMap();
  React.useEffect(() => {
    if (!latlngs.length) return;
    if (latlngs.length === 1) {
      map.setView(latlngs[0], Math.max(14, map.getZoom() || 14));
    } else {
      map.fitBounds(new LatLngBounds(latlngs));
    }
  }, [latlngs, map]);
  return null;
}

export default function GpsMap({ points }: { points: [number, number][] }) {
  // Converte [lon, lat] -> [lat, lon] (Leaflet usa [lat, lng])
  const latlngs = useMemo<[number, number][]>(() => {
    return points.map(([lon, lat]) => [lat, lon]);
  }, [points]);

  // Centro default (São Paulo) caso vazio
  const center: [number, number] = latlngs.at(-1) || [-23.56, -46.65];

  // Último ponto formatado (overlay + tooltip)
  const last = latlngs.at(-1);
  const lastLabel =
    last ? `${last[0].toFixed(6)}, ${last[1].toFixed(6)}` : "—";

  return (
    <Box sx={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", borderRadius: 8 }}
      >
        <TileLayer
          // OpenStreetMap padrão (livre)
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />

        {/* trilha */}
        {latlngs.length >= 2 && (
          <Polyline positions={latlngs as any} />
        )}

        {/* último ponto + tooltip permanente com "lat, lon" */}
        {last && (
          <CircleMarker center={last} radius={6}>
            <Tooltip direction="top" permanent offset={[0, -6]}>
              {lastLabel}
            </Tooltip>
          </CircleMarker>
        )}

        <FitBounds latlngs={latlngs} />
      </MapContainer>

      {/* overlay fixo com lat, lon (canto inferior direito) */}
      <Box
        sx={{
          position: "absolute",
          right: 8,
          bottom: 8,
          bgcolor: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 1.5,
          px: 1,
          py: 0.5,
          fontSize: 12,
          boxShadow: 1,
        }}
      >
        <strong>Posição:</strong> {lastLabel}
      </Box>
    </Box>
  );
}
