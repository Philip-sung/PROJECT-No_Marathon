'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

/**
 * 관리자용 경로 편집 지도(Leaflet + OpenStreetMap, 키 불필요).
 * 지도를 클릭하면 그 지점이 통제 경로의 점으로 추가되고, 점들이 순서대로 선으로 이어진다.
 * 점 목록(points)은 부모가 control_zone.polygon 에서 파생해 내려주고, 클릭 시 onAddPoint 로 위임한다.
 * 지도는 최초 1회만 생성하고(클릭마다 뷰 리셋 방지), points 변경 시 선/마커만 다시 그린다.
 */
type Pt = [number, number];

const ROUTE_COLOR = '#f43f5e';
const POINT_COLOR = '#22d3ee';

function drawRoute(
  L: typeof import('leaflet'),
  layer: import('leaflet').LayerGroup,
  points: Pt[],
): void {
  layer.clearLayers();
  if (points.length >= 2) {
    L.polyline(points, { color: ROUTE_COLOR, weight: 4, opacity: 0.85 }).addTo(
      layer,
    );
  }
  points.forEach((p, i) => {
    L.circleMarker(p, {
      radius: 6,
      color: POINT_COLOR,
      fillColor: POINT_COLOR,
      fillOpacity: 1,
      weight: 2,
    })
      .addTo(layer)
      .bindTooltip(String(i + 1), {
        permanent: true,
        direction: 'top',
        offset: [0, -6],
      });
  });
}

export function RouteEditor({
  points,
  defaultCenter,
  onAddPoint,
}: {
  points: Pt[];
  /** points 가 비었을 때 지도 초기 중심([lat,lng]). */
  defaultCenter: Pt;
  onAddPoint: (p: Pt) => void;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const layerRef = useRef<import('leaflet').LayerGroup | null>(null);
  const lRef = useRef<typeof import('leaflet') | null>(null);
  // 클릭 핸들러/초기 중심은 ref 로 최신값을 참조해 지도를 재생성하지 않는다.
  const addRef = useRef(onAddPoint);
  addRef.current = onAddPoint;
  const centerRef = useRef(defaultCenter);
  centerRef.current = defaultCenter;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = await import('leaflet');
      if (cancelled || !elRef.current || mapRef.current) {
        return;
      }
      lRef.current = L;
      const map = L.map(elRef.current, { scrollWheelZoom: true });
      map.setView(points[0] ?? centerRef.current, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
      const layer = L.layerGroup().addTo(map);
      map.on('click', (e) => {
        addRef.current([
          Number(e.latlng.lat.toFixed(6)),
          Number(e.latlng.lng.toFixed(6)),
        ]);
      });
      mapRef.current = map;
      layerRef.current = layer;
      drawRoute(L, layer, points);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
    // 최초 1회만 초기화. points 반영은 아래 effect 가 담당.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = lRef.current;
    const layer = layerRef.current;
    if (!L || !layer) {
      return;
    }
    drawRoute(L, layer, points);
  }, [points]);

  return (
    <div
      ref={elRef}
      className="relative z-0 h-72 w-full cursor-crosshair overflow-hidden rounded-xl border border-line"
    />
  );
}
