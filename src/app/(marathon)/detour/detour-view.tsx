'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useMarathon } from '@/lib/marathon/context';
import { haversineKm } from '@/lib/marathon/select';

const DetourInfoSchema = z.object({
  subway: z.array(z.string()).default([]),
  bus: z.array(z.string()).default([]),
  note: z.string().optional(),
});

type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported';

export function DetourView() {
  const { selected } = useMarathon();
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const detour = useMemo(() => {
    const parsed = DetourInfoSchema.safeParse(selected?.detour_info ?? {});
    return parsed.success ? parsed.data : { subway: [], bus: [] };
  }, [selected]);

  const distanceKm = useMemo(() => {
    if (!coords || selected?.lat == null || selected?.lng == null) {
      return null;
    }
    return haversineKm(coords, { lat: selected.lat, lng: selected.lng });
  }, [coords, selected]);

  function requestLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('granted');
      },
      () => setStatus('denied'),
      { timeout: 7000, maximumAge: 600000 },
    );
  }

  if (!selected) {
    return <p className="text-muted">상단에서 대상 마라톤을 선택해 주세요.</p>;
  }

  const naverUrl = `https://map.naver.com/p/search/${encodeURIComponent(selected.area)}`;
  const kakaoUrl = `https://map.kakao.com/?q=${encodeURIComponent(selected.area)}`;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">우회 안내</h1>
        <p className="mt-2 text-muted">
          <span className="font-semibold text-fg">{selected.name}</span> ·{' '}
          {selected.area}
        </p>
      </section>

      {/* 위치 기반 점증 안내 */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5"
      >
        {status === 'granted' && distanceKm !== null ? (
          <p className="text-sm">
            현재 위치는 통제 구간(<b className="text-fg">{selected.area}</b>
            )에서 약 <b className="text-accent">
              {distanceKm.toFixed(1)}km
            </b>{' '}
            떨어져 있습니다.{' '}
            {distanceKm > 3
              ? '직접 영향은 크지 않을 수 있으나, 통과 경로라면 아래 안내를 참고하세요.'
              : '통제 구간 인근입니다. 아래 대중교통·우회 안내를 적극 활용하세요.'}
          </p>
        ) : status === 'granted' ? (
          <p className="text-sm text-muted">
            위치를 확인했습니다. 통제 구간 좌표가 없어 거리 계산은 생략합니다.
          </p>
        ) : (
          <div className="text-sm text-muted">
            <p>내 위치를 기준으로 더 구체적인 안내를 받을 수 있습니다(선택).</p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={requestLocation}
              disabled={status === 'loading'}
              className="mt-3 rounded-full border border-line px-4 py-2 font-medium text-fg transition hover:border-accent/50 disabled:opacity-50"
            >
              {status === 'loading' ? '위치 확인 중…' : '내 위치로 안내 정밀화'}
            </motion.button>
            {status === 'denied' ? (
              <p className="mt-2 text-xs text-muted/70">
                위치 권한 없이도 아래 일반 안내를 이용할 수 있습니다.
              </p>
            ) : null}
            {status === 'unsupported' ? (
              <p className="mt-2 text-xs text-muted/70">
                이 브라우저는 위치 기능을 지원하지 않습니다.
              </p>
            ) : null}
          </div>
        )}
      </motion.section>

      {/* 대중교통 안내 */}
      <section>
        <h2 className="text-lg font-bold">대중교통 안내</h2>
        {detour.subway.length === 0 && detour.bus.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            상세 우회 정보가 아직 등록되지 않았습니다. 통제 시간대에는 도심
            도로보다 <b className="text-fg">지하철 이용</b>을 권장합니다.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {detour.subway.length > 0 ? (
              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-accent">지하철</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted">
                  {detour.subway.map((s, i) => (
                    <li key={i}>· {s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {detour.bus.length > 0 ? (
              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-accent">버스</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted">
                  {detour.bus.map((s, i) => (
                    <li key={i}>· {s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
        {detour.note ? (
          <p className="mt-3 text-sm text-muted">{detour.note}</p>
        ) : null}
      </section>

      {/* 외부 지도 */}
      <section>
        <h2 className="text-lg font-bold">지도에서 보기</h2>
        <p className="mt-1 text-sm text-muted">
          실시간 길찾기는 지도 앱이 가장 정확합니다.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <a
            href={naverUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass flex-1 rounded-full px-4 py-3 text-center font-medium transition hover:border-accent/50"
          >
            네이버 지도에서 보기
          </a>
          <a
            href={kakaoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass flex-1 rounded-full px-4 py-3 text-center font-medium transition hover:border-accent/50"
          >
            카카오맵에서 보기
          </a>
        </div>
      </section>
    </div>
  );
}
