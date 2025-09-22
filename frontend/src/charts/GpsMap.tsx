import { useEffect, useRef } from "react";
import L, { Map as LeafletMap, Marker, Polyline } from "leaflet";

type Props = {
  /** [lat, lon] */
  points: [number, number][];
  /** máximo de pontos no traço (default 300) */
  maxPathPoints?: number;
};

function throttle<T extends (...args: any[]) => void>(fn: T, wait: number) {
  let last = 0;
  let timer: number | undefined;
  let savedArgs: any[] | null = null;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    savedArgs = args;
    if (remaining <= 0) {
      last = now;
      fn(...(savedArgs as any[]));
      savedArgs = null;
    } else if (!timer) {
      timer = window.setTimeout(() => {
        last = Date.now();
        fn(...(savedArgs as any[]));
        savedArgs = null;
        timer = undefined;
      }, remaining);
    }
  };
}

export default function GpsMap({ points, maxPathPoints = 300 }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const pathRef = useRef<Polyline | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = divRef.current!;
    // cria mapa uma vez — com Canvas renderer (mais leve para RT)
    const map = L.map(el, {
      preferCanvas: true,
      zoomControl: true,
      attributionControl: true,
      center: [-23.5585, -46.6493],
      zoom: 17,
      renderer: L.canvas(),
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OSM",
    }).addTo(map);

    // polyline inicial
    pathRef.current = L.polyline([], { color: "#1976d2", weight: 3 }).addTo(map);
    // marker inicial
    markerRef.current = L.circleMarker([0, 0], {
      radius: 5,
      color: "#1976d2",
      weight: 2,
      fillOpacity: 0.6,
    }).addTo(map);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      pathRef.current = null;
    };
  }, []);

  // aplica atualizações com throttle para não renderizar a cada amostra
  useEffect(() => {
    if (!mapRef.current || !pathRef.current || !markerRef.current) return;
    const map = mapRef.current;
    const path = pathRef.current;
    const marker = markerRef.current;

    const apply = throttle((pts: [number, number][]) => {
      if (!pts || pts.length === 0) return;
      const slice = pts.length > maxPathPoints ? pts.slice(-maxPathPoints) : pts;

      // atualiza polyline e marker
      path.setLatLngs(slice as any);
      const last = slice[slice.length - 1];
      marker.setLatLng(last as any);

      // mantém o último ponto no viewport se ele sair muito
      // (não “voa” o mapa toda hora, só ajusta quando realmente sai)
      const bounds = path.getBounds();
      if (!map.getBounds().contains(last as any)) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }, 200); // ~5 Hz

    apply(points);

    // também roda quando a lista muda bastante
    // (o throttle já limita a taxa real de desenho)
  }, [points, maxPathPoints]);

  return <div ref={divRef} style={{ width: "100%", height: 360, borderRadius: 6 }} />;
}
