'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

/**
 * 우회 구간 지도(Leaflet + OpenStreetMap, 키 불필요).
 * 통제 구간을 원(반경) 또는 폴리곤으로 표시. SSR 회피 위해 동적 import.
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

      if (polygon && polygon.length >= 3) {
        L.polygon(polygon, {
          color: '#f43f5e',
          weight: 2,
          fillOpacity: 0.12,
        }).addTo(map);
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
      className="h-64 w-full overflow-hidden rounded-2xl border border-line"
    />
  );
}
