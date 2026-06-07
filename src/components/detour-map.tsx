'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

/**
 * 우회 구간 지도(Leaflet + OpenStreetMap, 키 불필요).
 * polygon(좌표 목록)이 있으면 통제 "경로"를 선(polyline)으로, 없으면 반경 원으로 표시.
 * SSR 회피 위해 동적 import. 컨테이너는 stacking context 를 가둬(z 격리) 셀렉터 모달을 덮지 않게 한다.
 */
export function DetourMap({
  lat,
  lng,
  radiusM,
  polygon,
}: {
  lat: number;
  lng: number;
  radiusM: number;
  /** 통제 경로의 순서있는 좌표들([lat,lng]). 2개 이상이면 선으로 그린다. */
  polygon?: [number, number][];
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: import('leaflet').Map | null = null;
    let cancelled = false;
    void (async () => {
      const L = await import('leaflet');
      if (cancelled || !ref.current) {
        return;
      }
      map = L.map(ref.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // 통제 경로(근사): 좌표 2개 이상이면 경로 선(polyline)으로 그리고 전체가 보이게 맞춤.
      if (polygon && polygon.length >= 2) {
        const line = L.polyline(polygon, {
          color: '#f43f5e',
          weight: 4,
          opacity: 0.85,
        }).addTo(map);
        map.fitBounds(line.getBounds(), { padding: [30, 30], maxZoom: 15 });
      } else {
        L.circle([lat, lng], {
          radius: radiusM,
          color: '#f43f5e',
          weight: 2,
          fillOpacity: 0.12,
        }).addTo(map);
      }
      L.circleMarker([lat, lng], {
        radius: 6,
        color: '#22d3ee',
        fillColor: '#22d3ee',
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup('통제 구간 중심');
    })();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
      }
    };
  }, [lat, lng, radiusM, polygon]);

  return (
    <div
      ref={ref}
      // relative z-0: Leaflet 내부 high z-index pane/컨트롤을 이 컨테이너 안에 가둬
      // 마라톤 셀렉터 모달(z-40) 위로 튀어나오지 않게 한다.
      className="relative z-0 h-64 w-full overflow-hidden rounded-2xl border border-line"
    />
  );
}
